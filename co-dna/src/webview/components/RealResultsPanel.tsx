import React from "react";
import { AnalysisResult, Mode, AttachedFile } from "../vscode";

interface Props {
  data: AnalysisResult;
  mode: Mode;
  files: AttachedFile[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

function scoreColor(score: number, inverted = false) {
  // For spaghetti_score: lower is better (inverted)
  // For security_score / complexity_score: higher is better
  const pct = inverted ? 100 - score : score;
  if (pct >= 75) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

function ScoreRing({ label, value, total = 100, inverted = false }: {
  label: string; value: number; total?: number; inverted?: boolean;
}) {
  const color = scoreColor(value, inverted);
  return (
    <div style={s.ring}>
      <div style={{ ...s.ringCircle, borderColor: color }}>
        <span style={{ ...s.ringNum, color }}>{value}</span>
        <span style={s.ringTotal}>/{total}</span>
      </div>
      <span style={s.ringLabel}>{label}</span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={s.metricRow}>
      <span style={s.metricLabel}>{label}</span>
      <span style={s.metricValue}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

// ── Scan Results ───────────────────────────────────────────────────────────
function ScanResults({ data, files }: { data: AnalysisResult; files: AttachedFile[] }) {
  const riskColor = RISK_COLOR[data.risk_level ?? "LOW"] ?? "#22c55e";
  const cm = data.complexity_metrics;

  // Build findings from API data or synthesise from scores
  const findings = data.findings ?? data.debt_items ?? [];

  return (
    <div style={s.panel}>
      {/* File context */}
      {files.length > 0 && (
        <div style={s.fileBar}>
          {files.map((f) => (
            <span key={f.name} style={s.fileChip}>📄 {f.name}</span>
          ))}
        </div>
      )}

      {/* Risk badge */}
      <div style={{ ...s.riskBadge, background: riskColor + "20", borderColor: riskColor + "50", color: riskColor }}>
        <span style={s.riskDot}>●</span>
        Risk Level: <strong>{data.risk_level ?? "—"}</strong>
      </div>

      {/* Score rings */}
      <Section title="Scores">
        <div style={s.rings}>
          {data.spaghetti_score !== undefined && (
            <ScoreRing label="Spaghetti" value={data.spaghetti_score} inverted />
          )}
          {data.security_score !== undefined && (
            <ScoreRing label="Security" value={data.security_score} />
          )}
          {data.complexity_score !== undefined && (
            <ScoreRing label="Complexity" value={data.complexity_score} inverted />
          )}
        </div>
      </Section>

      {/* Complexity metrics */}
      {cm && (
        <Section title="Complexity Metrics">
          <div style={s.card}>
            {cm.lines_of_code !== undefined && (
              <MetricRow label="Lines of Code" value={cm.lines_of_code} />
            )}
            {cm.number_of_functions !== undefined && (
              <MetricRow label="Functions" value={cm.number_of_functions} />
            )}
            {cm.nesting_depth !== undefined && (
              <MetricRow label="Max Nesting Depth" value={cm.nesting_depth} />
            )}
            {cm.cyclomatic_complexity !== undefined && (
              <MetricRow label="Cyclomatic Complexity" value={cm.cyclomatic_complexity} />
            )}
          </div>
        </Section>
      )}

      {/* Dollar impact if present */}
      {data.dollar_impact && (
        <div style={s.impactBanner}>
          💸 Estimated impact: <strong>{data.dollar_impact}</strong>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions && data.suggestions.length > 0 && (
        <Section title="Suggestions">
          <div style={s.card}>
            {data.suggestions.map((s_, i) => (
              <div key={i} style={s.suggestionRow}>
                <span style={s.bullet}>▸</span>
                <span style={s.suggestionText}>{s_}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Structured findings */}
      {findings.length > 0 && (
        <Section title={`${findings.length} Finding${findings.length !== 1 ? "s" : ""}`}>
          {findings.map((f, i) => {
            const sev = (f.severity ?? "medium").toLowerCase();
            const color =
              sev === "critical" ? "#ef4444" :
              sev === "high" ? "#f97316" :
              sev === "medium" ? "#f59e0b" : "#22c55e";
            return (
              <div key={i} style={{ ...s.findingCard, borderLeftColor: color }}>
                <div style={s.findingHeader}>
                  <span style={{ ...s.sevDot, color }}>{f.severity ?? "MEDIUM"}</span>
                  {f.impact && <span style={{ ...s.impactTag, color, background: color + "18" }}>{f.impact}</span>}
                </div>
                {f.title && <p style={s.findingTitle}>{f.title}</p>}
                {f.description && <p style={s.findingDesc}>{f.description}</p>}
                {f.file && (
                  <p style={s.findingFile}>
                    📄 {f.file}{f.line ? `:${f.line}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* Raw unknown fields — show as key/value if backend adds new fields */}
      {(() => {
        const knownKeys = new Set([
          "spaghetti_score","security_score","risk_level","complexity_score",
          "complexity_metrics","findings","debt_items","dollar_impact","suggestions",
          "explanation","modernized_code","modern_code","rewritten_code",
          "translated_code","translated_to","detected_language","warning",
          "purpose","purpose_summary","suggested_language","why_this_language",
          "comparison","alternatives","architecture_diagram","function_flow_diagram",
          "logic_flow_diagram","flowchart","refactor_plan","business_impact",
          "category_summary","prioritized_roadmap","prioritized_action_plan",
          "security_analysis","dependency_analysis","test_coverage",
        ]);
        const extras = Object.entries(data).filter(([k]) => !knownKeys.has(k));
        if (extras.length === 0) return null;
        return (
          <Section title="Additional Data">
            <div style={s.card}>
              {extras.map(([k, v]) => (
                <MetricRow key={k} label={k} value={
                  typeof v === "object" ? JSON.stringify(v) : String(v)
                } />
              ))}
            </div>
          </Section>
        );
      })()}
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
  return <ScanResults data={data} files={files} />;
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