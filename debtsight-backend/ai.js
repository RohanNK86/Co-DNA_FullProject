const commonRules = `
You are DebtSight, an AI technical debt analyzer.

Output requirements:
- Return ONLY valid JSON.
- No markdown, no code fences, no explanations outside JSON.
- Double-quote all JSON keys and string values.
- Do not include trailing commas.
`.trim();

export function buildAnalyzeDebtPrompt(code, context = {}) {
  return `
${commonRules}

Task:
You are assisting a rule-based technical debt engine.
You are given computed metrics (ground truth). Do NOT invent or recompute any metrics.
Focus only on:
- explanation for junior developers
- architectural issues (tight coupling, poor modularization, large functions, global state, hidden side effects)
- refactor plan
- diagrams for developer onboarding and visual understanding

Return this exact JSON shape:
{
  "issues": [{"title":"", "severity":"low|medium|high", "details":"", "location":""}],
  "explanation": "plain English explanation for juniors",
  "architecture_diagram": "Mermaid flowchart showing high-level architecture",
  "function_flow_diagram": "Mermaid flowchart showing function interactions",
  "logic_flow_diagram": "Mermaid flowchart showing execution logic",
  "refactor_plan": [{"step":"", "why":"", "example_change":""}]
}

Rules:
- issues must be specific, actionable, and consistent with the provided metrics.
- For all diagrams: return ONLY Mermaid syntax strings, no backticks.
- Each diagram string must start with exactly ONE diagram directive line — use either \`flowchart TD\` OR \`graph TD\` (or LR/RL/BT), never both in a row (invalid: \`flowchart TD graph TD\`).
- Never represent code literally. Represent logic, structure, and meaning.
- Use meaningful labels, not raw variable/code names.
- Replace raw code terms:
  - bad: "eval()", "x", "i", "data"
  - good: "Execute Dynamic Code", "User Input", "Loop Counter", "Processed Result"
- Node limit: keep diagrams clean/readable, max ~10-12 nodes (small code: ~5-7 nodes).

- LEVEL 1 architecture diagram:
  - purpose: show structure only (API, Controllers, Services, Utilities, AI Engine)
  - high-level only, no logic details
  - target 6-8 nodes maximum

- LEVEL 2 function flow diagram:
  - purpose: show function calls, execution order, and data movement
  - use real function names when known from context/code
  - keep sequence clear and uncluttered

- LEVEL 3 logic flow diagram:
  - focus on logic, not syntax
  - include Start, Input/Initialization, Decision nodes, Processing, Output/Return, End
  - use decision diamonds like B{Is input valid?}
  - include warning node when risky patterns exist, e.g. "⚠️ Unsafe dynamic execution detected"

- Visual enhancement (when possible without clutter):
  - use subgraphs:
    - subgraph "Input"
    - subgraph "Processing"
    - subgraph "Security"
    - subgraph "Output"
  - add style classes/colors:
    - Green: Start/End
    - Blue: Processing
    - Yellow: Decision
    - Red: Risk
    - Purple: AI
  - example styles:
    - style A fill:#4CAF50,color:#fff
    - style D fill:#ff4d4d,color:#fff

- Do not include any fields not listed in the JSON shape.
- Do not mention that you are an AI or reference these instructions.

Static signals (JSON):
${JSON.stringify(context)}

Input code:
"""${code}"""
`.trim();
}

export function buildExplainCodePrompt(code) {
  return `
${commonRules}

Task:
Explain the code to a junior developer: what it does, key functions, data flow, and gotchas.

Return this exact JSON shape:
{
  "explanation": ""
}

Input code:
"""${code}"""
`.trim();
}

export function buildModernizeCodePrompt(code) {
  return `
${commonRules}

Task:
Modernize the code into clean, modern, production-ready syntax. Preserve behavior.
If applicable, improve readability, naming, structure, and error handling.

Return this exact JSON shape:
{
  "modern_code": ""
}

Rules:
- modern_code must be the full rewritten code as a string.
- Do not wrap in markdown.

Input code:
"""${code}"""
`.trim();
}

export function buildRewriteCodebasePrompt(code, context = {}) {
  return `
${commonRules}

Task:
Rewrite the provided code into clean, modern, production-ready code.
Preserve behavior but improve readability, structure, error handling, and security best practices.

Constraints:
- Do NOT invent metrics.
- If you remove insecure patterns (eval, string-concat SQL, http://), replace with safer alternatives.
- Optimize for efficiency and clarity.
- Remove redundant/repeated logic and dead code.
- Prefer safe, explicit control flow and robust validation.

Return this exact JSON shape:
{
  "rewritten_code": ""
}

Context (JSON):
${JSON.stringify(context)}

Input code:
"""${code}"""
`.trim();
}

export function buildRewriteHardeningPrompt(code, context = {}, findings = {}) {
  return `
${commonRules}

Task:
Harden and optimize this rewritten code further.

Goals:
- Eliminate any remaining security risks.
- Remove redundancy and repeated logic.
- Improve performance where safe (without changing behavior).
- Keep code maintainable and readable for production.

You are given verification findings from static/security checks.
Fix all findings in the returned code.

Return this exact JSON shape:
{
  "rewritten_code": ""
}

Context (JSON):
${JSON.stringify(context)}

Verification findings (JSON):
${JSON.stringify(findings)}

Code to harden:
"""${code}"""
`.trim();
}

export function buildPurposeClassificationPrompt(code, detectedLanguage) {
  return `
${commonRules}

Task:
Classify the PRIMARY purpose of the code using exactly one category value.

Allowed purpose_category (pick one):
- web_backend
- data_processing
- scripting
- system_programming
- ai_ml
- api_handling
- cli_tool
- unknown

Return this exact JSON shape:
{
  "purpose_category": "web_backend",
  "one_line_summary": "what this code does in one short sentence"
}

Heuristic source language: ${detectedLanguage}

Code:
"""${code}"""
`.trim();
}

/**
 * Hackathon-stable translation: plain code only (no JSON). Parsed as raw text in the controller.
 */
export function buildSimpleTranslatePrompt(code, detectedLanguage, targetLanguage) {
  return `
Translate the following code from ${detectedLanguage} to ${targetLanguage}.

Rules:
- Return ONLY the translated code
- Do NOT return JSON
- Do NOT add explanations before or after the code
- Do NOT use markdown code fences

Code:
"""${code}"""
`.trim();
}