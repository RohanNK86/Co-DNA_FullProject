import React, { useState } from "react";
import { AnalysisResult, AttachedFile } from "../vscode";

type ScanSection =
  | "overview"
  | "roadmap"
  | "deps"
  | "security"
  | "diagrams"
  | "insight";

const SECTIONS: { id: ScanSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "roadmap", label: "Roadmap" },
  { id: "deps", label: "Dependencies" },
  { id: "security", label: "Security" },
  { id: "diagrams", label: "Diagrams" },
  { id: "insight", label: "AI insight" },
];

const RISK_COLOR: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

function scoreColor(score: number, inverted = false) {
  const pct = inverted ? 100 - score : score;
  if (pct >= 75) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

function ScoreRing({
  label,
  value,
  total = 100,
  inverted = false,
}: {
  label: string;
  value: number;
  total?: number;
  inverted?: boolean;
}) {
  const color = scoreColor(value, inverted);
  return (
    <div style={st.ring}>
      <div style={{ ...st.ringCircle, borderColor: color }}>
        <span style={{ ...st.ringNum, color }}>{value}</span>
        <span style={st.ringTotal}>/{total}</span>
      </div>
      <span style={st.ringLabel}>{label}</span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={st.metricRow}>
      <span style={st.metricLabel}>{label}</span>
      <span style={st.metricValue}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={st.section}>
      <p style={st.sectionTitle}>{title}</p>
      {children}
    </div>
  );
}

function CategoryChips({ summary }: { summary: Record<string, number> | undefined }) {
  if (!summary || typeof summary !== "object") return null;
  const entries = Object.entries(summary).filter(([, n]) => Number(n) > 0);
  if (entries.length === 0) return null;
  const labels: Record<string, string> = {
    code_quality: "Code quality",
    dependency_risk: "Dependencies",
    architecture: "Architecture",
    testing: "Testing",
  };
  return (
    <div style={st.chipRow}>
      {entries.map(([k, n]) => (
        <span key={k} style={st.catChip}>
          {labels[k] ?? k}: <strong>{n}</strong>
        </span>
      ))}
    </div>
  );
}

function RoadmapList({
  plan,
}: {
  plan: Array<Record<string, unknown>> | undefined;
}) {
  if (!Array.isArray(plan) || plan.length === 0) {
    return <p style={st.muted}>No prioritized items returned yet. Run a scan with richer code or package.json attached.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {plan.map((item, i) => {
        const title = String(item.title ?? `Item ${i + 1}`);
        const cat = String(item.category ?? "");
        const sev = String(item.severity ?? "");
        const pri = String(item.priority ?? "");
        const hours = item.estimated_effort_hours;
        const cost = item.estimated_cost;
        const details = String(item.details ?? "");
        const loc = String(item.location ?? "");
        return (
          <div key={String(item.id ?? i)} style={st.planCard}>
            <div style={st.planHead}>
              <span style={st.planIdx}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={st.planTitle}>{title}</p>
                <div style={st.planMeta}>
                  {cat && <span style={st.pill}>{cat.replace(/_/g, " ")}</span>}
                  {sev && <span style={st.pill}>{sev}</span>}
                  {pri && <span style={st.pillOutline}>{pri} priority</span>}
                </div>
              </div>
            </div>
            {(hours !== undefined || cost !== undefined) && (
              <p style={st.planEffort}>
                {hours !== undefined && <>~{String(hours)} h</>}
                {hours !== undefined && cost !== undefined && " · "}
                {cost !== undefined && <>~${String(cost)} est.</>}
              </p>
            )}
            {details ? <p style={st.planDetails}>{details}</p> : null}
            {loc ? <p style={st.planLoc}>📍 {loc}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function PriorityBucket({
  label,
  items,
  color,
}: {
  label: string;
  items: unknown[] | undefined;
  color: string;
}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={st.bucket}>
      <p style={{ ...st.bucketTitle, color }}>{label} ({items.length})</p>
      <ul style={st.bucketList}>
        {items.map((raw, i) => {
          const it = raw as Record<string, unknown>;
          return (
            <li key={i} style={st.bucketLi}>
              <strong>{String(it.title ?? "Issue")}</strong>
              {it.details ? <span style={st.muted}> — {String(it.details)}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DepTable({
  title,
  rows,
  cols,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  cols: { key: string; label: string }[];
}) {
  if (!rows.length) return null;
  return (
    <Section title={title}>
      <div style={st.table}>
        {rows.map((row, i) => (
          <div key={i} style={st.tableRow}>
            {cols.map((c) => (
              <div key={c.key} style={st.tableCell}>
                <span style={st.tableLabel}>{c.label}</span>
                <span style={st.tableVal}>{String(row[c.key] ?? "—")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

function SecurityFixCard({
  fix,
  i,
}: {
  fix: Record<string, unknown>;
  i: number;
}) {
  const steps = Array.isArray(fix.steps) ? fix.steps : [];
  return (
    <div style={st.fixCard}>
      <p style={st.fixTitle}>
        {String(fix.title ?? `Fix ${i + 1}`)}{" "}
        {fix.severity ? (
          <span style={st.pill}>{String(fix.severity)}</span>
        ) : null}
      </p>
      {steps.length > 0 && (
        <ol style={st.fixSteps}>
          {steps.map((s, j) => (
            <li key={j}>{String(s)}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MermaidBlock({ title, source }: { title: string; source: string }) {
  const t = String(source || "").trim();
  if (!t) return null;
  return (
    <Section title={title}>
      <p style={st.hint}>Mermaid source — paste into <a href="https://mermaid.live" style={st.link}>mermaid.live</a> to render.</p>
      <pre style={st.mermaidPre}>{t}</pre>
    </Section>
  );
}

/** Keys we render explicitly; anything else shows once under Overview. */
const RENDERED_KEYS = new Set([
  "spaghetti_score",
  "security_score",
  "risk_level",
  "complexity_score",
  "complexity_metrics",
  "findings",
  "debt_items",
  "issues",
  "dollar_impact",
  "suggestions",
  "duplication_percentage",
  "dependency_risk",
  "test_coverage",
  "business_impact",
  "category_summary",
  "prioritized_roadmap",
  "prioritized_action_plan",
  "security_analysis",
  "dependency_analysis",
  "threat_intelligence",
  "dependency_suggestions",
  "security_fixes",
  "explanation",
  "refactor_plan",
  "function_map",
  "architecture_diagram",
  "function_flow_diagram",
  "logic_flow_diagram",
  "flowchart",
  "rewritten_code_option",
  "modernized_code",
  "modern_code",
  "translated_code",
]);

export function ScanFullReport({
  data,
  files,
}: {
  data: AnalysisResult;
  files: AttachedFile[];
}) {
  const [section, setSection] = useState<ScanSection>("overview");
  const riskColor = RISK_COLOR[data.risk_level ?? "LOW"] ?? "#22c55e";
  const cm = data.complexity_metrics as Record<string, number> | undefined;
  const findings = data.findings ?? data.debt_items ?? [];
  const testCov = data.test_coverage as Record<string, unknown> | undefined;
  const dep = data.dependency_analysis as Record<string, unknown> | undefined;
  const biz = data.business_impact as Record<string, unknown> | undefined;
  const catSum = data.category_summary as Record<string, number> | undefined;
  const plan = data.prioritized_action_plan as Array<Record<string, unknown>> | undefined;
  const roadmap = data.prioritized_roadmap as
    | { high_priority?: unknown[]; medium_priority?: unknown[]; low_priority?: unknown[] }
    | undefined;
  const sec = data.security_analysis as Record<string, unknown> | undefined;
  const threat = data.threat_intelligence as Record<string, unknown> | undefined;
  const fixes = data.security_fixes as Array<Record<string, unknown>> | undefined;
  const depSug = data.dependency_suggestions;
  const refactorPlan = data.refactor_plan;
  const fnMap = data.function_map;
  const extras = Object.entries(data).filter(([k]) => !RENDERED_KEYS.has(k));

  const outdated = (dep?.outdated_dependencies as Array<Record<string, unknown>>) ?? [];
  const vulnerable = (dep?.vulnerable_dependencies as Array<Record<string, unknown>>) ?? [];
  const threatAlerts = (threat?.threat_alerts as Array<Record<string, unknown>>) ?? [];
  const risky = (sec?.risky_patterns as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={st.panel}>
      {files.length > 0 && (
        <div style={st.fileBar}>
          {files.map((f) => (
            <span key={f.name} style={st.fileChip}>
              📄 {f.name}
            </span>
          ))}
        </div>
      )}

      <div style={st.subNav}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            style={{
              ...st.subTab,
              ...(section === s.id ? st.subTabOn : {}),
            }}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <>
          <div
            style={{
              ...st.riskBadge,
              background: riskColor + "20",
              borderColor: riskColor + "50",
              color: riskColor,
            }}
          >
            <span style={st.riskDot}>●</span>
            Risk: <strong>{String(data.risk_level ?? "—")}</strong>
            {data.dependency_risk != null && String(data.dependency_risk) !== "" ? (
              <span style={{ marginLeft: 8, opacity: 0.9 }}>
                · Deps: <strong>{String(data.dependency_risk)}</strong>
              </span>
            ) : null}
          </div>

          <Section title="Scores">
            <div style={st.rings}>
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

          {data.duplication_percentage !== undefined && (
            <Section title="Duplication">
              <div style={st.card}>
                <MetricRow
                  label="Estimated duplication"
                  value={`${data.duplication_percentage}%`}
                />
              </div>
            </Section>
          )}

          {testCov && (
            <Section title="Test coverage signal">
              <div style={st.card}>
                <MetricRow label="Has tests" value={testCov.has_tests ? "Yes" : "No"} />
                {testCov.coverage_estimate !== undefined && (
                  <MetricRow
                    label="Coverage estimate"
                    value={`${testCov.coverage_estimate}%`}
                  />
                )}
                {testCov.test_files_count !== undefined && (
                  <MetricRow label="Test files (workspace)" value={Number(testCov.test_files_count)} />
                )}
                {testCov.code_files_count !== undefined && (
                  <MetricRow label="Code files (workspace)" value={Number(testCov.code_files_count)} />
                )}
              </div>
            </Section>
          )}

          {cm && (
            <Section title="Complexity metrics">
              <div style={st.card}>
                {cm.lines_of_code !== undefined && (
                  <MetricRow label="Lines of code" value={cm.lines_of_code} />
                )}
                {cm.number_of_functions !== undefined && (
                  <MetricRow label="Functions" value={cm.number_of_functions} />
                )}
                {cm.nesting_depth !== undefined && (
                  <MetricRow label="Max nesting" value={cm.nesting_depth} />
                )}
                {cm.cyclomatic_complexity !== undefined && (
                  <MetricRow label="Cyclomatic complexity" value={cm.cyclomatic_complexity} />
                )}
              </div>
            </Section>
          )}

          <Section title="Issue categories">
            <CategoryChips summary={catSum} />
            {!catSum || Object.keys(catSum).length === 0 ? (
              <p style={st.muted}>Categories appear when issues are detected.</p>
            ) : null}
          </Section>

          {biz && (
            <Section title="Business impact (rollup)">
              <div style={st.card}>
                {biz.estimated_effort_hours !== undefined && (
                  <MetricRow label="Est. effort" value={`${biz.estimated_effort_hours} h`} />
                )}
                {biz.estimated_cost !== undefined && (
                  <MetricRow label="Est. cost" value={`$${biz.estimated_cost}`} />
                )}
                {biz.severity !== undefined && (
                  <MetricRow label="Severity band" value={String(biz.severity)} />
                )}
              </div>
            </Section>
          )}

          {data.dollar_impact && (
            <div style={st.impactBanner}>
              💸 {data.dollar_impact}
            </div>
          )}

          {data.suggestions && data.suggestions.length > 0 && (
            <Section title="Suggestions">
              <div style={st.card}>
                {data.suggestions.map((s_, i) => (
                  <div key={i} style={st.suggestionRow}>
                    <span style={st.bullet}>▸</span>
                    <span style={st.suggestionText}>{s_}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {findings.length > 0 && (
            <Section title={`Findings (${findings.length})`}>
              {findings.map((f, i) => {
                const sev = (f.severity ?? "medium").toLowerCase();
                const color =
                  sev === "critical"
                    ? "#ef4444"
                    : sev === "high"
                      ? "#f97316"
                      : sev === "medium"
                        ? "#f59e0b"
                        : "#22c55e";
                return (
                  <div key={i} style={{ ...st.findingCard, borderLeftColor: color }}>
                    <div style={st.findingHeader}>
                      <span style={{ ...st.sevDot, color }}>{f.severity ?? "MEDIUM"}</span>
                      {f.impact && (
                        <span style={{ ...st.impactTag, color, background: color + "18" }}>
                          {f.impact}
                        </span>
                      )}
                    </div>
                    {f.title && <p style={st.findingTitle}>{f.title}</p>}
                    {f.description && <p style={st.findingDesc}>{f.description}</p>}
                    {f.file && (
                      <p style={st.findingFile}>
                        📄 {f.file}
                        {f.line ? `:${f.line}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {extras.length > 0 && (
            <Section title="Other fields">
              <div style={st.card}>
                {extras.map(([k, v]) => (
                  <MetricRow
                    key={k}
                    label={k}
                    value={typeof v === "object" ? JSON.stringify(v) : String(v)}
                  />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {section === "roadmap" && (
        <>
          <Section title="Prioritized remediation (effort & cost)">
            <RoadmapList plan={plan} />
          </Section>
          <Section title="By priority bucket">
            <PriorityBucket
              label="High"
              items={roadmap?.high_priority}
              color="#ef4444"
            />
            <PriorityBucket
              label="Medium"
              items={roadmap?.medium_priority}
              color="#f59e0b"
            />
            <PriorityBucket label="Low" items={roadmap?.low_priority} color="#94a3b8" />
            {!roadmap?.high_priority?.length &&
            !roadmap?.medium_priority?.length &&
            !roadmap?.low_priority?.length ? (
              <p style={st.muted}>No roadmap buckets in this response.</p>
            ) : null}
          </Section>
        </>
      )}

      {section === "deps" && (
        <>
          {dep && (
            <Section title="Dependency summary">
              <div style={st.card}>
                <MetricRow
                  label="package.json used"
                  value={dep.provided ? "Yes" : "No — attach package.json for full analysis"}
                />
                <MetricRow
                  label="Total dependencies"
                  value={Number(dep.number_of_dependencies ?? 0)}
                />
                <MetricRow label="Risk level" value={String(dep.dependency_risk ?? "—")} />
              </div>
            </Section>
          )}
          <DepTable
            title="Outdated / unpinned"
            rows={outdated}
            cols={[
              { key: "name", label: "Package" },
              { key: "current", label: "Version" },
              { key: "reason", label: "Note" },
            ]}
          />
          <DepTable
            title="Vulnerable (advisory signals)"
            rows={vulnerable}
            cols={[
              { key: "name", label: "Package" },
              { key: "current", label: "Version" },
              { key: "severity", label: "Severity" },
              { key: "advisory", label: "Advisory" },
            ]}
          />
          {Array.isArray(depSug) && depSug.length > 0 && (
            <Section title="Dependency suggestions">
              <div style={st.card}>
                {depSug.map((x, i) => {
                  if (typeof x === "string") {
                    return <p key={i} style={st.suggestionText}>{x}</p>;
                  }
                  const o = x as Record<string, unknown>;
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <p style={st.planTitle}>
                        {String(o.current ?? "?")} → <strong>{String(o.suggested ?? "?")}</strong>
                      </p>
                      {o.reason ? <p style={st.planDetails}>{String(o.reason)}</p> : null}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
          {!dep && <p style={st.muted}>No dependency_analysis in response.</p>}
        </>
      )}

      {section === "security" && (
        <>
          {sec && (
            <Section title="Security backtest">
              <div style={st.card}>
                {sec.security_score !== undefined && (
                  <MetricRow label="Composite security score" value={Number(sec.security_score)} />
                )}
              </div>
            </Section>
          )}
          {risky.length > 0 && (
            <Section title="Risky patterns">
              {risky.map((r, i) => (
                <div key={i} style={st.findingCard}>
                  <p style={st.findingTitle}>{String(r.type ?? "pattern")}</p>
                  <p style={st.findingDesc}>{String(r.details ?? "")}</p>
                  <p style={st.findingFile}>{String(r.location ?? "")}</p>
                </div>
              ))}
            </Section>
          )}
          {threatAlerts.length > 0 && (
            <Section title="Threat intelligence alerts">
              {threatAlerts.map((a, i) => (
                <div key={i} style={st.planCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <p style={st.planTitle}>{String(a.title ?? "Alert")}</p>
                    {a.severity ? <span style={st.pill}>{String(a.severity)}</span> : null}
                  </div>
                  {a.example ? <p style={st.muted}>{String(a.example)}</p> : null}
                  {a.why ? <p style={st.planDetails}>{String(a.why)}</p> : null}
                </div>
              ))}
            </Section>
          )}
          {fixes && fixes.length > 0 && (
            <Section title="Recommended security fixes">
              {fixes.map((f, i) => (
                <SecurityFixCard key={i} fix={f} i={i} />
              ))}
            </Section>
          )}
          {!sec && !fixes?.length && !threatAlerts.length ? (
            <p style={st.muted}>No security section in this response.</p>
          ) : null}
        </>
      )}

      {section === "diagrams" && (
        <>
          <MermaidBlock title="Architecture" source={String(data.architecture_diagram ?? "")} />
          <MermaidBlock title="Function flow" source={String(data.function_flow_diagram ?? "")} />
          <MermaidBlock title="Logic flow" source={String(data.logic_flow_diagram ?? data.flowchart ?? "")} />
          {!String(data.architecture_diagram ?? "").trim() &&
            !String(data.function_flow_diagram ?? "").trim() &&
            !String(data.logic_flow_diagram ?? data.flowchart ?? "").trim() && (
              <p style={st.muted}>No Mermaid diagrams in this response (AI may be offline or returned empty).</p>
            )}
        </>
      )}

      {section === "insight" && (
        <>
          {data.explanation && (
            <Section title="Narrative explanation">
              <div style={st.explanationBox}>
                <p style={st.explanationText}>{String(data.explanation)}</p>
              </div>
            </Section>
          )}
          {Array.isArray(refactorPlan) && refactorPlan.length > 0 && (
            <Section title="Refactor plan (AI)">
              <div style={st.card}>
                {refactorPlan.map((step, i) => (
                  <div key={i} style={st.suggestionRow}>
                    <span style={st.bullet}>{i + 1}.</span>
                    <span style={st.suggestionText}>
                      {typeof step === "string" ? step : JSON.stringify(step)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {Array.isArray(fnMap) && fnMap.length > 0 && (
            <Section title="Function map">
              <div style={st.card}>
                {fnMap.map((row, i) => (
                  <p key={i} style={st.suggestionText}>
                    {typeof row === "string" ? row : JSON.stringify(row)}
                  </p>
                ))}
              </div>
            </Section>
          )}
          {!data.explanation &&
            !(Array.isArray(refactorPlan) && refactorPlan.length) &&
            !(Array.isArray(fnMap) && fnMap.length) && (
              <p style={st.muted}>No AI narrative in this response.</p>
            )}
        </>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  panel: { display: "flex", flexDirection: "column", gap: 10 },
  subNav: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  subTab: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid var(--vscode-panel-border, #444)",
    background: "transparent",
    color: "var(--vscode-descriptionForeground)",
    cursor: "pointer",
  },
  subTabOn: {
    color: "#f97316",
    borderColor: "rgba(249,115,22,0.45)",
    background: "rgba(249,115,22,0.1)",
  },
  fileBar: { display: "flex", flexWrap: "wrap", gap: 5 },
  fileChip: {
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 5,
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #444)",
    color: "var(--vscode-descriptionForeground)",
  },
  riskBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid",
    flexWrap: "wrap",
  },
  riskDot: { fontSize: 8 },
  section: { display: "flex", flexDirection: "column", gap: 6 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    color: "var(--vscode-descriptionForeground)",
    opacity: 0.55,
  },
  rings: { display: "flex", gap: 12, flexWrap: "wrap" as const },
  ring: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  ringCircle: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    border: "2.5px solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  ringNum: { fontSize: 17, fontWeight: 700, lineHeight: 1 },
  ringTotal: { fontSize: 9, opacity: 0.4 },
  ringLabel: {
    fontSize: 10,
    color: "var(--vscode-descriptionForeground)",
    textAlign: "center" as const,
  },
  card: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8,
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  metricRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { fontSize: 11, color: "var(--vscode-descriptionForeground)", opacity: 0.7 },
  metricValue: { fontSize: 12, fontWeight: 600, color: "var(--vscode-foreground)" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  catChip: {
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 6,
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #444)",
  },
  impactBanner: {
    fontSize: 12,
    padding: "7px 10px",
    borderRadius: 7,
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
    borderRadius: 7,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 4,
  },
  findingHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sevDot: { fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" },
  impactTag: { fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4 },
  findingTitle: { fontSize: 12, fontWeight: 500, color: "var(--vscode-foreground)" },
  findingDesc: { fontSize: 11, color: "var(--vscode-descriptionForeground)", lineHeight: 1.5, opacity: 0.8 },
  findingFile: { fontSize: 10, color: "var(--vscode-descriptionForeground)", opacity: 0.5 },
  muted: { fontSize: 11, color: "var(--vscode-descriptionForeground)", opacity: 0.65, lineHeight: 1.5 },
  planCard: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8,
    padding: "8px 10px",
  },
  planHead: { display: "flex", gap: 8, alignItems: "flex-start" },
  planIdx: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "rgba(249,115,22,0.2)",
    color: "#f97316",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  planTitle: { fontSize: 12, fontWeight: 600, color: "var(--vscode-foreground)" },
  planMeta: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 },
  pill: {
    fontSize: 9,
    textTransform: "uppercase" as const,
    padding: "2px 6px",
    borderRadius: 4,
    background: "var(--vscode-badge-background, #444)",
    color: "var(--vscode-badge-foreground, #fff)",
  },
  pillOutline: {
    fontSize: 9,
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid var(--vscode-panel-border)",
  },
  planEffort: { fontSize: 11, color: "#f97316", marginTop: 6, fontWeight: 600 },
  planDetails: { fontSize: 11, marginTop: 4, lineHeight: 1.5, opacity: 0.85 },
  planLoc: { fontSize: 10, opacity: 0.55, marginTop: 4 },
  bucket: { marginBottom: 8 },
  bucketTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  bucketList: { paddingLeft: 16, margin: 0 },
  bucketLi: { fontSize: 11, marginBottom: 4, color: "var(--vscode-foreground)" },
  table: { display: "flex", flexDirection: "column", gap: 6 },
  tableRow: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  tableCell: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10 },
  tableLabel: { opacity: 0.55 },
  tableVal: { fontWeight: 500, textAlign: "right" as const, wordBreak: "break-word" as const },
  fixCard: {
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 8,
    padding: "8px 10px",
    marginBottom: 6,
  },
  fixTitle: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  fixSteps: { fontSize: 11, paddingLeft: 18, lineHeight: 1.55 },
  hint: { fontSize: 10, opacity: 0.65, marginBottom: 4 },
  link: { color: "#f97316" },
  mermaidPre: {
    fontSize: 10,
    lineHeight: 1.5,
    padding: "8px 10px",
    background: "var(--vscode-textBlockQuote-background, #1e1e1e)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8,
    overflowX: "auto" as const,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontFamily: "var(--vscode-editor-font-family, monospace)",
  },
  explanationBox: {
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #333)",
    borderRadius: 8,
    padding: "10px 12px",
  },
  explanationText: { fontSize: 12, lineHeight: 1.7, color: "var(--vscode-foreground)", opacity: 0.88 },
};
