function safeJsonParse(maybeJson) {
  if (typeof maybeJson !== "string") return null;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function listDeps(pkg) {
  const deps = pkg?.dependencies && typeof pkg.dependencies === "object" ? pkg.dependencies : {};
  const devDeps =
    pkg?.devDependencies && typeof pkg.devDependencies === "object"
      ? pkg.devDependencies
      : {};
  return Object.keys({ ...deps, ...devDeps });
}

export function suggestDependencies(packageJsonInput) {
  const pkg =
    typeof packageJsonInput === "string"
      ? safeJsonParse(packageJsonInput)
      : packageJsonInput && typeof packageJsonInput === "object"
        ? packageJsonInput
        : null;

  const depSet = new Set(listDeps(pkg));
  const suggestions = [];

  // Per your spec
  if (depSet.has("axios")) {
    suggestions.push({
      current: "axios",
      suggested: "node-fetch",
      reason:
        "If you only need basic HTTP calls, a smaller/focused client can reduce footprint. (Node 18+ also has built-in fetch).",
    });
  }
  if (depSet.has("request")) {
    suggestions.push({
      current: "request",
      suggested: "axios/fetch",
      reason:
        "request is deprecated. Migrate to axios or built-in fetch (Node 18+) for maintained HTTP support.",
    });
  }

  // Extra realistic suggestions (kept small)
  if (depSet.has("moment")) {
    suggestions.push({
      current: "moment",
      suggested: "dayjs",
      reason: "moment is legacy; dayjs is smaller and modern for common date operations.",
    });
  }

  return suggestions;
}

