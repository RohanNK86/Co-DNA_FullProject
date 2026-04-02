import * as vscode from "vscode";
import * as path from "path";

type MessageHandler = (msg: unknown) => void;

export class CoDNASidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codnaView";
  private _view?: vscode.WebviewView;
  private _messageHandler?: MessageHandler;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  // Called by extension.ts to register a handler for webview messages
  onMessage(handler: MessageHandler) {
    this._messageHandler = handler;
  }

  // Called by extension.ts to push data into the webview
  sendToWebview(payload: unknown) {
    this._view?.webview.postMessage(payload);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Forward all webview messages to the handler in extension.ts
    webviewView.webview.onDidReceiveMessage((msg) => {
      this._messageHandler?.(msg);
    });
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js")
    );
    /** esbuild emits this when App imports index.css — extension is .css (styles), not .cs */
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.css")
    );
    const nonce = getNonce();
    /** Mermaid (layout workers, optional WASM) needs blob workers + wasm eval in the webview. */
    const csp = [
      "default-src 'none';",
      `script-src 'nonce-${nonce}' 'wasm-unsafe-eval';`,
      `style-src ${webview.cspSource} 'unsafe-inline';`,
      `font-src data: ${webview.cspSource} https:;`,
      `img-src data: blob: https: ${webview.cspSource};`,
      "worker-src blob:;",
    ].join(" ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="Content-Security-Policy" content="${csp}"/>
  <title>Co-DNA</title>
  <link href="${styleUri}" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body,#root{height:100%;overflow:hidden}
    body{background:transparent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}