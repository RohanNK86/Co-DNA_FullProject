/** Remove ``` fences if the model still wraps output in markdown. */
export function stripCodeFences(text) {
  let s = String(text ?? "").trim();
  if (!s.startsWith("```")) {
    return s;
  }
  s = s.replace(/^```[a-zA-Z0-9]*\s*/m, "");
  s = s.replace(/```$/m, "").trim();
  return s;
}

/**
 * Light post-pass: redact obvious secret-like literals from translated snippets.
 * Does not understand all languages; complements AI instructions.
 */
export function sanitizeTranslatedCode(code) {
  let s = String(code ?? "");
  if (!s) {
    return s;
  }

  s = s.replace(/\b(sk-[a-zA-Z0-9]{20,})\b/g, "[REDACTED_TOKEN]");
  s = s.replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, "[REDACTED_KEY]");
  s = s.replace(
    /\b(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{4,}['"]/gi,
    "$1: '[REDACTED]'"
  );
  return s;
}
