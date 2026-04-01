import { analyzeSecurity } from "./securityAnalyzer.js";
import { analyzeDependencies } from "./dependencyAnalyzer.js";
import { getThreatIntel } from "./threatIntel.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreSecurity({ risks = [], secrets = [], vulnerableDeps = [] } = {}) {
  let score = 100;

  score -= secrets.length * 25;
  for (const r of risks) {
    const sev = String(r?.severity || "").toLowerCase();
    score -= sev === "high" ? 25 : sev === "medium" ? 12 : 6;
  }
  for (const v of vulnerableDeps) {
    const sev = String(v?.severity || "").toLowerCase();
    score -= sev === "high" ? 20 : sev === "medium" ? 10 : 5;
  }

  return Math.round(clamp(score, 0, 100));
}

export function securityBacktest(code, packageJson) {
  const security = analyzeSecurity(code);
  const deps = analyzeDependencies(packageJson);

  const vulnerable_dependencies = Array.isArray(deps?.vulnerable_dependencies)
    ? deps.vulnerable_dependencies
    : [];
  const outdated_dependencies = Array.isArray(deps?.outdated_dependencies)
    ? deps.outdated_dependencies
    : [];

  const risky_patterns = [
    ...(security?.security_risks || []).map((r) => ({
      type: r.type,
      severity: r.severity,
      details: r.details,
      location: r.location,
    })),
    ...(security?.secrets_detected || []).map((s) => ({
      type: "hardcoded_secret",
      severity: s.severity || "high",
      details: `Hardcoded ${s.kind} detected (${s.evidence}).`,
      location: s.location || "inline",
    })),
  ];

  const threatIntel = getThreatIntel({
    dependencies: deps?.dependencies_list,
    security_risks: security?.security_risks,
  });

  const security_score = scoreSecurity({
    risks: security?.security_risks || [],
    secrets: security?.secrets_detected || [],
    vulnerableDeps: vulnerable_dependencies,
  });

  return {
    security_score,
    vulnerable_dependencies,
    outdated_dependencies,
    risky_patterns,
    threat_alerts: threatIntel?.threat_alerts || [],
  };
}

