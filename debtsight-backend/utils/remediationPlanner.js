function normalizeSeverity(sev) {
  const s = String(sev || "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "low";
}

export function categorizeIssue(issue = {}) {
  const t = `${issue?.title || ""} ${issue?.details || ""}`.toLowerCase();
  if (
    t.includes("dependency") ||
    t.includes("vulnerab") ||
    t.includes("package") ||
    t.includes("supply chain")
  ) {
    return "dependency_risk";
  }
  if (
    t.includes("test") ||
    t.includes("coverage") ||
    t.includes("spec") ||
    t.includes("assert")
  ) {
    return "testing";
  }
  if (
    t.includes("coupling") ||
    t.includes("modular") ||
    t.includes("architecture") ||
    t.includes("global state")
  ) {
    return "architecture";
  }
  return "code_quality";
}

function estimateItemEffortHours(issue = {}) {
  const sev = normalizeSeverity(issue?.severity);
  const base = sev === "high" ? 8 : sev === "medium" ? 4 : 2;
  const text = `${issue?.title || ""} ${issue?.details || ""}`.toLowerCase();

  let multiplier = 1;
  if (text.includes("refactor") || text.includes("coupling")) multiplier += 0.6;
  if (text.includes("duplicate") || text.includes("long function")) multiplier += 0.3;
  if (text.includes("security") || text.includes("injection")) multiplier += 0.5;

  const hours = Math.round(base * multiplier * 2) / 2;
  return Math.max(1, hours);
}

export function buildPrioritizedActionPlan({
  prioritized_roadmap,
  hourly_rate = 50,
} = {}) {
  const roadmap = prioritized_roadmap || {
    high_priority: [],
    medium_priority: [],
    low_priority: [],
  };

  const ordered = [
    ...(roadmap.high_priority || []).map((x) => ({ ...x, priority: "high" })),
    ...(roadmap.medium_priority || []).map((x) => ({ ...x, priority: "medium" })),
    ...(roadmap.low_priority || []).map((x) => ({ ...x, priority: "low" })),
  ];

  return ordered.map((issue, idx) => {
    const category = categorizeIssue(issue);
    const estimated_effort_hours = estimateItemEffortHours(issue);
    const estimated_cost = Math.round(estimated_effort_hours * hourly_rate);
    return {
      id: `item-${idx + 1}`,
      title: issue?.title || "Untitled issue",
      category,
      severity: normalizeSeverity(issue?.severity),
      priority: issue?.priority || "low",
      estimated_effort_hours,
      estimated_cost,
      location: issue?.location || "",
      details: issue?.details || "",
    };
  });
}

export function buildCategorySummary({ issues = [], dependency_analysis, test_coverage } = {}) {
  const summary = {
    code_quality: 0,
    dependency_risk: 0,
    architecture: 0,
    testing: 0,
  };

  for (const issue of issues) {
    summary[categorizeIssue(issue)] += 1;
  }

  // Add explicit testing/dependency indicators even when AI/issues are sparse.
  if ((dependency_analysis?.outdated_dependencies || []).length > 0) summary.dependency_risk += 1;
  if ((dependency_analysis?.vulnerable_dependencies || []).length > 0) summary.dependency_risk += 1;
  if (Number(test_coverage?.coverage_estimate ?? 0) < 40) summary.testing += 1;

  return summary;
}

