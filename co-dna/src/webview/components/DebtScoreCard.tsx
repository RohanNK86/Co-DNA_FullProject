import React from "react";

export interface DebtScore {
  score: number;          // 0–100 (lower = more debt)
  complexity: number;
  duplication: number;
  coupling: number;
  dependencies: number;
  dollarImpact: string;   // e.g. "$18K/yr"
}

const SEVERITY = (s: number) =>
  s >= 75 ? { label: "Healthy", color: "#22c55e" }
  : s >= 50 ? { label: "Moderate", color: "#f59e0b" }
  : { label: "Critical", color: "#ef4444" };

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={styles.barTrack}>
      <div style={{ ...styles.barFill, width: `${value}%`, background: color }} />
    </div>
  );
}

export function DebtScoreCard({ score }: { score: DebtScore }) {
  const sev = SEVERITY(score.score);
  const categories = [
    { label: "Complexity",    value: score.complexity },
    { label: "Duplication",   value: score.duplication },
    { label: "Coupling",      value: score.coupling },
    { label: "Dependencies",  value: score.dependencies },
  ];

  return (
    <div style={styles.card}>
      {/* Score ring row */}
      <div style={styles.scoreRow}>
        <div style={styles.scoreCircle}>
          <span style={{ ...styles.scoreNum, color: sev.color }}>
            {score.score}
          </span>
          <span style={styles.scoreOf}>/100</span>
        </div>
        <div style={styles.scoreMeta}>
          <span style={{ ...styles.severityBadge, background: sev.color + "22", color: sev.color }}>
            {sev.label}
          </span>
          <p style={styles.impact}>
            Est. impact <strong>{score.dollarImpact}</strong>
          </p>
        </div>
      </div>

      {/* Category bars */}
      <div style={styles.categories}>
        {categories.map((c) => (
          <div key={c.label} style={styles.catRow}>
            <span style={styles.catLabel}>{c.label}</span>
            <MiniBar value={c.value} color={sev.color} />
            <span style={styles.catValue}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "2px solid var(--vscode-panel-border, #444)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  scoreOf: {
    fontSize: 9,
    opacity: 0.4,
    marginTop: 1,
  },
  scoreMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  severityBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "2px 8px",
    borderRadius: 4,
    textTransform: "uppercase" as const,
    width: "fit-content",
  },
  impact: {
    fontSize: 11,
    color: "var(--vscode-descriptionForeground)",
    opacity: 0.7,
  },
  categories: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  catRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  catLabel: {
    fontSize: 10,
    width: 80,
    flexShrink: 0,
    color: "var(--vscode-descriptionForeground)",
  },
  barTrack: {
    flex: 1,
    height: 4,
    background: "var(--vscode-panel-border, #333)",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.4s ease",
  },
  catValue: {
    fontSize: 10,
    width: 24,
    textAlign: "right" as const,
    color: "var(--vscode-descriptionForeground)",
    flexShrink: 0,
  },
};