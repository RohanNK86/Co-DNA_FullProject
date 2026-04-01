function safeJsonParse(maybeJson) {
  if (typeof maybeJson !== "string") return null;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function countDeps(pkg) {
  const deps = pkg?.dependencies && typeof pkg.dependencies === "object" ? pkg.dependencies : {};
  const devDeps =
    pkg?.devDependencies && typeof pkg.devDependencies === "object"
      ? pkg.devDependencies
      : {};
  return {
    dependencies_count: Object.keys(deps).length,
    dev_dependencies_count: Object.keys(devDeps).length,
    total_dependencies: Object.keys({ ...deps, ...devDeps }).length,
  };
}

function mockOutdated(depsObj, max = 5) {
  // Mock/simple logic: treat pinned major 0 or 1 as potentially outdated,
  // and any "*" or empty version as risky.
  const results = [];
  for (const [name, version] of Object.entries(depsObj || {})) {
    const v = String(version || "").trim();
    if (!v || v === "*" || v === "latest") {
      results.push({ name, current: v || "(missing)", reason: "Unpinned version" });
      continue;
    }
    const m = v.match(/(\d+)\./);
    const major = m ? Number(m[1]) : null;
    if (major !== null && major <= 1) {
      results.push({ name, current: v, reason: "Low major version (heuristic)" });
    }
    if (results.length >= max) break;
  }
  return results;
}

function mockVulnerable(depsObj, max = 5) {
  // Mock vulnerability signals for hackathon realism.
  // In production, wire to `npm audit`, OSV, or GitHub Advisory DB.
  const knownBad = new Set([
    "event-stream",
    "ua-parser-js",
    "lodash",
    "axios",
  ]);
  const results = [];
  for (const [name, version] of Object.entries(depsObj || {})) {
    if (!knownBad.has(name)) continue;
    results.push({
      name,
      current: String(version || "").trim() || "(missing)",
      severity: name === "event-stream" ? "high" : "medium",
      advisory: "Simulated advisory for hackathon demo",
    });
    if (results.length >= max) break;
  }
  return results;
}

export function analyzeDependencies(packageJsonInput) {
  // Accept either:
  // - object (already parsed), or
  // - string (raw package.json contents)
  const pkg =
    typeof packageJsonInput === "string"
      ? safeJsonParse(packageJsonInput)
      : packageJsonInput && typeof packageJsonInput === "object"
        ? packageJsonInput
        : null;

  if (!pkg) {
    return {
      provided: false,
      number_of_dependencies: 0,
      outdated_dependencies: [],
      vulnerable_dependencies: [],
      dependency_risk: "unknown",
      dependencies_list: [],
    };
  }

  const deps = pkg.dependencies && typeof pkg.dependencies === "object" ? pkg.dependencies : {};
  const devDeps =
    pkg.devDependencies && typeof pkg.devDependencies === "object" ? pkg.devDependencies : {};

  const counts = countDeps(pkg);
  const outdated = [
    ...mockOutdated(deps, 5).map((x) => ({ ...x, type: "dependency" })),
    ...mockOutdated(devDeps, 5).map((x) => ({ ...x, type: "devDependency" })),
  ].slice(0, 8);

  const vulnerable = [
    ...mockVulnerable(deps, 5).map((x) => ({ ...x, type: "dependency" })),
    ...mockVulnerable(devDeps, 5).map((x) => ({ ...x, type: "devDependency" })),
  ].slice(0, 8);

  let dependency_risk = "low";
  if (counts.total_dependencies > 15) dependency_risk = "high";
  else if (counts.total_dependencies >= 5) dependency_risk = "medium";

  const dependencies_list = Object.keys({ ...deps, ...devDeps }).sort();

  return {
    provided: true,
    number_of_dependencies: counts.total_dependencies,
    outdated_dependencies: outdated,
    vulnerable_dependencies: vulnerable,
    dependency_risk,
    dependencies_list,
  };
}

