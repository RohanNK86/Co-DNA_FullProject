function countLines(code) {
  if (typeof code !== "string") return 0;
  const normalized = code.replace(/\r\n/g, "\n");
  // Count non-empty lines (more useful for LOC in a hackathon analyzer)
  return normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;
}

function stripStringsAndComments(code) {
  // Best-effort tokenizer-lite to avoid counting keywords inside strings/comments.
  // Not a full parser; good enough for metrics.
  let s = String(code || "");
  // Remove block comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Remove line comments
  s = s.replace(/\/\/.*$/gm, " ");
  // Remove template strings (best effort)
  s = s.replace(/`[\s\S]*?`/g, " ");
  // Remove single/double quoted strings (best effort)
  s = s.replace(/"([^"\\]|\\.)*"/g, " ");
  s = s.replace(/'([^'\\]|\\.)*'/g, " ");
  return s;
}

function countFunctions(code) {
  const s = stripStringsAndComments(code);
  const patterns = [
    /\bfunction\b\s*[A-Za-z0-9_$]*\s*\(/g, // function foo(
    /\b[A-Za-z0-9_$]+\s*=\s*\([^)]*\)\s*=>/g, // x = (...) =>
    /\b[A-Za-z0-9_$]+\s*=\s*[A-Za-z0-9_$]+\s*=>/g, // x = y =>
    /\([^)]*\)\s*=>/g, // (...) =>
    /\basync\b\s*\([^)]*\)\s*=>/g, // async (...) =>
    /\bclass\b\s+[A-Za-z0-9_$]+\b/g, // count class as function-ish unit? no; keep separate
    /\b[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{/g, // methodName(...) {
  ];

  let count = 0;
  for (const re of patterns) {
    const matches = s.match(re);
    if (matches) count += matches.length;
  }
  // Heuristic de-duplication: method pattern overlaps with function declarations.
  // Clamp by unique-ish count: take the max of a few strong signals.
  const functionDecl = (s.match(/\bfunction\b\s*[A-Za-z0-9_$]*\s*\(/g) || [])
    .length;
  const arrows = (s.match(/=>/g) || []).length;
  const methods = (s.match(/\b[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{/g) || [])
    .length;
  return Math.max(functionDecl + arrows, methods, Math.floor(count / 2));
}

function nestingDepth(code) {
  const s = stripStringsAndComments(code);
  let depth = 0;
  let max = 0;
  for (const ch of s) {
    if (ch === "{") {
      depth += 1;
      if (depth > max) max = depth;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
    }
  }
  // depth includes object literals too; still useful as a "nesting pressure" signal.
  return max;
}

function cyclomaticComplexity(code) {
  const s = stripStringsAndComments(code);
  const tokens = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*[^:]+:/g, // ternary
    /&&/g,
    /\|\|/g,
  ];
  let hits = 0;
  for (const re of tokens) hits += (s.match(re) || []).length;
  // Base complexity 1
  return 1 + hits;
}

function functionRanges(code) {
  // Heuristic: locate "function" blocks by braces; doesn’t handle all syntax.
  const s = stripStringsAndComments(code);
  const idxs = [];
  const re = /\bfunction\b\s*[A-Za-z0-9_$]*\s*\(|=>\s*\{|[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(s)) !== null) idxs.push(m.index);

  const ranges = [];
  const chars = s.split("");
  for (const start of idxs) {
    const braceStart = s.indexOf("{", start);
    if (braceStart === -1) continue;
    let depth = 0;
    for (let i = braceStart; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) {
        ranges.push([braceStart, i]);
        break;
      }
    }
  }
  return ranges;
}

function longFunctions(code, thresholdLines = 50) {
  const normalized = String(code || "").replace(/\r\n/g, "\n");
  const ranges = functionRanges(normalized);
  const lines = normalized.split("\n");

  // Map char index -> line number (1-based)
  const charToLine = (() => {
    const map = new Array(normalized.length + 1);
    let line = 1;
    for (let i = 0; i < normalized.length; i++) {
      map[i] = line;
      if (normalized[i] === "\n") line++;
    }
    map[normalized.length] = line;
    return map;
  })();

  const results = [];
  for (const [a, b] of ranges) {
    const startLine = charToLine[a] || 1;
    const endLine = charToLine[b] || startLine;
    const len = endLine - startLine + 1;
    if (len > thresholdLines) {
      results.push({
        type: "long_function",
        severity: "medium",
        details: `Function block is ~${len} lines (>${thresholdLines}). Consider splitting into smaller functions.`,
        location: `lines ${startLine}-${endLine}`,
      });
    }
  }
  return results;
}

function tooManyParameters(code, threshold = 4) {
  const s = stripStringsAndComments(code);
  const re = /\bfunction\b\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/g;
  const results = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const paramsRaw = (m[1] ?? m[2] ?? "").trim();
    if (!paramsRaw) continue;
    const count = paramsRaw
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0).length;
    if (count > threshold) {
      results.push({
        type: "too_many_parameters",
        severity: "low",
        details: `Function has ${count} parameters (>${threshold}). Consider using an options object or splitting responsibilities.`,
        location: "function signature",
      });
    }
  }
  return results;
}

function deepNestingSmell(maxDepth, threshold = 3) {
  if (maxDepth <= threshold) return [];
  return [
    {
      type: "deep_nesting",
      severity: "high",
      details: `Detected nesting depth ${maxDepth} (>${threshold}). Refactor with guard clauses, extracted functions, or early returns.`,
      location: "overall",
    },
  ];
}

function abandonedFeatureFlags(code) {
  const s = String(code || "");
  const findings = [];

  // Heuristic: feature flags hardcoded to true/false often indicate stale toggles.
  const hardcodedFlagRe =
    /\b(feature[_-]?flag|flag[_-]?[A-Za-z0-9_$]+)\b\s*[:=]\s*(true|false)\b/gi;
  let m;
  while ((m = hardcodedFlagRe.exec(s)) !== null) {
    findings.push({
      type: "abandoned_feature_flag",
      severity: "low",
      details:
        "Potential hardcoded feature flag detected. Consider removing stale flags after rollout.",
      location: "feature flag definition",
    });
    if (findings.length >= 3) break;
  }

  return findings;
}

function duplicationPercentage(code) {
  const normalized = String(code || "").replace(/\r\n/g, "\n");
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//"));
  if (lines.length === 0) return 0;

  // Exact-line duplication
  const counts = new Map();
  for (const l of lines) counts.set(l, (counts.get(l) || 0) + 1);
  let duplicateLines = 0;
  for (const [, c] of counts) {
    if (c > 1) duplicateLines += c - 1; // count only repeats, not the first occurrence
  }

  const pct = (duplicateLines / lines.length) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function normalizeTo100(rawScore) {
  // Map a wide range of scores into 0-100 with diminishing returns.
  // 0 -> 0, 20 -> ~50, 40 -> ~67, 80 -> ~80, 160 -> ~89
  const x = Math.max(0, Number(rawScore) || 0);
  const normalized = 100 * (1 - Math.exp(-x / 20));
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

export function analyzeCodeStatic(code) {
  const loc = countLines(code);
  const funcs = countFunctions(code);
  const depth = nestingDepth(code);
  const cc = cyclomaticComplexity(code);
  const duplication = duplicationPercentage(code);

  const complexity_raw_score = cc * 2 + depth * 3 + funcs * 1;
  const complexity_score = normalizeTo100(complexity_raw_score);

  const smells = [
    ...longFunctions(code, 50),
    ...deepNestingSmell(depth, 3),
    ...tooManyParameters(code, 4),
    ...abandonedFeatureFlags(code),
  ];

  return {
    complexity_metrics: {
      lines_of_code: loc,
      number_of_functions: funcs,
      nesting_depth: depth,
      cyclomatic_complexity: cc,
    },
    complexity_score,
    duplication_percentage: duplication,
    smells,
  };
}

