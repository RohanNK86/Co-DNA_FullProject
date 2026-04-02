import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { CoDNASidebarProvider } from "./sidebar";

function getBackendUrl(): string {
  const raw = vscode.workspace
    .getConfiguration("co-dna")
    .get<string>("apiBaseUrl", "http://localhost:3000")
    .trim();
  return raw.replace(/\/+$/, "") || "http://localhost:3000";
}

/** Map DebtSight API shapes to what the React UI expects (matches Postman fields). */
function normalizeBackendPayload(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };

  if (Array.isArray(out.issues) && !out.findings && !out.debt_items) {
    out.findings = (out.issues as Array<Record<string, unknown>>).map((i) => ({
      title: i.title,
      description: i.details ?? i.description,
      severity: i.severity,
      file: i.location ?? i.file,
    }));
    delete out.issues;
  }

  if (typeof out.modern_code === "string" && !out.modernized_code) {
    out.modernized_code = out.modern_code;
  }

  return out;
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new CoDNASidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CoDNASidebarProvider.viewType,
      provider
    )
  );

  // ── Command: Analyze current open file instantly ──────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("co-dna.analyzeCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("Co-DNA: No file is currently open.");
        return;
      }
      const code = editor.document.getText();
      const fileName = path.basename(editor.document.fileName);
      provider.sendToWebview({ command: "setLoading", fileName });
      await runAnalysis([{ name: fileName, content: code }], provider);
    })
  );

  // ── Handle messages coming FROM the webview ───────────────────────────────
  provider.onMessage(async (msg) => {
    const message = msg as WebviewMessage;
    switch (message.command) {

      // User hit send with text prompt + any attached files
      case "submit": {
        const attachedFiles: FileEntry[] = message.files ?? [];

        // Also grab content of currently open editor if no files attached
        if (attachedFiles.length === 0) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            attachedFiles.push({
              name: path.basename(editor.document.fileName),
              content: editor.document.getText(),
            });
          }
        }

        if (attachedFiles.length === 0) {
          provider.sendToWebview({
            command: "error",
            message: "No files to analyse. Open a file or attach one using +.",
          });
          return;
        }

        provider.sendToWebview({ command: "setLoading", fileName: attachedFiles[0].name });
        await runAnalysis(attachedFiles, provider, message.mode, message.text);
        break;
      }

      // User clicked "+ Add Files" — open picker and read file contents
      case "addFiles": {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectMany: true,
          openLabel: "Add Files to Co-DNA",
          filters: {
            "Code files": [
              "ts", "tsx", "js", "jsx", "py", "java", "go",
              "rs", "cpp", "c", "cs", "rb", "php", "swift", "kt",
            ],
            "All files": ["*"],
          },
        });
        if (!uris || uris.length === 0) return;

        const files: FileEntry[] = uris.map((uri) => ({
          name: path.basename(uri.fsPath),
          content: fs.readFileSync(uri.fsPath, "utf8"),
          path: uri.fsPath,
        }));

        // Tell the webview which files were added (with their content)
        provider.sendToWebview({ command: "filesAdded", files });
        break;
      }

      // User clicked "+ Add Project" — read all code files in workspace
      case "addProject": {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
          vscode.window.showWarningMessage("Co-DNA: No workspace folder is open.");
          return;
        }

        const picked = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          openLabel: "Select Project Folder",
          defaultUri: folders[0].uri,
        });
        if (!picked) return;

        const rootPath = picked[0].fsPath;
        const files = readProjectFiles(rootPath);
        provider.sendToWebview({ command: "filesAdded", files });
        vscode.window.showInformationMessage(
          `Co-DNA: Added ${files.length} files from project.`
        );
        break;
      }
    }
  });

  console.log('Co-DNA extension is now active.');
}

// ── Core analysis function ─────────────────────────────────────────────────
async function runAnalysis(
  files: FileEntry[],
  provider: CoDNASidebarProvider,
  mode: string = "scan",
  prompt?: string
) {
  try {
    // Concatenate all file contents with file headers
    const combinedCode = files
      .map((f) => `// FILE: ${f.name}\n${f.content}`)
      .join("\n\n");

    const packageJson = files.find(
      (f) => f.name === "package.json" || f.name === "requirements.txt"
    );

    const body: Record<string, unknown> = {
      code: combinedCode,
      project_files: files.map((f) => f.name),
    };

    if (packageJson) {
      body.package_json = packageJson.content;
    }

    const base = getBackendUrl();

    // Must match debtsight-backend/routes/aiRoutes.js (same paths as Postman).
    let endpoint = `${base}/analyze-debt`;
    let requestBody: Record<string, unknown> = body;

    if (mode === "explain") {
      endpoint = `${base}/explain-code`;
    } else if (mode === "modernize") {
      endpoint = `${base}/modernize-code`;
    } else if (mode === "rewrite") {
      endpoint = `${base}/rewrite-codebase`;
    } else if (mode === "translate") {
      endpoint = `${base}/translate-code`;
      requestBody = {
        code: combinedCode,
        targetLanguage: prompt?.trim() || "",
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let errJson: Record<string, unknown> = {};
      try {
        errJson = JSON.parse(errText) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      throw new Error(
        String(errJson.error ?? (errText || `Backend returned ${response.status}`))
      );
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const data = normalizeBackendPayload(raw);
    provider.sendToWebview({ command: "analysisResult", data, mode, files });

  } catch (err: unknown) {
    let msg = err instanceof Error ? err.message : String(err);
    if (msg === "fetch failed" || /failed to fetch/i.test(msg)) {
      const base = getBackendUrl();
      msg = `no response from ${base} (start DebtSight: terminal → cd debtsight-backend → npm start). Check VS Code Settings → Co-DNA → apiBaseUrl if you use another URL.`;
    }
    provider.sendToWebview({
      command: "error",
      message: `Analysis failed: ${msg}`,
    });
  }
}

// ── Read all code files from a directory recursively ──────────────────────
const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go",
  ".rs", ".cpp", ".c", ".cs", ".rb", ".php", ".swift", ".kt",
  ".json", ".yaml", ".yml",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "out", "build", "__pycache__",
  ".venv", "venv", ".next", "coverage",
]);

function readProjectFiles(dir: string, maxFiles = 20): FileEntry[] {
  const results: FileEntry[] = [];

  function walk(current: string) {
    if (results.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.length < 100_000) {
            results.push({
              name: path.relative(dir, fullPath),
              content,
              path: fullPath,
            });
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(dir);
  return results;
}

export interface FileEntry {
  name: string;
  content: string;
  path?: string;
}

interface WebviewMessage {
  command: string;
  mode?: string;
  text?: string;
  files?: FileEntry[];
}

export function deactivate() {}