function stripCodeFences(text) {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();

  // ```json ... ``` or ``` ... ```
  if (trimmed.startsWith("```")) {
    const withoutStart = trimmed.replace(/^```[a-zA-Z]*\s*/m, "");
    return withoutStart.replace(/```$/m, "").trim();
  }
  return trimmed;
}

function extractFirstJsonObject(text) {
  // Best-effort: find the first top-level JSON object substring.
  // This is resilient to "Sure, here's the JSON:" style leaks.
  const s = text;
  const start = s.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

function normalizeKnownFields(obj, { endpoint }) {
  if (!obj || typeof obj !== "object") return obj;

  if (endpoint === "analyze-debt") {
    return {
      issues: Array.isArray(obj.issues) ? obj.issues : [],
      explanation: typeof obj.explanation === "string" ? obj.explanation : "",
      architecture_diagram:
        typeof obj.architecture_diagram === "string"
          ? obj.architecture_diagram
          : "",
      function_flow_diagram:
        typeof obj.function_flow_diagram === "string"
          ? obj.function_flow_diagram
          : "",
      logic_flow_diagram:
        typeof obj.logic_flow_diagram === "string"
          ? obj.logic_flow_diagram
          : "",
      function_map: Array.isArray(obj.function_map) ? obj.function_map : [],
      flowchart:
        typeof obj.logic_flow_diagram === "string"
          ? obj.logic_flow_diagram
          : typeof obj.flowchart === "string"
            ? obj.flowchart
            : "",
      refactor_plan: Array.isArray(obj.refactor_plan) ? obj.refactor_plan : [],
    };
  }

  if (endpoint === "explain-code") {
    return {
      explanation: typeof obj.explanation === "string" ? obj.explanation : "",
    };
  }

  if (endpoint === "modernize-code") {
    return {
      modern_code: typeof obj.modern_code === "string" ? obj.modern_code : "",
    };
  }

  if (endpoint === "rewrite-codebase") {
    return {
      rewritten_code:
        typeof obj.rewritten_code === "string" ? obj.rewritten_code : "",
    };
  }

  if (endpoint === "translate-purpose") {
    return {
      purpose_category:
        typeof obj.purpose_category === "string" ? obj.purpose_category : "unknown",
      one_line_summary:
        typeof obj.one_line_summary === "string" ? obj.one_line_summary : "",
    };
  }

  return obj;
}

export function cleanAndParseJson(rawText, meta = {}) {
  const endpoint = meta?.endpoint;
  const cleaned = stripCodeFences(rawText);

  const tryParse = (s) => {
    const parsed = JSON.parse(s);
    return normalizeKnownFields(parsed, { endpoint });
  };

  try {
    return tryParse(cleaned);
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (extracted) {
      try {
        return tryParse(extracted);
      } catch {
        // fall through
      }
    }
  }

  // Safe fallback: return raw text payload instead of throwing.
  return {
    raw_text: typeof rawText === "string" ? rawText : String(rawText ?? ""),
    parse_error: true,
    endpoint: endpoint || "unknown",
  };
}

