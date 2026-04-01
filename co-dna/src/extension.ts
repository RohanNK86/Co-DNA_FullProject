import * as vscode from "vscode";
import { getApiBaseUrl, getModelLabel } from "./config";
import {
  analyzePanelHtml,
  codePanelHtml,
  errorHtml,
  loadingHtml,
  textPanelHtml,
  translatePanelHtml,
  type AnalyzePayload,
  type TranslatePayload,
} from "./webviewTemplates";

interface TranslateQuickPick extends vscode.QuickPickItem {
  value: string;
  multi: boolean;
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Co-DNA 1.2 (DebtSight) is active.");

  const analyze = vscode.commands.registerCommand("co-dna.analyzeDebt", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Open a file first to analyze code.");
      return;
    }
    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showErrorMessage("The active file is empty.");
      return;
    }

    const base = getApiBaseUrl();
    const modelLabel = getModelLabel();
    const panel = vscode.window.createWebviewPanel(
      "debtSightResult",
      "Co-DNA 1.2 · DebtSight",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    const csp = panel.webview.cspSource;
    panel.webview.html = loadingHtml(csp);

    try {
      const response = await fetch(`${base}/analyze-debt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data: unknown = await response.json();
      const obj = data as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(String(obj?.error ?? `Backend error (${response.status})`));
      }
      const payload = data as AnalyzePayload;
      const expl = String(payload.explanation ?? "");
      const aiPartial =
        /limited|unavailable|fallback|partial|could not/i.test(expl) ||
        ("ai_error" in obj && obj.ai_error !== undefined && obj.ai_error !== null);
      panel.webview.html = analyzePanelHtml(csp, payload, modelLabel, { aiPartial });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      panel.webview.html = errorHtml(csp, msg, base);
    }
  });

  const explain = vscode.commands.registerCommand("co-dna.explainCode", async () =>
    runSimpleEndpoint("explain-code", "Explanation", (d) => String(d?.explanation ?? ""), "text")
  );

  const modernize = vscode.commands.registerCommand("co-dna.modernizeCode", async () =>
    runSimpleEndpoint("modernize-code", "Modernized code", (d) => String(d?.modern_code ?? ""), "code")
  );

  const translate = vscode.commands.registerCommand("co-dna.translateCode", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Open a file first.");
      return;
    }
    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showErrorMessage("The active file is empty.");
      return;
    }

    const picks: TranslateQuickPick[] = [
      {
        label: "$(sparkle) Auto — AI-recommended language",
        description: "Uses purpose + language advisor",
        value: "auto",
        multi: false,
      },
      { label: "Python", value: "Python", multi: false },
      { label: "Go", value: "Go", multi: false },
      { label: "Rust", value: "Rust", multi: false },
      { label: "TypeScript", value: "TypeScript", multi: false },
      { label: "JavaScript", value: "JavaScript", multi: false },
      { label: "Java", value: "Java", multi: false },
      { label: "C++", value: "C++", multi: false },
      {
        label: "$(package) Multi-language pack",
        description: "Main translation + Python, Go, Rust snippets",
        value: "auto",
        multi: true,
      },
    ];

    const choice = await vscode.window.showQuickPick(picks, {
      placeHolder: "Translate: pick target language or Auto",
    });
    if (!choice) {
      return;
    }

    const targetLanguage = choice.multi ? "" : choice.value === "auto" ? "" : choice.value;
    const multi = choice.multi;

    const base = getApiBaseUrl();
    const modelLabel = getModelLabel();
    const docUri = editor.document.uri;
    const panel = vscode.window.createWebviewPanel(
      "coDnaTranslate",
      "Co-DNA · Smart translate",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    const csp = panel.webview.cspSource;
    panel.webview.html = loadingHtml(csp, "Translating…");

    try {
      const response = await fetch(`${base}/translate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, targetLanguage, multi }),
      });
      const data: unknown = await response.json();
      const obj = data as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(String(obj?.error ?? `Backend error (${response.status})`));
      }
      const payload = data as TranslatePayload;
      panel.webview.html = translatePanelHtml(csp, payload, modelLabel, { showReplace: true });
      context.subscriptions.push(
        panel.webview.onDidReceiveMessage(async (msg) => {
          if (msg?.type !== "replaceEditor" || typeof msg.text !== "string") {
            return;
          }
          const ed =
            vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === docUri.toString()) ??
            vscode.window.activeTextEditor;
          if (!ed || ed.document.uri.toString() !== docUri.toString()) {
            vscode.window.showWarningMessage("Open the original file to apply the translation.");
            return;
          }
          const d = ed.document;
          const full = new vscode.Range(d.positionAt(0), d.positionAt(d.getText().length));
          const we = new vscode.WorkspaceEdit();
          we.replace(d.uri, full, msg.text);
          const ok = await vscode.workspace.applyEdit(we);
          if (ok) {
            vscode.window.showInformationMessage("Co-DNA: Replaced file with translated code.");
          }
        })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      panel.webview.html = errorHtml(csp, msg, base);
    }
  });

  const rewrite = vscode.commands.registerCommand("co-dna.rewriteCodebase", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Open a file first.");
      return;
    }
    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showErrorMessage("The active file is empty.");
      return;
    }
    const base = getApiBaseUrl();
    const modelLabel = getModelLabel();
    const docUri = editor.document.uri;
    const panel = vscode.window.createWebviewPanel(
      "coDnaRewrite",
      "Co-DNA 1.2 · Rewrite",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    const csp = panel.webview.cspSource;
    panel.webview.html = loadingHtml(csp, "Rewriting with AI…");
    try {
      const response = await fetch(`${base}/rewrite-codebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data: unknown = await response.json();
      const obj = data as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(String(obj?.error ?? `Backend error (${response.status})`));
      }
      const rewritten = String(obj?.rewritten_code ?? "");
      panel.webview.html = codePanelHtml(csp, "Rewritten code", rewritten, modelLabel, {
        showReplace: true,
      });
      context.subscriptions.push(
        panel.webview.onDidReceiveMessage(async (msg) => {
          if (msg?.type !== "replaceEditor" || typeof msg.text !== "string") {
            return;
          }
          const ed =
            vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === docUri.toString()) ??
            vscode.window.activeTextEditor;
          if (!ed || ed.document.uri.toString() !== docUri.toString()) {
            vscode.window.showWarningMessage("Open the original file to apply the rewrite.");
            return;
          }
          const d = ed.document;
          const full = new vscode.Range(d.positionAt(0), d.positionAt(d.getText().length));
          const we = new vscode.WorkspaceEdit();
          we.replace(d.uri, full, msg.text);
          const ok = await vscode.workspace.applyEdit(we);
          if (ok) {
            vscode.window.showInformationMessage("Co-DNA: Replaced file contents.");
          }
        })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      panel.webview.html = errorHtml(csp, msg, base);
    }
  });

  context.subscriptions.push(analyze, explain, modernize, translate, rewrite);
}

async function runSimpleEndpoint(
  path: string,
  title: string,
  extract: (d: Record<string, unknown>) => string,
  mode: "text" | "code"
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Open a file first.");
    return;
  }
  const code = editor.document.getText();
  if (!code.trim()) {
    vscode.window.showErrorMessage("The active file is empty.");
    return;
  }
  const base = getApiBaseUrl();
  const modelLabel = getModelLabel();
  const panel = vscode.window.createWebviewPanel(
    "coDnaSimple",
    `Co-DNA 1.2 · ${title}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const csp = panel.webview.cspSource;
  panel.webview.html = loadingHtml(csp, "Calling backend…");
  try {
    const response = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data: unknown = await response.json();
    const obj = data as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(String(obj?.error ?? `Backend error (${response.status})`));
    }
    const body = extract(obj);
    panel.webview.html =
      mode === "code"
        ? codePanelHtml(csp, title, body, modelLabel)
        : textPanelHtml(csp, title, body, modelLabel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    panel.webview.html = errorHtml(csp, msg, base);
  }
}

export function deactivate() {}
