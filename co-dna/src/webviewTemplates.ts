/** Escape text for HTML text nodes (not for raw Mermaid). */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Strip duplicate "flowchart TD graph TD" headers the model sometimes emits (invalid Mermaid). */
function stripDuplicateMermaidHeaders(raw: string): string {
  let s = String(raw || "").trim();
  const dup =
    /^((?:flowchart|graph)\s+(?:TD|LR|RL|BT))\s+(?:(?:flowchart|graph)\s+(?:TD|LR|RL|BT))\s*/i;
  let guard = 0;
  while (dup.test(s) && guard++ < 8) {
    s = s.replace(dup, "$1\n");
  }
  return s;
}

function riskClass(level: string): string {
  const u = String(level).toUpperCase();
  if (u.includes("HIGH")) {
    return "HIGH";
  }
  if (u.includes("MEDIUM")) {
    return "MEDIUM";
  }
  if (u.includes("LOW")) {
    return "LOW";
  }
  return "UNKNOWN";
}

function cspBlock(cspSource: string): string {
  return [
    "default-src 'none';",
    `style-src ${cspSource} 'unsafe-inline';`,
    "script-src https://cdn.jsdelivr.net " + cspSource + " 'unsafe-inline';",
    `font-src ${cspSource} https: data:;`,
    `img-src ${cspSource} https: data:;`,
  ].join(" ");
}

export function loadingHtml(cspSource: string, message = "Analyzing…"): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspBlock(cspSource))}">
<style>
body{margin:0;font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-foreground);padding:16px;}
.spinner{display:inline-block;width:20px;height:20px;border:2px solid var(--vscode-button-secondaryBackground);border-top-color:var(--vscode-button-background);border-radius:50%;animation:sp 0.8s linear infinite;}
@keyframes sp{to{transform:rotate(360deg)}}
</style></head><body>
<p><span class="spinner"></span> ${esc(message)}</p>
</body></html>`;
}

export function errorHtml(
  cspSource: string,
  message: string,
  apiBase: string
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspBlock(cspSource))}">
<style>
body{margin:0;font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-foreground);padding:16px;}
.err{color:var(--vscode-errorForeground);}
code{background:var(--vscode-textCodeBlock-background);padding:2px 6px;border-radius:4px;}
</style></head><body>
<h2>Co-DNA</h2>
<p class="err"><strong>Error:</strong> ${esc(message)}</p>
<p>Backend: <code>${esc(apiBase)}</code></p>
<p>Check <strong>Settings → co-dna.apiBaseUrl</strong> and that DebtSight is running.</p>
</body></html>`;
}

export interface AnalyzePayload {
  spaghetti_score?: number;
  security_score?: number;
  risk_level?: string;
  issues?: Array<{ title?: string; severity?: string; details?: string; location?: string }>;
  security_issues?: Array<Record<string, unknown>>;
  logic_flow_diagram?: string;
  architecture_diagram?: string;
  function_flow_diagram?: string;
  flowchart?: string;
  refactor_plan?: Array<{ step?: string; why?: string; example_change?: string }>;
  explanation?: string;
}

export function analyzePanelHtml(
  cspSource: string,
  data: AnalyzePayload,
  modelLabel: string,
  options?: { aiPartial?: boolean }
): string {
  const spaghetti = Number(data.spaghetti_score ?? 0);
  const security = Number(data.security_score ?? 0);
  const risk = String(data.risk_level ?? "—");
  const rc = riskClass(risk);
  const logic = stripDuplicateMermaidHeaders(
    String(data.logic_flow_diagram || data.flowchart || "flowchart TD\nA[No diagram]")
  );
  const arch = stripDuplicateMermaidHeaders(
    String(data.architecture_diagram || "flowchart TD\nA[No diagram]")
  );
  const fnFlow = stripDuplicateMermaidHeaders(
    String(data.function_flow_diagram || "flowchart TD\nA[No diagram]")
  );
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const secIssues = Array.isArray(data.security_issues) ? data.security_issues : [];
  const plan = Array.isArray(data.refactor_plan) ? data.refactor_plan : [];

  const issuesHtml = issues
    .map(
      (i) =>
        `<li><span class="sev sev-${esc(String(i.severity || "").toLowerCase())}">${esc(i.severity)}</span> <strong>${esc(i.title)}</strong> — ${esc(i.details)} <span class="loc">${esc(i.location)}</span></li>`
    )
    .join("");

  const secHtml = secIssues
    .map((s) => {
      const t = typeof s.type === "string" ? s.type : "security";
      const det = typeof s.details === "string" ? s.details : JSON.stringify(s);
      return `<li><span class="sev sev-high">security</span> <strong>${esc(t)}</strong> — ${esc(det)}</li>`;
    })
    .join("");

  const refactorHtml = plan
    .map(
      (p, idx) =>
        `<div class="rf"><div class="rf-num">${idx + 1}</div><div><strong>${esc(p.step)}</strong><p>${esc(p.why)}</p><pre class="ex">${esc(p.example_change)}</pre><button type="button" class="btn-copy-ex" data-idx="${idx}">Copy example</button></div></div>`
    )
    .join("");

  const issuesSummaryText = [
    ...issues.map(
      (i) => `[${i.severity ?? "issue"}] ${i.title ?? ""}: ${i.details ?? ""}`
    ),
    ...secIssues.map((s) => {
      const det =
        typeof s.details === "string" ? s.details : JSON.stringify(s);
      const typ = typeof s.type === "string" ? s.type : "security";
      return `[security] ${typ}: ${det}`;
    }),
  ].join("\n\n");

  const exampleSnippets = plan.map((p) => p.example_change ?? "");

  const banner = options?.aiPartial
    ? `<div class="banner">Some AI-generated sections may be limited. Rule-based metrics are still shown.</div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspBlock(cspSource))}">
<style>
:root{--pad:14px;--radius:8px;}
*{box-sizing:border-box;}
body{margin:0;font-family:var(--vscode-font-family);font-size:13px;background:var(--vscode-editor-background);color:var(--vscode-foreground);}
.wrap{max-height:100vh;overflow:auto;padding:var(--pad);}
header{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px;border-bottom:1px solid var(--vscode-widget-border);padding-bottom:10px;}
.brand{font-weight:700;font-size:15px;}
.model{opacity:0.85;font-size:12px;}
.risk{padding:4px 10px;border-radius:999px;font-weight:600;font-size:12px;}
.risk-HIGH{background:rgba(239,68,68,0.2);color:#f87171;}
.risk-MEDIUM{background:rgba(245,158,11,0.2);color:#fbbf24;}
.risk-LOW{background:rgba(34,197,94,0.2);color:#4ade80;}
.risk-UNKNOWN{background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);}
.scores{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.card{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-widget-border);border-radius:var(--radius);padding:12px;}
.card .label{opacity:0.8;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;}
.card .num{font-size:28px;font-weight:700;margin-top:4px;}
.tabs,.subtabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
.tabs button,.subtabs button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;}
.tabs button.active,.subtabs button.active{background:var(--vscode-button-background);color:var(--vscode-button-foreground);}
.panel{display:none;margin-top:8px;}
.panel.active{display:block;}
.mermaid{min-height:80px;background:var(--vscode-sideBar-background);border-radius:var(--radius);padding:8px;overflow:auto;}
.hidden{display:none!important;}
ul{margin:0;padding-left:18px;}
.sev{font-size:10px;text-transform:uppercase;margin-right:6px;}
.sev-high{color:#f87171;}.sev-medium{color:#fbbf24;}.sev-low{color:#94a3b8;}
.loc{opacity:0.7;font-size:11px;}
.rf{display:flex;gap:10px;border-bottom:1px solid var(--vscode-widget-border);padding:10px 0;}
.rf-num{flex:0 0 24px;font-weight:700;color:var(--vscode-descriptionForeground);}
pre.ex{margin:8px 0;padding:8px;background:var(--vscode-textCodeBlock-background);border-radius:6px;white-space:pre-wrap;word-break:break-word;font-size:12px;}
.btn-copy{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;}
.banner{background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);padding:8px;border-radius:6px;margin-bottom:10px;font-size:12px;}
</style></head><body>
<div class="wrap">
  <header>
    <span class="brand">Co-DNA · DebtSight</span>
    <span class="model">${esc(modelLabel)}</span>
    <span class="risk risk-${rc}">${esc(risk)} risk</span>
  </header>
  ${banner}
  <div class="scores">
    <div class="card"><div class="label">Technical debt</div><div class="num">${esc(spaghetti)}</div></div>
    <div class="card"><div class="label">Security score</div><div class="num">${esc(security)}</div></div>
  </div>

  <div class="tabs" id="mainTabs">
    <button type="button" data-main="diagrams" class="active">Diagrams</button>
    <button type="button" data-main="issues">Issues</button>
    <button type="button" data-main="refactor">Refactor plan</button>
  </div>

  <div id="main-diagrams" class="panel active">
    <div class="subtabs" id="subTabs">
      <button type="button" data-sub="logic" class="active">Logic flow</button>
      <button type="button" data-sub="arch">Architecture</button>
      <button type="button" data-sub="fn">Function flow</button>
    </div>
    <div id="box-logic" class="mermaid">${logic}</div>
    <div id="box-arch" class="mermaid hidden">${arch}</div>
    <div id="box-fn" class="mermaid hidden">${fnFlow}</div>
  </div>

  <div id="main-issues" class="panel">
    <h3>Technical issues</h3>
    <ul>${issuesHtml || "<li>No issues listed.</li>"}</ul>
    <h3>Security issues</h3>
    <ul>${secHtml || "<li>No security issues listed.</li>"}</ul>
    <button type="button" class="btn-copy" id="copyIssues">Copy issues summary</button>
  </div>

  <div id="main-refactor" class="panel">
    ${refactorHtml || "<p>No refactor plan items.</p>"}
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
(function(){
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'dark' });

  const issuesSummary = ${JSON.stringify(issuesSummaryText)};
  const exampleSnippets = ${JSON.stringify(exampleSnippets)};

  async function renderMermaid() {
    const visible = document.querySelector('.mermaid:not(.hidden)');
    if (!visible || visible.querySelector('svg')) return;
    try {
      await mermaid.run({ nodes: [visible] });
    } catch (e) {
      visible.textContent = 'Could not render diagram.\\n' + (e && e.message ? e.message : String(e));
    }
  }

  function showMain(name) {
    document.querySelectorAll('#mainTabs button').forEach(b => b.classList.toggle('active', b.dataset.main === name));
    document.getElementById('main-diagrams').classList.toggle('active', name === 'diagrams');
    document.getElementById('main-issues').classList.toggle('active', name === 'issues');
    document.getElementById('main-refactor').classList.toggle('active', name === 'refactor');
    if (name === 'diagrams') void renderMermaid();
  }

  function showSub(name) {
    document.querySelectorAll('#subTabs button').forEach(b => b.classList.toggle('active', b.dataset.sub === name));
    document.getElementById('box-logic').classList.toggle('hidden', name !== 'logic');
    document.getElementById('box-arch').classList.toggle('hidden', name !== 'arch');
    document.getElementById('box-fn').classList.toggle('hidden', name !== 'fn');
    void renderMermaid();
  }

  document.getElementById('mainTabs').addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.main) showMain(t.dataset.main);
  });
  document.getElementById('subTabs').addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.sub) showSub(t.dataset.sub);
  });

  document.getElementById('copyIssues')?.addEventListener('click', () => {
    navigator.clipboard.writeText(issuesSummary || '(no issues)');
  });

  document.querySelectorAll('.btn-copy-ex').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      const t = exampleSnippets[idx] != null ? String(exampleSnippets[idx]) : '';
      navigator.clipboard.writeText(t);
    });
  });

  showMain('diagrams');
  showSub('logic');
})();
</script>
</body></html>`;
}

export function codePanelHtml(
  cspSource: string,
  title: string,
  code: string,
  modelLabel: string,
  options?: { showReplace?: boolean }
): string {
  const showReplace = Boolean(options?.showReplace);
  const replaceBtn = showReplace
    ? `<button type="button" id="replaceBtn" class="primary">Replace in editor</button>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspBlock(cspSource))}">
<style>
body{margin:0;font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-foreground);padding:12px;}
header{margin-bottom:10px;}
h2{margin:0 0 4px 0;font-size:15px;}
.meta{opacity:0.8;font-size:11px;margin-bottom:8px;}
.toolbar{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;}
button.primary{background:var(--vscode-button-background);color:var(--vscode-button-foreground);}
pre{margin:0;padding:12px;background:var(--vscode-textCodeBlock-background);border-radius:8px;white-space:pre-wrap;word-break:break-word;max-height:70vh;overflow:auto;font-size:12px;}
</style></head><body>
<header>
  <h2>${esc(title)}</h2>
  <div class="meta">${esc(modelLabel)}</div>
</header>
<div class="toolbar">
  <button type="button" id="copyBtn">Copy</button>
  ${replaceBtn}
</div>
<pre id="code">${esc(code)}</pre>
<script>
(function(){
  const vscode = acquireVsCodeApi();
  const text = ${JSON.stringify(code)};
  document.getElementById('copyBtn').addEventListener('click', () => navigator.clipboard.writeText(text));
  const rb = document.getElementById('replaceBtn');
  if (rb) rb.addEventListener('click', () => vscode.postMessage({ type: 'replaceEditor', text: text }));
})();
</script>
</body></html>`;
}

export interface TranslatePayload {
  detected_language?: string;
  translated_to?: string;
  translated_code?: string;
  /** Present when backend returned passthrough fallback (AI unavailable). */
  warning?: string;
  purpose?: string;
  purpose_summary?: string;
  suggested_language?: string;
  why_this_language?: string;
  comparison?: {
    performance_gain?: string;
    memory_efficiency?: string;
    why?: string;
  };
  alternatives?: { Python?: string; Go?: string; Rust?: string };
}

export function translatePanelHtml(
  cspSource: string,
  data: TranslatePayload,
  modelLabel: string,
  options?: { showReplace?: boolean }
): string {
  const showReplace = Boolean(options?.showReplace);
  const replaceBtn = showReplace
    ? `<button type="button" id="replaceBtn" class="primary">Replace in editor</button>`
    : "";
  const alt = data.alternatives || {};
  const altBlocks = ["Python", "Go", "Rust"]
    .filter((k) => typeof alt[k as keyof typeof alt] === "string" && String(alt[k as keyof typeof alt]).trim())
    .map(
      (lang) =>
        `<h3>${esc(lang)}</h3><pre class="block" data-lang="${esc(lang)}">${esc(
          alt[lang as keyof typeof alt]
        )}</pre>`
    )
    .join("");

  const mainCode = String(data.translated_code ?? "");
  const cmp = data.comparison || {};
  const warn = data.warning ? `<div class="warn">${esc(data.warning)}</div>` : "";
  const extraMeta =
    data.purpose || data.suggested_language
      ? `<div class="grid">
    <div class="pill"><div class="k">Purpose (advisor)</div><div class="v">${esc(data.purpose ?? "—")}</div></div>
    <div class="pill"><div class="k">Suggested</div><div class="v">${esc(data.suggested_language ?? "—")}</div></div>
  </div>`
      : "";
  const legacyCompare =
    cmp.performance_gain || cmp.memory_efficiency || cmp.why
      ? `<div class="cmp">
    <div class="pill"><div class="k">Performance</div><div class="v">${esc(cmp.performance_gain)}</div></div>
    <div class="pill"><div class="k">Memory</div><div class="v">${esc(cmp.memory_efficiency)}</div></div>
  </div>
  <p class="prose">${esc(cmp.why)}</p>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspBlock(cspSource))}">
<style>
body{margin:0;font-family:var(--vscode-font-family);font-size:13px;background:var(--vscode-editor-background);color:var(--vscode-foreground);padding:12px;}
.wrap{max-height:100vh;overflow:auto;}
h2{margin:0 0 4px 0;font-size:15px;}
h3{font-size:12px;margin:12px 0 6px 0;opacity:0.9;}
.meta{opacity:0.8;font-size:11px;margin-bottom:10px;}
.warn{margin-bottom:10px;padding:10px;border-radius:8px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.45);font-size:12px;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.pill{background:var(--vscode-sideBar-background);border:1px solid var(--vscode-widget-border);border-radius:8px;padding:8px 10px;}
.pill .k{font-size:10px;text-transform:uppercase;opacity:0.75;}
.pill .v{margin-top:4px;font-weight:600;}
.prose{line-height:1.45;margin:8px 0;padding:10px;background:var(--vscode-sideBar-background);border-radius:8px;border:1px solid var(--vscode-widget-border);}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;}
button.primary{background:var(--vscode-button-background);color:var(--vscode-button-foreground);}
pre.block{margin:0 0 12px 0;padding:12px;background:var(--vscode-textCodeBlock-background);border-radius:8px;white-space:pre-wrap;word-break:break-word;max-height:45vh;overflow:auto;font-size:12px;}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;font-size:12px;}
</style></head><body>
<div class="wrap">
  <h2>Smart translate · Code intelligence</h2>
  <div class="meta">${esc(modelLabel)}</div>
  ${warn}
  <div class="grid">
    <div class="pill"><div class="k">Detected</div><div class="v">${esc(data.detected_language)}</div></div>
    <div class="pill"><div class="k">Translated to</div><div class="v">${esc(data.translated_to)}</div></div>
  </div>
  ${extraMeta}
  ${data.purpose_summary ? `<p class="prose">${esc(data.purpose_summary)}</p>` : ""}
  ${data.why_this_language ? `<p class="prose"><strong>Why this language:</strong> ${esc(data.why_this_language)}</p>` : ""}
  ${legacyCompare}
  <div class="toolbar">
    <button type="button" id="copyBtn">Copy translated code</button>
    ${replaceBtn}
  </div>
  <h3>Translated</h3>
  <pre class="block" id="mainCode">${esc(mainCode)}</pre>
  ${altBlocks}
</div>
<script>
(function(){
  const vscode = acquireVsCodeApi();
  const text = ${JSON.stringify(mainCode)};
  document.getElementById('copyBtn').addEventListener('click', () => navigator.clipboard.writeText(text));
  const rb = document.getElementById('replaceBtn');
  if (rb) rb.addEventListener('click', () => vscode.postMessage({ type: 'replaceEditor', text: text }));
})();
</script>
</body></html>`;
}

export function textPanelHtml(
  cspSource: string,
  title: string,
  body: string,
  modelLabel: string
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspBlock(cspSource))}">
<style>
body{margin:0;font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-foreground);padding:12px;}
h2{margin:0 0 4px 0;}
.meta{opacity:0.8;font-size:11px;margin-bottom:8px;}
button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;margin-bottom:8px;}
.prose{white-space:pre-wrap;word-break:break-word;max-height:75vh;overflow:auto;line-height:1.5;}
</style></head><body>
<h2>${esc(title)}</h2>
<div class="meta">${esc(modelLabel)}</div>
<button type="button" id="copyBtn">Copy explanation</button>
<div class="prose" id="txt">${esc(body)}</div>
<script>
(function(){
  const t = ${JSON.stringify(body)};
  document.getElementById('copyBtn').addEventListener('click', () => navigator.clipboard.writeText(t));
})();
</script>
</body></html>`;
}
