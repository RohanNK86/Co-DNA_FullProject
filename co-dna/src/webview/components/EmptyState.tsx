import React from "react";
import { Mode } from "../vscode";

const CONFIG: Record<Mode, { icon: string; title: string; desc: string; steps: string[] }> = {
  scan: {
    icon: "⚡",
    title: "Full technical-debt audit",
    desc: "Same payload as Postman /analyze-debt: scores, duplication, tests, dependencies, security, threat intel, business impact, prioritized roadmap, Mermaid diagrams, and AI narrative — use the tabs in results.",
    steps: [
      "Open a file or attach code + package.json for dependency signals",
      "Send — Overview shows scores & findings",
      "Switch tabs: Roadmap, Dependencies, Security, Diagrams, AI insight",
    ],
  },
  explain: {
    icon: "💬",
    title: "Explain Your Code",
    desc: "Get a plain-English explanation plus auto-generated Mermaid flow diagrams.",
    steps: [
      "Attach files or use the active editor",
      "Ask a specific question, or just send",
      "Get explanation + function flow diagram",
    ],
  },
  modernize: {
    icon: "✨",
    title: "Modernize Your Code",
    desc: "Upgrade legacy code to modern patterns and best practices.",
    steps: [
      "Attach the files you want modernized",
      "Optionally describe the changes you want",
      "Get a modernized version with a changelog",
    ],
  },
  rewrite: {
    icon: "🔄",
    title: "AI Full Rewrite",
    desc: "Calls POST /rewrite-codebase on your DebtSight backend. Review output before committing.",
    steps: [
      "Attach files or use the active editor",
      "Optionally describe goals in the text box",
      "Get rewritten_code from the API",
    ],
  },
  translate: {
    icon: "🌐",
    title: "Smart translate",
    desc: "Calls POST /translate-code. Set target language in the box or leave empty for Auto.",
    steps: [
      "Attach code or rely on the active editor",
      'Type e.g. "Python" or leave empty for recommended language',
      "Send — get translated_code",
    ],
  },
};

export function EmptyState({ mode }: { mode: Mode }) {
  const cfg = CONFIG[mode];
  return (
    <div style={s.wrap}>
      <div style={s.iconWrap}>
        <span style={s.icon}>{cfg.icon}</span>
      </div>
      <p style={s.title}>{cfg.title}</p>
      <p style={s.desc}>{cfg.desc}</p>
      <div style={s.steps}>
        {cfg.steps.map((step, i) => (
          <div key={i} style={s.stepRow}>
            <span style={s.stepNum}>{i + 1}</span>
            <span style={s.stepText}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "28px 16px", gap: 10, textAlign: "center",
  },
  iconWrap: {
    width: 48, height: 48,
    background: "rgba(249,115,22,0.1)",
    border: "1px solid rgba(249,115,22,0.2)",
    borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 22 },
  title: { fontSize: 13, fontWeight: 700, color: "var(--vscode-foreground)" },
  desc: {
    fontSize: 11, color: "var(--vscode-descriptionForeground)",
    opacity: 0.7, lineHeight: 1.6, maxWidth: 240,
  },
  steps: { display: "flex", flexDirection: "column", gap: 7, width: "100%", marginTop: 6 },
  stepRow: {
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 7, padding: "7px 10px", textAlign: "left",
  },
  stepNum: {
    fontSize: 10, fontWeight: 700, color: "#f97316",
    background: "rgba(249,115,22,0.15)", borderRadius: 4,
    width: 18, height: 18, display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  stepText: { fontSize: 11, color: "var(--vscode-foreground)", opacity: 0.8, lineHeight: 1.5 },
};
