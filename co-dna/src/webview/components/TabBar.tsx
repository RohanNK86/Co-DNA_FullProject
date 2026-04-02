import React from "react";
import { Mode } from "../vscode";

interface TabBarProps {
  active: Mode;
  onChange: (mode: Mode) => void;
}

const TABS: { id: Mode; label: string; icon: string; hint: string }[] = [
  { id: "scan", label: "Scan", icon: "⚡", hint: "Full audit: roadmap, deps, security, diagrams (same as /analyze-debt)" },
  { id: "explain", label: "Explain", icon: "💬", hint: "Plain-English explanation (/explain-code)" },
  { id: "modernize", label: "Modernize", icon: "✨", hint: "Modernize patterns (/modernize-code)" },
  { id: "rewrite", label: "Rewrite", icon: "🔄", hint: "AI codebase rewrite (/rewrite-codebase)" },
  { id: "translate", label: "Translate", icon: "🌐", hint: "Translate + language advisor (/translate-code)" },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div style={styles.wrap}>
      {TABS.map((t) => (
        <button
          key={t.id}
          style={{
            ...styles.tab,
            ...(active === t.id ? styles.tabActive : {}),
          }}
          onClick={() => onChange(t.id)}
          title={t.hint}
        >
          <span style={styles.tabIcon}>{t.icon}</span>
          <span style={styles.tabLabel}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", gap: 3 },
  tab: {
    flex: 1, padding: "5px 4px",
    fontSize: 10, fontWeight: 600,
    letterSpacing: "0.03em",
    textAlign: "center" as const,
    cursor: "pointer", borderRadius: 6,
    color: "var(--vscode-descriptionForeground)",
    background: "transparent",
    border: "1px solid transparent",
    textTransform: "uppercase" as const,
    transition: "all 0.15s ease",
    outline: "none",
    display: "flex", flexDirection: "column" as const,
    alignItems: "center", gap: 2,
  },
  tabIcon: { fontSize: 14 },
  tabLabel: {},
  tabActive: {
    color: "#f97316",
    background: "rgba(249, 115, 22, 0.12)",
    border: "1px solid rgba(249, 115, 22, 0.28)",
  },
};
