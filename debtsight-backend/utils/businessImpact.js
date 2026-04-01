function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function computeBusinessImpact({
  complexity_score,
  issues,
  duplication_percentage,
} = {}) {
  const cScore = Number(complexity_score ?? 0);
  const issuesCount = Array.isArray(issues) ? issues.length : 0;
  const dup = Number(duplication_percentage ?? 0);

  // Realistic, explainable effort estimate (hours).
  let effort_hours = cScore * 0.5 + issuesCount * 1.5 + dup * 0.2;
  effort_hours = clamp(Math.round(effort_hours * 2) / 2, 0, 500);

  const hourly_rate = Number(process.env.HOURLY_RATE || 50);
  const estimated_cost = Math.round(effort_hours * hourly_rate);

  let severity = "Low";
  if (effort_hours > 20) severity = "High";
  else if (effort_hours >= 10) severity = "Medium";

  return {
    estimated_effort_hours: effort_hours,
    estimated_cost,
    severity,
    hourly_rate,
  };
}

