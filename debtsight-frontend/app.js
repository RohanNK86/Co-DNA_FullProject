const apiBase = "http://localhost:3000";

const codeInput = document.getElementById("codeInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const spaghettiEl = document.getElementById("spaghettiScore");
const securityEl = document.getElementById("securityScore");
const riskEl = document.getElementById("riskLevel");
const issuesList = document.getElementById("issuesList");
const tabs = document.querySelectorAll(".tabs button");

mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

async function analyzeCode(code) {
  const res = await fetch(`${apiBase}/analyze-debt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function renderIssues(items) {
  issuesList.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    issuesList.innerHTML = "<li>No issues found.</li>";
    return;
  }
  for (const issue of items.slice(0, 10)) {
    const li = document.createElement("li");
    li.textContent = `${issue.title || "Issue"} (${issue.severity || "low"}): ${issue.details || ""}`;
    issuesList.appendChild(li);
  }
}

function renderMermaid(diagram, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.textContent = String(diagram || "flowchart TD\nA[No diagram available]");
  mermaid.init(undefined, el);
}

function showTab(id) {
  for (const key of ["arch", "fn", "logic"]) {
    document.getElementById(key)?.classList.toggle("hidden", key !== id);
  }
}

tabs.forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});

analyzeBtn?.addEventListener("click", async () => {
  const code = String(codeInput?.value || "").trim();
  if (!code) {
    statusEl.textContent = "Please paste code first.";
    return;
  }

  analyzeBtn.disabled = true;
  statusEl.textContent = "Analyzing...";
  try {
    const result = await analyzeCode(code);
    spaghettiEl.textContent = String(result?.spaghetti_score ?? "-");
    securityEl.textContent = String(result?.security_score ?? "-");
    const risk = String(result?.risk_level || "-");
    riskEl.textContent = risk;
    riskEl.className = risk;
    renderIssues(result?.issues || []);
    renderMermaid(result?.architecture_diagram, "arch");
    renderMermaid(result?.function_flow_diagram, "fn");
    renderMermaid(result?.logic_flow_diagram || result?.flowchart, "logic");
    showTab("logic");
    statusEl.textContent = "Done.";
  } catch (err) {
    statusEl.textContent = `Error: ${err.message || String(err)}`;
  } finally {
    analyzeBtn.disabled = false;
  }
});

