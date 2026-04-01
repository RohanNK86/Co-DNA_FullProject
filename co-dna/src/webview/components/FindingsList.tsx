import React, { useState } from "react";

export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  file: string;
  line?: number;
  impact: string;   // e.g. "$3K/yr"
  description: string;
}

const SEV_CONFIG: Record<Severity, { color: string; dot: string }> = {
  critical: { color: "#ef4444", dot: "🔴" },
  high:     { color: "#f97316", dot: "🟠" },
  medium:   { color: "#f59e0b", dot: "🟡" },
  low:      { color: "#22c55e", dot: "🟢" },
};

function FindingRow({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const { color, dot } = SEV_CONFIG[finding.severity];

  return (
    <div style={styles.row} onClick={() => setExpanded((e) => !e)}>
      <div style={styles.rowHeader}>
        <span style={styles.dot}>{dot}</span>
        <div style={styles.rowMain}>
          <span style={styles.rowTitle}>{finding.title}</span>
          <span style={styles.rowFile}>
            {finding.file}{finding.line ? `:${finding.line}` : ""}
          </span>
        </div>
        <span style={{ ...styles.impactBadge, color, background: color + "18" }}>
          {finding.impact}
        </span>
        <span style={styles.chevron}>{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && (
        <div style={styles.description}>{finding.description}</div>
      )}
    </div>
  );
}

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return null;

  return (
    <div style={styles.wrap}>
      <p style={styles.header}>
        {findings.length} finding{findings.length !== 1 ? "s" : ""}
      </p>
      {findings.map((f) => (
        <FindingRow key={f.id} finding={f} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  header: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "var(--vscode-descriptionForeground)",
    opacity: 0.55,
    marginBottom: 2,
  },
  row: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    transition: "border-color 0.12s",
  },
  rowHeader: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  dot: { fontSize: 10, flexShrink: 0 },
  rowMain: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--vscode-foreground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  rowFile: {
    fontSize: 10,
    color: "var(--vscode-descriptionForeground)",
    opacity: 0.6,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  impactBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
    flexShrink: 0,
  },
  chevron: {
    fontSize: 10,
    opacity: 0.4,
    flexShrink: 0,
  },
  description: {
    marginTop: 7,
    fontSize: 11,
    color: "var(--vscode-descriptionForeground)",
    lineHeight: 1.55,
    paddingLeft: 18,
    opacity: 0.8,
  },
};