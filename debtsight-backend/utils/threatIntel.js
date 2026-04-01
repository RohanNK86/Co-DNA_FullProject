function uniq(arr) {
  return Array.from(new Set(arr));
}

export function getThreatIntel({ dependencies = [], security_risks = [] } = {}) {
  const depNames = Array.isArray(dependencies) ? dependencies : [];
  const risks = Array.isArray(security_risks) ? security_risks : [];

  const alerts = [];

  if (depNames.includes("axios")) {
    alerts.push({
      title: "Supply chain: popular HTTP client risk",
      example: "axios supply chain vulnerability",
      why: "Widely used packages are high-value targets; pin versions and monitor advisories.",
      severity: "medium",
    });
  }

  if (depNames.includes("event-stream")) {
    alerts.push({
      title: "Historical npm supply-chain incident",
      example: "event-stream attack",
      why: "Demonstrates risk of transitive dependency compromise in npm ecosystems.",
      severity: "high",
    });
  }

  if (risks.some((r) => String(r?.type) === "unsafe_eval")) {
    alerts.push({
      title: "Code injection risk pattern",
      example: "eval-based injection",
      why: "Attackers can turn dynamic evaluation into RCE if inputs are not tightly controlled.",
      severity: "high",
    });
  }

  if (risks.some((r) => String(r?.type) === "sql_injection_risk")) {
    alerts.push({
      title: "OWASP Top 10: Injection",
      example: "SQL injection via string concatenation",
      why: "Parameterized queries prevent attacker-controlled SQL fragments.",
      severity: "high",
    });
  }

  return { threat_alerts: uniq(alerts.map((a) => JSON.stringify(a))).map((s) => JSON.parse(s)) };
}

