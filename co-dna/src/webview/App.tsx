import React, { useState, useEffect } from "react";
import "./index.css";
import { TabBar } from "./components/TabBar";
import { InputBar } from "./components/InputBar";
import { EmptyState } from "./components/EmptyState";
import { LoadingState } from "./components/LoadingState";
import { RealResultsPanel } from "./components/RealResultsPanel";
import {
  postMessage, onMessage,
  Mode, AttachedFile, AnalysisResult, InboundMessage,
} from "./vscode";

type ViewState = "empty" | "loading" | "results" | "error";

export function App() {
  const [mode, setMode] = useState<Mode>("scan");
  const [view, setView] = useState<ViewState>("empty");
  const [loadingFile, setLoadingFile] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [resultMode, setResultMode] = useState<Mode>("scan");
  const [resultFiles, setResultFiles] = useState<AttachedFile[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    onMessage((msg: InboundMessage) => {
      switch (msg.command) {
        case "setLoading":
          setView("loading");
          setLoadingFile(msg.fileName);
          break;

        case "filesAdded":
          setAttachedFiles((prev) => {
            const existing = new Set(prev.map((f) => f.name));
            const newOnes = msg.files.filter((f) => !existing.has(f.name));
            return [...prev, ...newOnes];
          });
          break;

        case "analysisResult":
          setResults(msg.data);
          setResultMode((msg.mode as Mode) ?? mode);
          setResultFiles(msg.files);
          setView("results");
          break;

        case "error":
          setErrorMsg(msg.message);
          setView("error");
          break;
      }
    });
  }, []);

  const handleSubmit = (text: string) => {
    postMessage({ command: "submit", text, mode, files: attachedFiles });
    setView("loading");
    setLoadingFile(attachedFiles[0]?.name ?? "your code");
  };

  const handleAddFiles = () => postMessage({ command: "addFiles" });
  const handleAddProject = () => postMessage({ command: "addProject" });
  const handleRemoveFile = (name: string) =>
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));

  const handleModeChange = (m: Mode) => setMode(m);

  return (
    <div style={styles.shell}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>⚡</div>
          <span style={styles.logoText}>CO-DNA</span>
          <span style={styles.logoBadge}>Beta</span>
        </div>
        <TabBar active={mode} onChange={handleModeChange} />
      </div>

      {/* Content area */}
      <div style={styles.content}>
        {view === "empty" && <EmptyState mode={mode} />}
        {view === "loading" && <LoadingState fileName={loadingFile} />}

        {view === "error" && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorTitle}>Analysis failed</p>
            <p style={styles.errorMsg}>{errorMsg}</p>
            <button style={styles.retryBtn} onClick={() => setView("empty")}>
              Try again
            </button>
          </div>
        )}

        {view === "results" && results && (
          <RealResultsPanel data={results} mode={resultMode} files={resultFiles} />
        )}
      </div>

      {/* Input bar */}
      <InputBar
        mode={mode}
        onSubmit={handleSubmit}
        onAddProject={handleAddProject}
        onAddFiles={handleAddFiles}
        files={attachedFiles}
        onRemoveFile={handleRemoveFile}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex", flexDirection: "column",
    height: "100vh", overflow: "hidden", background: "transparent",
  },
  header: {
    padding: "14px 14px 10px",
    borderBottom: "1px solid var(--vscode-panel-border, #333)",
    flexShrink: 0, display: "flex", flexDirection: "column", gap: 10,
  },
  logoRow: { display: "flex", alignItems: "center", gap: 8 },
  logoIcon: {
    width: 22, height: 22,
    background: "linear-gradient(135deg, #f97316, #ef4444)",
    borderRadius: 6, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 12, flexShrink: 0,
  },
  logoText: { fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" },
  logoBadge: {
    marginLeft: "auto", fontSize: 9, fontWeight: 600,
    letterSpacing: "0.05em", color: "#f97316",
    background: "rgba(249,115,22,0.12)",
    border: "1px solid rgba(249,115,22,0.3)",
    borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" as const,
  },
  content: {
    flex: 1, overflowY: "auto" as const, padding: "12px 14px",
    scrollbarWidth: "thin" as const,
  },
  errorBox: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, padding: "32px 20px", textAlign: "center",
  },
  errorIcon: { fontSize: 28 },
  errorTitle: { fontSize: 13, fontWeight: 600, color: "#ef4444" },
  errorMsg: {
    fontSize: 11, color: "var(--vscode-descriptionForeground)",
    opacity: 0.7, lineHeight: 1.55,
  },
  retryBtn: {
    marginTop: 6, padding: "5px 16px", fontSize: 11,
    borderRadius: 6, border: "1px solid var(--vscode-panel-border, #555)",
    background: "transparent", color: "var(--vscode-foreground)",
    cursor: "pointer",
  },
};
