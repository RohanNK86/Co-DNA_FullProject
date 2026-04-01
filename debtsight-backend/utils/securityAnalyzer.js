function normalize(code) {
  return String(code || "");
}

function findAll(re, text, mapper) {
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(mapper(m));
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

function redact(value) {
  const v = String(value || "");
  if (v.length <= 8) return "***";
  return `${v.slice(0, 3)}***${v.slice(-3)}`;
}

function detectHardcodedSecrets(code) {
  const s = normalize(code);

  const findings = [];

  // Generic "password/token/apiKey/secret" assignment
  const assignRe =
    /\b(password|passwd|pwd|token|api[_-]?key|secret)\b\s*[:=]\s*["']([^"']{6,})["']/gi;
  findings.push(
    ...findAll(assignRe, s, (m) => ({
      type: "hardcoded_secret",
      kind: String(m[1]).toLowerCase(),
      evidence: redact(m[2]),
      location: "inline assignment",
      severity: "high",
    }))
  );

  // Common API key patterns (best-effort, mockable)
  const googleApiKeyRe = /\bAIza[0-9A-Za-z\-_]{20,}\b/g;
  findings.push(
    ...findAll(googleApiKeyRe, s, (m) => ({
      type: "hardcoded_secret",
      kind: "google_api_key",
      evidence: redact(m[0]),
      location: "inline",
      severity: "high",
    }))
  );

  const jwtLikeRe = /\beyJ[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\b/g;
  findings.push(
    ...findAll(jwtLikeRe, s, (m) => ({
      type: "hardcoded_secret",
      kind: "jwt",
      evidence: redact(m[0]),
      location: "inline",
      severity: "high",
    }))
  );

  return findings.slice(0, 20);
}

function detectUnsafePatterns(code) {
  const s = normalize(code);
  const risks = [];

  if (/\beval\s*\(/.test(s)) {
    risks.push({
      type: "unsafe_eval",
      severity: "high",
      details: "Use of eval() can lead to remote code execution if input is attacker-controlled.",
      location: "eval(...)",
    });
  }

  if (/\bnew\s+Function\s*\(/.test(s)) {
    risks.push({
      type: "unsafe_dynamic_code",
      severity: "high",
      details: "Dynamic code generation via new Function() is dangerous and often exploitable.",
      location: "new Function(...)",
    });
  }

  // Basic SQL injection smell (string concatenation in query)
  if (
    /\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,120}["']\s*\+\s*[A-Za-z0-9_$]/i.test(s) ||
    /\bquery\s*\(\s*["'][\s\S]*\+\s*[A-Za-z0-9_$]/i.test(s) ||
    /SELECT\s+.*FROM\s+.*WHERE\s+.*\+/i.test(s)
  ) {
    risks.push({
      type: "sql_injection_risk",
      severity: "high",
      details:
        "Possible string-concatenated SQL detected. Use parameterized queries/prepared statements.",
      location: "SQL query construction",
    });
  }

  // Unsafe direct usage of request input in sensitive operations.
  if (
    /req\.(body|query)\.[A-Za-z0-9_$]+/i.test(s) &&
    /(query\s*\(|exec\s*\(|eval\s*\(|new\s+Function\s*\()/i.test(s)
  ) {
    risks.push({
      type: "unsafe_direct_input_usage",
      severity: "high",
      details:
        "req.body/req.query appears to be used directly in a sensitive sink. Validate and sanitize first.",
      location: "request input handling",
    });
  }

  // Insecure HTTP usage (plain http URLs)
  if (/\bhttp:\/\//i.test(s)) {
    risks.push({
      type: "insecure_http",
      severity: "medium",
      details:
        "Plain HTTP URL detected. Prefer HTTPS to prevent MITM and data leakage.",
      location: "http://...",
    });
  }

  // Disable TLS verification patterns
  if (
    /\bNODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0["']?/i.test(s) ||
    /\brejectUnauthorized\s*:\s*false/i.test(s)
  ) {
    risks.push({
      type: "tls_verification_disabled",
      severity: "high",
      details:
        "TLS verification appears disabled. This enables MITM attacks. Never disable in production.",
      location: "TLS config",
    });
  }

  return risks;
}

function computeSecurityScore({ vulnerabilities = [], risks = [] } = {}) {
  let score = 100;

  for (const v of vulnerabilities) {
    const sev = String(v?.severity || "").toLowerCase();
    score -= sev === "high" ? 20 : sev === "medium" ? 12 : 6;
  }
  for (const r of risks) {
    const sev = String(r?.severity || "").toLowerCase();
    score -= sev === "high" ? 18 : sev === "medium" ? 10 : 5;
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

function scoreToRiskLevel(score) {
  if (score < 50) return "HIGH";
  if (score <= 80) return "MEDIUM";
  return "LOW";
}

export function analyzeSecurity(code, options = {}) {
  const secrets_detected = detectHardcodedSecrets(code);
  const security_risks = detectUnsafePatterns(code);
  const vulnerable_dependencies = Array.isArray(options?.vulnerable_dependencies)
    ? options.vulnerable_dependencies
    : [];
  const security_score = computeSecurityScore({
    vulnerabilities: vulnerable_dependencies,
    risks: [...security_risks, ...secrets_detected],
  });
  const risk_level = scoreToRiskLevel(security_score);

  return {
    secrets_detected,
    security_risks,
    security_score,
    risk_level,
  };
}

