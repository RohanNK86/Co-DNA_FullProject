/** Normalize AI purpose string to a canonical bucket. */
export function normalizePurposeKey(purposeRaw) {
  const p = String(purposeRaw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  const aliases = {
    webbackend: "web_backend",
    backend: "web_backend",
    web_api: "web_backend",
    rest_api: "api_handling",
    api: "api_handling",
    data: "data_processing",
    etl: "data_processing",
    machinelearning: "ai_ml",
    ml: "ai_ml",
    deeplearning: "ai_ml",
    systems: "system_programming",
    lowlevel: "system_programming",
    automation: "scripting",
    shell: "scripting",
    cli: "cli_tool",
    commandline: "cli_tool",
  };

  if (aliases[p]) {
    return aliases[p];
  }
  if (
    [
      "web_backend",
      "data_processing",
      "scripting",
      "system_programming",
      "ai_ml",
      "api_handling",
      "cli_tool",
      "unknown",
    ].includes(p)
  ) {
    return p;
  }
  if (p.includes("api") || p.includes("handler")) {
    return "api_handling";
  }
  if (p.includes("web") || p.includes("server")) {
    return "web_backend";
  }
  if (p.includes("data") || p.includes("process")) {
    return "data_processing";
  }
  if (p.includes("ml") || p.includes("ai") || p.includes("model")) {
    return "ai_ml";
  }
  return "unknown";
}

const PURPOSE_TO_LANG = {
  web_backend: "Node.js (TypeScript)",
  data_processing: "Python",
  scripting: "Python",
  system_programming: "Rust",
  ai_ml: "Python",
  api_handling: "Go",
  cli_tool: "Go",
  unknown: "JavaScript",
};

/**
 * Recommend a language label for a purpose bucket (deterministic).
 */
export function suggestBestLanguage(purposeKey) {
  const k = normalizePurposeKey(purposeKey);
  return PURPOSE_TO_LANG[k] || PURPOSE_TO_LANG.unknown;
}

/**
 * User-selected target: empty / auto → use suggested.
 */
export function resolveTargetLanguage(targetLanguage, suggestedLabel) {
  const raw = String(targetLanguage ?? "").trim();
  const lower = raw.toLowerCase();
  if (
    !raw ||
    lower === "auto" ||
    lower === "auto optimize" ||
    lower === "best" ||
    lower === "recommended"
  ) {
    return suggestedLabel;
  }
  return raw;
}
