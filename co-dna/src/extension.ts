import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "co-dna" is now active!');

	const hello = vscode.commands.registerCommand('co-dna.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Co-DNA!');
	});

	const analyze = vscode.commands.registerCommand('co-dna.analyzeDebt', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Open a file first to analyze code.');
			return;
		}

		const code = editor.document.getText();
		if (!code.trim()) {
			vscode.window.showErrorMessage('The active file is empty.');
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'debtSightResult',
			'DebtSight Analysis',
			vscode.ViewColumn.Beside,
			{ enableScripts: true }
		);

		panel.webview.html = loadingHtml();

		try {
			const response = await fetch('http://localhost:3000/analyze-debt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});

			const data: any = await response.json();
			if (!response.ok) {
				throw new Error(data?.error || `Backend error (${response.status})`);
			}

			panel.webview.html = resultHtml(data);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			panel.webview.html = errorHtml(msg);
		}
	});

	context.subscriptions.push(hello, analyze);
}

export function deactivate() {}

function esc(input: unknown): string {
	const s = String(input ?? '');
	return s
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function loadingHtml(): string {
	return `<!doctype html>
<html>
<body style="font-family: sans-serif; padding:16px;">
  <h2>DebtSight Analysis</h2>
  <p>Analyzing code... ⏳</p>
</body>
</html>`;
}

function errorHtml(message: string): string {
	return `<!doctype html>
<html>
<body style="font-family: sans-serif; padding:16px;">
  <h2>DebtSight Analysis</h2>
  <p style="color:#d32f2f;"><strong>Error:</strong> ${esc(message)}</p>
  <p>Check backend on <code>http://localhost:3000</code>.</p>
</body>
</html>`;
}

function resultHtml(data: any): string {
	const spaghetti = Number(data?.spaghetti_score ?? 0);
	const security = Number(data?.security_score ?? 0);
	const riskLevel = String(data?.risk_level ?? 'UNKNOWN');
	const issues = Array.isArray(data?.issues) ? data.issues : [];
	const logic = String(data?.logic_flow_diagram || data?.flowchart || '');
	const arch = String(data?.architecture_diagram || '');
	const fnFlow = String(data?.function_flow_diagram || '');

	const issueList = issues
		.slice(0, 8)
		.map((i: any) => `<li><strong>${esc(i?.title)}</strong> (${esc(i?.severity)}): ${esc(i?.details)}</li>`)
		.join('');

	return `<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { font-family: sans-serif; padding: 12px; color: #ddd; background: #1e1e1e; }
    .grid { display:grid; grid-template-columns: repeat(3,minmax(140px,1fr)); gap:12px; }
    .card { background:#2a2a2a; border-radius:8px; padding:10px; }
    .risk-HIGH { color:#ff6b6b; } .risk-MEDIUM { color:#ffd166; } .risk-LOW { color:#4caf50; }
    .tabs button { margin-right:8px; }
    .hidden { display:none; }
  </style>
</head>
<body>
  <h2>DebtSight Analysis</h2>
  <div class="grid">
    <div class="card"><div>Spaghetti Score</div><h3>${esc(spaghetti)}</h3></div>
    <div class="card"><div>Security Score</div><h3>${esc(security)}</h3></div>
    <div class="card"><div>Risk</div><h3 class="risk-${esc(riskLevel)}">${esc(riskLevel)}</h3></div>
  </div>

  <h3>Top Issues</h3>
  <ul>${issueList || '<li>No issues found.</li>'}</ul>

  <div class="tabs">
    <button onclick="showTab('arch')">Architecture</button>
    <button onclick="showTab('fn')">Function Flow</button>
    <button onclick="showTab('logic')">Logic</button>
  </div>
  <div id="arch" class="mermaid">${esc(arch)}</div>
  <div id="fn" class="mermaid hidden">${esc(fnFlow)}</div>
  <div id="logic" class="mermaid hidden">${esc(logic)}</div>

  <script>
    mermaid.initialize({ startOnLoad: true });
    function showTab(id){
      for (const k of ['arch','fn','logic']) {
        const el = document.getElementById(k);
        if (!el) continue;
        el.classList.toggle('hidden', k !== id);
      }
      mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    }
    mermaid.init(undefined, document.querySelectorAll('.mermaid'));
  </script>
</body>
</html>`;
}
