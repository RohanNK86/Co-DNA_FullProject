import React from "react";
import { AnalysisResult, Mode, AttachedFile } from "../vscode";
import { ScanFullReport } from "./ScanFullReport";

interface Props {
  data: AnalysisResult;
  mode: Mode;
  files: AttachedFile[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

// ── Explain Results ────────────────────────────────────────────────────────
function ExplainResults({ data, files }: { data: AnalysisResult; files: AttachedFile[] }) {
  const text = data.explanation
    ?? (typeof data.result === "string" ? data.result : null)
    ?? JSON.stringify(data, null, 2);

  return (
    <div style={s.panel}>
      {files.length > 0 && (
        <div style={s.fileBar}>
          {files.map((f) => (
            <span key={f.name} style={s.fileChip}>📄 {f.name}</span>
          ))}
        </div>
      )}
      <Section title="Explanation">
        <div style={s.explanationBox}>
          <p style={s.explanationText}>{text}</p>
        </div>
      </Section>
    </div>
  );
}

// ── Modernize Results ──────────────────────────────────────────────────────
function ModernizeResults({ data, files }: { data: AnalysisResult; files: AttachedFile[] }) {
  const code = data.modernized_code
    ?? data.modern_code
    ?? (typeof data.result === "string" ? data.result : null)
    ?? JSON.stringify(data, null, 2);

  return (
    <div style={s.panel}>
      {files.length > 0 && (
        <div style={s.fileBar}>
          {files.map((f) => (
            <span key={f.name} style={s.fileChip}>📄 {f.name}</span>
          ))}
        </div>
      )}
      <Section title="Modernized Code">
        <pre style={s.codeBlock}>{code}</pre>
      </Section>
      {data.suggestions && data.suggestions.length > 0 && (
        <Section title="What Changed">
          <div style={s.card}>
            {data.suggestions.map((s_, i) => (
              <div key={i} style={s.suggestionRow}>
                <span style={s.bullet}>✓</span>
                <span style={s.suggestionText}>{s_}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Rewrite (matches POST /rewrite-codebase → rewritten_code) ─────────────
function RewriteResults({ data, files }: { data: AnalysisResult; files: AttachedFile[] }) {
  const code = data.rewritten_code
    ?? (typeof data.result === "string" ? data.result : null)
    ?? JSON.stringify(data, null, 2);

  return (
    <div style={s.panel}>
      {files.length > 0 && (
        <div style={s.fileBar}>
          {files.map((f) => (
            <span key={f.name} style={s.fileChip}>📄 {f.name}</span>
          ))}
        </div>
      )}
      <Section title="Rewritten code">
        <pre style={s.codeBlock}>{code}</pre>
      </Section>
    </div>
  );
}

// ── Translate (POST /translate-code) ───────────────────────────────────────
function TranslateResults({ data, files }: { data: AnalysisResult; files: AttachedFile[] }) {
  const code = data.translated_code ?? "";
  const meta = [
    data.detected_language && `Detected: ${data.detected_language}`,
    data.translated_to && `Target: ${data.translated_to}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div style={s.panel}>
      {files.length > 0 && (
        <div style={s.fileBar}>
          {files.map((f) => (
            <span key={f.name} style={s.fileChip}>📄 {f.name}</span>
          ))}
        </div>
      )}
      {data.warning && (
        <div style={s.impactBanner}>{String(data.warning)}</div>
      )}
      {meta && (
        <p style={{ fontSize: 11, opacity: 0.85, marginBottom: 6 }}>{meta}</p>
      )}
      <Section title="Translated code">
        <pre style={s.codeBlock}>{code}</pre>
      </Section>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export function RealResultsPanel({ data, mode, files }: Props) {
  if (mode === "explain") return <ExplainResults data={data} files={files} />;
  if (mode === "modernize") return <ModernizeResults data={data} files={files} />;
  if (mode === "rewrite") return <RewriteResults data={data} files={files} />;
  if (mode === "translate") return <TranslateResults data={data} files={files} />;
  return <ScanFullReport data={data} files={files} />;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  panel: { display: "flex", flexDirection: "column", gap: 10 },
  fileBar: { display: "flex", flexWrap: "wrap", gap: 5 },
  fileChip: {
    fontSize: 10, padding: "2px 7px", borderRadius: 5,
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #444)",
    color: "var(--vscode-descriptionForeground)",
  },
  riskBadge: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, padding: "6px 10px",
    borderRadius: 8, border: "1px solid",
  },
  riskDot: { fontSize: 8 },
  section: { display: "flex", flexDirection: "column", gap: 6 },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    color: "var(--vscode-descriptionForeground)", opacity: 0.55,
  },
  rings: { display: "flex", gap: 12, flexWrap: "wrap" as const },
  ring: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  ringCircle: {
    width: 54, height: 54, borderRadius: "50%",
    border: "2.5px solid", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center",
  },
  ringNum: { fontSize: 17, fontWeight: 700, lineHeight: 1 },
  ringTotal: { fontSize: 9, opacity: 0.4 },
  ringLabel: { fontSize: 10, color: "var(--vscode-descriptionForeground)", textAlign: "center" as const },
  card: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8, padding: "8px 12px",
    display: "flex", flexDirection: "column", gap: 6,
  },
  metricRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { fontSize: 11, color: "var(--vscode-descriptionForeground)", opacity: 0.7 },
  metricValue: { fontSize: 12, fontWeight: 600, color: "var(--vscode-foreground)" },
  impactBanner: {
    fontSize: 12, padding: "7px 10px", borderRadius: 7,
    background: "rgba(249,115,22,0.1)",
    border: "1px solid rgba(249,115,22,0.25)",
    color: "#f97316",
  },
  suggestionRow: { display: "flex", gap: 7, alignItems: "flex-start" },
  bullet: { fontSize: 10, color: "#f97316", marginTop: 2, flexShrink: 0 },
  suggestionText: { fontSize: 11, lineHeight: 1.55, color: "var(--vscode-foreground)", opacity: 0.85 },
  findingCard: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderLeft: "3px solid",
    borderRadius: 7, padding: "8px 10px",
    display: "flex", flexDirection: "column", gap: 4, marginBottom: 4,
  },
  findingHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sevDot: { fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" },
  impactTag: { fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4 },
  findingTitle: { fontSize: 12, fontWeight: 500, color: "var(--vscode-foreground)" },
  findingDesc: { fontSize: 11, color: "var(--vscode-descriptionForeground)", lineHeight: 1.5, opacity: 0.8 },
  findingFile: { fontSize: 10, color: "var(--vscode-descriptionForeground)", opacity: 0.5 },
  explanationBox: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8, padding: "10px 12px",
  },
  explanationText: { fontSize: 12, lineHeight: 1.7, color: "var(--vscode-foreground)", opacity: 0.88 },
  codeBlock: {
    fontSize: 11, lineHeight: 1.6, padding: "10px 12px",
    background: "var(--vscode-textBlockQuote-background, #1e1e1e)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8, overflowX: "auto" as const,
    fontFamily: "var(--vscode-editor-font-family, monospace)",
    color: "var(--vscode-foreground)", whiteSpace: "pre" as const,
  },
};