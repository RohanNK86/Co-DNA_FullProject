import * as vscode from "vscode";

const SECTION = "co-dna";

/** Base URL of the DebtSight backend (no trailing slash). */
export function getApiBaseUrl(): string {
  const raw = vscode.workspace
    .getConfiguration(SECTION)
    .get<string>("apiBaseUrl", "http://localhost:3000")
    .trim();
  return raw.replace(/\/+$/, "");
}

/** Label shown in webview header (single backend / single model UX). */
export function getModelLabel(): string {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<string>("modelLabel", "Gemini · DebtSight")
    .trim();
}
