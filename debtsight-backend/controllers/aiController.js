import {
  buildAnalyzeDebtPrompt,
  buildExplainCodePrompt,
  buildModernizeCodePrompt,
  buildRewriteCodebasePrompt,
  buildRewriteHardeningPrompt,
  buildPurposeClassificationPrompt,
  buildSimpleTranslatePrompt,
} from "../ai.js";
import { detectLanguage } from "../services/languageDetector.js";
import {
  normalizePurposeKey,
  suggestBestLanguage,
  resolveTargetLanguage,
} from "../services/languageAdvisor.js";
import { sanitizeTranslatedCode, stripCodeFences } from "../services/codeTranslator.js";
import { generateResponse, generatePlainTextResponse } from "../services/geminiService.js";
import { cleanAndParseJson } from "../utils/cleanJson.js";
import { analyzeCodeStatic } from "../utils/staticAnalyzer.js";
import { analyzeDependencies } from "../utils/dependencyAnalyzer.js";
import { analyzeTests } from "../utils/testAnalyzer.js";
import { computeBusinessImpact } from "../utils/businessImpact.js";
import { prioritizeIssues } from "../utils/prioritizer.js";
import { analyzeSecurity } from "../utils/securityAnalyzer.js";
import { getThreatIntel } from "../utils/threatIntel.js";
import { suggestDependencies } from "../utils/dependencyAdvisor.js";
import { securityBacktest } from "../utils/securityBacktest.js";
import {
  buildCategorySummary,
  buildPrioritizedActionPlan,
} from "../utils/remediationPlanner.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Models often emit invalid Mermaid like "flowchart TD graph TD ..." (two diagram headers).
 * Mermaid only allows one; the duplicate breaks rendering.
 */
function stripDuplicateMermaidHeaders(s) {
  let t = String(s || "").trim();
  const dup =
    /^((?:flowchart|graph)\s+(?:TD|LR|RL|BT))\s+(?:(?:flowchart|graph)\s+(?:TD|LR|RL|BT))\s*/i;
  let guard = 0;
  while (dup.test(t) && guard++ < 8) {
    t = t.replace(dup, "$1\n");
  }
  return t;
}

function normalizeMermaid(diagram) {
  let s = stripDuplicateMermaidHeaders(String(diagram || "").trim());
  if (!s) return "";
  if (/^flowchart\s+(TD|LR|RL|BT)\b/i.test(s)) return s;
  if (/^graph\s+(TD|LR|RL|BT)\b/i.test(s)) return s;
  if (/^(TD|LR|RL|BT)\s*;/i.test(s)) return `flowchart ${s}`;
  return `flowchart TD\n${s}`;
}

function computeSpaghettiScore({
  complexity_score,
  duplication_percentage,
  dependency_risk,
  test_coverage,
} = {}) {
  const c = Number(complexity_score ?? 0);
  const d = Number(duplication_percentage ?? 0);
  const coverage = Number(test_coverage?.coverage_estimate ?? 0);

  const depPenalty =
    dependency_risk === "high" ? 15 : dependency_risk === "medium" ? 8 : 0;
  const testPenalty = coverage === 0 ? 12 : coverage < 40 ? 8 : coverage < 60 ? 4 : 0;

  // Weighted, explainable score (0-100): complexity dominates, then duplication, then deps/tests.
  const raw = c * 0.7 + d * 0.3 + depPenalty + testPenalty;
  return Math.round(clamp(raw, 0, 100));
}

function generateSecurityFixes(securityAnalysis = {}) {
  const fixes = [];
  const secrets = securityAnalysis?.secrets_detected || [];
  const risks = securityAnalysis?.security_risks || [];

  if (Array.isArray(secrets) && secrets.length > 0) {
    fixes.push({
      title: "Remove hardcoded secrets",
      severity: "high",
      steps: [
        "Move secrets into environment variables (.env / secret manager).",
        "Rotate exposed keys/tokens immediately.",
        "Add .env to .gitignore and use a .env.example template.",
      ],
    });
  }

  if (risks.some((r) => r.type === "unsafe_eval" || r.type === "unsafe_dynamic_code")) {
    fixes.push({
      title: "Eliminate dynamic code execution",
      severity: "high",
      steps: [
        "Remove eval()/new Function().",
        "Replace with safe parsing/dispatch tables or vetted interpreters.",
      ],
    });
  }

  if (risks.some((r) => r.type === "sql_injection_risk")) {
    fixes.push({
      title: "Use parameterized SQL",
      severity: "high",
      steps: [
        "Replace string-concatenated SQL with prepared statements.",
        "Validate/escape identifiers when needed; never interpolate user input into SQL strings.",
      ],
    });
  }

  if (risks.some((r) => r.type === "insecure_http")) {
    fixes.push({
      title: "Upgrade HTTP to HTTPS",
      severity: "medium",
      steps: ["Replace http:// with https:// where possible.", "Enforce TLS in production."],
    });
  }

  if (risks.some((r) => r.type === "tls_verification_disabled")) {
    fixes.push({
      title: "Re-enable TLS verification",
      severity: "high",
      steps: [
        "Remove NODE_TLS_REJECT_UNAUTHORIZED=0 and rejectUnauthorized:false.",
        "Use proper cert chains and environment-specific config.",
      ],
    });
  }

  return fixes;
}

function requireCode(req) {
  const code = req?.body?.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    const err = new Error('Missing required field "code" (string).');
    err.status = 400;
    throw err;
  }
  return code;
}

export async function analyzeDebt(req, res, next) {
  try {
    const code = requireCode(req);

    const staticResult = analyzeCodeStatic(code);
    const dependencyResult = analyzeDependencies(req?.body?.package_json);
    const testCoverage = analyzeTests({
      code,
      project_files: req?.body?.project_files,
    });
    const securityAnalysis = analyzeSecurity(code, {
      vulnerable_dependencies: dependencyResult?.vulnerable_dependencies || [],
    });
    const security = securityBacktest(code, req?.body?.package_json);
    const threatIntel = getThreatIntel({
      dependencies: dependencyResult?.dependencies_list,
      security_risks: securityAnalysis?.security_risks,
    });
    const dependencySuggestions = suggestDependencies(req?.body?.package_json);
    const securityFixes = generateSecurityFixes(securityAnalysis);

    const promptContext = {
      ...staticResult,
      dependency_analysis: dependencyResult,
      test_coverage: testCoverage,
      security_analysis: securityAnalysis,
      threat_intelligence: threatIntel,
    };

    let ai = {
      issues: [],
      explanation: "",
      architecture_diagram: "",
      function_flow_diagram: "",
      logic_flow_diagram: "",
      function_map: [],
      flowchart: "",
      refactor_plan: [],
    };
    try {
      const prompt = buildAnalyzeDebtPrompt(code, promptContext);
      const text = await generateResponse(prompt);
      ai = cleanAndParseJson(text, { endpoint: "analyze-debt" });
    } catch (e) {
      // Keep the endpoint useful even if AI is rate-limited/unavailable.
      ai = {
        issues: [],
        explanation:
          "AI analysis unavailable (rate limit/quota). Showing rule-based analysis only.",
        architecture_diagram: "",
        function_flow_diagram: "",
        logic_flow_diagram: "",
        function_map: [],
        flowchart: "",
        refactor_plan: [],
      };
    }

    const issues = [
      ...(Array.isArray(ai?.issues) ? ai.issues : []),
      ...(Array.isArray(staticResult?.smells)
        ? staticResult.smells.map((s) => ({
            title: String(s.type || "code_smell"),
            severity: String(s.severity || "low"),
            details: String(s.details || ""),
            location: String(s.location || ""),
          }))
        : []),
    ];

    const spaghetti_score = computeSpaghettiScore({
      complexity_score: staticResult.complexity_score,
      duplication_percentage: staticResult.duplication_percentage,
      dependency_risk: dependencyResult?.dependency_risk,
      test_coverage: testCoverage,
    });

    const businessImpact = computeBusinessImpact({
      complexity_score: staticResult?.complexity_score,
      issues,
      duplication_percentage: staticResult?.duplication_percentage,
    });

    const prioritized = prioritizeIssues(issues);
    const category_summary = buildCategorySummary({
      issues,
      dependency_analysis: dependencyResult,
      test_coverage: testCoverage,
    });
    const prioritized_action_plan = buildPrioritizedActionPlan({
      prioritized_roadmap: prioritized,
      hourly_rate: Number(process.env.HOURLY_RATE || 50),
    });

    const unified = {
      spaghetti_score,
      security_score: securityAnalysis.security_score,
      risk_level: securityAnalysis.risk_level,
      complexity_metrics: staticResult.complexity_metrics,
      complexity_score: staticResult.complexity_score,
      duplication_percentage: staticResult.duplication_percentage,
      dependency_risk: dependencyResult.dependency_risk,
      test_coverage: testCoverage,
      issues,
      security_issues: security?.risky_patterns || [],
      explanation: ai?.explanation,
      architecture_diagram: normalizeMermaid(ai?.architecture_diagram),
      function_flow_diagram: normalizeMermaid(ai?.function_flow_diagram),
      logic_flow_diagram: normalizeMermaid(ai?.logic_flow_diagram || ai?.flowchart),
      function_map: Array.isArray(ai?.function_map) ? ai.function_map : [],
      flowchart: normalizeMermaid(ai?.logic_flow_diagram || ai?.flowchart),
      refactor_plan: Array.isArray(ai?.refactor_plan) ? ai.refactor_plan : [],
      business_impact: {
        estimated_effort_hours: businessImpact.estimated_effort_hours,
        estimated_cost: businessImpact.estimated_cost,
        severity: businessImpact.severity,
      },
      category_summary,
      prioritized_roadmap: prioritized,
      prioritized_action_plan,

      security_analysis: security,
      dependency_analysis: dependencyResult,
      threat_intelligence: threatIntel,
      dependency_suggestions: dependencySuggestions,
      security_fixes: securityFixes,
      rewritten_code_option: true,
    };

    res.status(200).json(unified);
  } catch (err) {
    next(err);
  }
}

export async function explainCode(req, res, next) {
  try {
    const code = requireCode(req);
    const prompt = buildExplainCodePrompt(code);
    const text = await generateResponse(prompt);
    const data = cleanAndParseJson(text, { endpoint: "explain-code" });
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function modernizeCode(req, res, next) {
  try {
    const code = requireCode(req);
    const prompt = buildModernizeCodePrompt(code);
    const text = await generateResponse(prompt);
    const data = cleanAndParseJson(text, { endpoint: "modernize-code" });
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function rewriteCodebase(req, res, next) {
  try {
    const code = requireCode(req);

    const staticResult = analyzeCodeStatic(code);
    const dependencyResult = analyzeDependencies(req?.body?.package_json);
    const securityAnalysis = analyzeSecurity(code);
    const promptContext = {
      ...staticResult,
      dependency_analysis: dependencyResult,
      security_analysis: securityAnalysis,
    };

    const prompt = buildRewriteCodebasePrompt(code, promptContext);
    const text = await generateResponse(prompt);
    let data = cleanAndParseJson(text, { endpoint: "rewrite-codebase" });

    const firstPass = String(data?.rewritten_code || "");
    const firstSecurity = analyzeSecurity(firstPass, {
      vulnerable_dependencies: dependencyResult?.vulnerable_dependencies || [],
    });
    const firstStatic = analyzeCodeStatic(firstPass);

    const hasSecurityRisk =
      (firstSecurity?.security_risks || []).length > 0 ||
      (firstSecurity?.secrets_detected || []).length > 0;
    const hasHighDuplication = Number(firstStatic?.duplication_percentage || 0) > 10;

    // One extra hardening pass for production-quality rewrite quality.
    if (firstPass && (hasSecurityRisk || hasHighDuplication)) {
      const hardenPrompt = buildRewriteHardeningPrompt(
        firstPass,
        promptContext,
        {
          security_risks: firstSecurity?.security_risks || [],
          secrets_detected: firstSecurity?.secrets_detected || [],
          duplication_percentage: firstStatic?.duplication_percentage || 0,
        }
      );
      const hardenText = await generateResponse(hardenPrompt);
      const hardened = cleanAndParseJson(hardenText, { endpoint: "rewrite-codebase" });
      if (typeof hardened?.rewritten_code === "string" && hardened.rewritten_code.trim()) {
        data = hardened;
      }
    }

    if (!String(data?.rewritten_code || "").trim()) {
      const err = new Error(
        "AI rewrite unavailable right now. Please retry with a valid Gemini key/quota."
      );
      err.status = 503;
      err.expose = true;
      throw err;
    }

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function translateCode(req, res, next) {
  try {
    const code = requireCode(req);
    const targetLanguageRaw = req?.body?.targetLanguage;

    const detected = detectLanguage(code);

    let purposeData = { purpose_category: "unknown", one_line_summary: "" };
    try {
      const purposePrompt = buildPurposeClassificationPrompt(code, detected);
      const purposeText = await generateResponse(purposePrompt);
      purposeData = cleanAndParseJson(purposeText, { endpoint: "translate-purpose" });
      if (purposeData.parse_error) {
        purposeData = { purpose_category: "unknown", one_line_summary: "" };
      }
    } catch {
      purposeData = { purpose_category: "unknown", one_line_summary: "" };
    }

    const purposeKey = normalizePurposeKey(purposeData.purpose_category);
    const suggested = suggestBestLanguage(purposeKey);
    const translatedTo = resolveTargetLanguage(targetLanguageRaw, suggested);

    const translatePrompt = buildSimpleTranslatePrompt(code, detected, translatedTo);
    const rawText = await generatePlainTextResponse(translatePrompt);
    let translated_code = sanitizeTranslatedCode(stripCodeFences(String(rawText || "").trim()));

    if (!translated_code) {
      return res.status(200).json({
        detected_language: detected,
        translated_to: translatedTo,
        translated_code: `// AI unavailable - fallback response\n${code}`,
        warning: "AI translation failed, showing fallback",
      });
    }

    return res.status(200).json({
      detected_language: detected,
      translated_to: translatedTo,
      translated_code,
    });
  } catch (err) {
    next(err);
  }
}

