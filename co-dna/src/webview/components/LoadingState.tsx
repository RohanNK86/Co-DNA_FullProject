import React, { useEffect, useState } from "react";

const MESSAGES = [
  "Parsing AST structure…",
  "Calculating cyclomatic complexity…",
  "Scanning for debt patterns…",
  "Running security checks…",
  "Scoring your codebase…",
];

export function LoadingState({ fileName }: { fileName: string }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={s.wrap}>
      <div style={s.spinner} />
      <p style={s.file}>📄 {fileName}</p>
      <p style={s.msg}>{MESSAGES[msgIdx]}</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    height: "100%", gap: 12, padding: 24, textAlign: "center",
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid var(--vscode-panel-border, #444)",
    borderTopColor: "#f97316",
    animation: "spin 0.8s linear infinite",
  },
  file: { fontSize: 11, color: "var(--vscode-foreground)", opacity: 0.6 },
  msg: { fontSize: 11, color: "var(--vscode-descriptionForeground)", opacity: 0.45 },
};

// Inject keyframe once
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}