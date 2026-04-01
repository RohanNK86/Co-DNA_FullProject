function severityScore(sev) {
  const s = String(sev || "").toLowerCase();
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

function effortHint(issue) {
  const t = `${issue?.title || ""} ${issue?.details || ""}`.toLowerCase();
  if (t.includes("deep nesting") || t.includes("refactor") || t.includes("coupling"))
    return 3;
  if (t.includes("duplicate") || t.includes("long function")) return 2;
  return 1;
}

function impactHint(issue) {
  const t = `${issue?.title || ""} ${issue?.details || ""}`.toLowerCase();
  if (t.includes("security") || t.includes("injection") || t.includes("auth"))
    return 4;
  if (t.includes("crash") || t.includes("data loss") || t.includes("bug")) return 3;
  if (t.includes("performance") || t.includes("slow")) return 2;
  return 1;
}

function scoreIssue(issue) {
  return (
    severityScore(issue?.severity) * 10 +
    impactHint(issue) * 3 -
    effortHint(issue) * 2
  );
}

export function prioritizeIssues(issues = []) {
  const list = Array.isArray(issues) ? issues : [];
  const scored = list
    .map((i) => ({ issue: i, score: scoreIssue(i) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.issue);

  const high_priority = [];
  const medium_priority = [];
  const low_priority = [];

  for (const issue of scored) {
    const sev = String(issue?.severity || "").toLowerCase();
    if (sev === "high") high_priority.push(issue);
    else if (sev === "medium") medium_priority.push(issue);
    else low_priority.push(issue);
  }

  // If everything is low, still bubble top few to medium to create a roadmap.
  if (high_priority.length === 0 && medium_priority.length === 0 && low_priority.length > 0) {
    medium_priority.push(...low_priority.splice(0, Math.min(3, low_priority.length)));
  }

  return { high_priority, medium_priority, low_priority };
}

