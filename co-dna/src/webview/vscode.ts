declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

export type Mode = "scan" | "explain" | "modernize" | "rewrite" | "translate";

export type OutboundMessage =
  | { command: "submit"; text: string; mode: Mode; files: AttachedFile[] }
  | { command: "addFiles" }
  | { command: "addProject" };

export type InboundMessage =
  | { command: "setLoading"; fileName: string }
  | { command: "filesAdded"; files: AttachedFile[] }
  | { command: "analysisResult"; data: AnalysisResult; mode: Mode; files: AttachedFile[] }
  | { command: "error"; message: string };

export interface AttachedFile {
  name: string;
  content: string;
  path?: string;
}

export interface AnalysisResult {
  spaghetti_score?: number;
  security_score?: number;
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  complexity_score?: number;
  complexity_metrics?: {
    lines_of_code?: number;
    number_of_functions?: number;
    nesting_depth?: number;
    cyclomatic_complexity?: number;
  };
  explanation?: string;
  modernized_code?: string;
  modern_code?: string;
  rewritten_code?: string;
  translated_code?: string;
  translated_to?: string;
  detected_language?: string;
  warning?: string;
  suggestions?: string[];
  findings?: ApiFinding[];
  debt_items?: ApiFinding[];
  dollar_impact?: string;
  [key: string]: unknown;
}

export interface ApiFinding {
  title?: string;
  description?: string;
  severity?: string;
  impact?: string;
  file?: string;
  line?: number;
}

const vscode = acquireVsCodeApi();

export function postMessage(msg: OutboundMessage) {
  vscode.postMessage(msg);
}

export function onMessage(handler: (msg: InboundMessage) => void) {
  window.addEventListener("message", (event) => {
    handler(event.data as InboundMessage);
  });
}