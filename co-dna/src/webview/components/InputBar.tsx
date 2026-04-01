import React, { useRef, useState } from "react";
import { AttachedFile, Mode } from "../vscode";

interface FileChipProps {
  file: AttachedFile;
  onRemove: (name: string) => void;
}

function FileChip({ file, onRemove }: FileChipProps) {
  return (
    <div style={s.chip}>
      <span style={s.chipIcon}>
        {file.name.endsWith(".json") ? "📦" : "📄"}
      </span>
      <span style={s.chipName} title={file.name}>
        {file.name.length > 18 ? file.name.slice(0, 16) + "…" : file.name}
      </span>
      <button style={s.chipRemove} onClick={() => onRemove(file.name)}>
        ×
      </button>
    </div>
  );
}

interface InputBarProps {
  mode: Mode;
  onSubmit: (text: string) => void;
  onAddProject: () => void;
  onAddFiles: () => void;
  files: AttachedFile[];
  onRemoveFile: (name: string) => void;
}

const PLACEHOLDERS: Record<Mode, string> = {
  scan: "Describe what to scan, or just hit send…",
  explain: "Ask about any function or module…",
  modernize: "Describe the refactor you want…",
  rewrite: "Optional notes (full file rewrite via AI)…",
  translate:
    "Target language, e.g. Python, Go — or leave empty for Auto (recommended)…",
};

const MODE_LABEL: Record<Mode, string> = {
  scan: "⚙ Scan",
  explain: "💬 Explain",
  modernize: "✨ Modernize",
  rewrite: "🔄 Rewrite",
  translate: "🌐 Translate",
};

export function InputBar({
  mode,
  onSubmit,
  onAddProject,
  onAddFiles,
  files,
  onRemoveFile,
}: InputBarProps) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setText(el.value);
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 80) + "px";
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    // Allow submit even with empty text — extension will use the open editor
    onSubmit(trimmed || `Analyse this code`);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div style={s.bar}>
      {/* File chips */}
      {files.length > 0 && (
        <div style={s.chips}>
          {files.map((f) => (
            <FileChip key={f.name} file={f} onRemove={onRemoveFile} />
          ))}
        </div>
      )}

      {/* No files hint */}
      {files.length === 0 && (
        <p style={s.hint}>Uses active editor file · or attach via +</p>
      )}

      {/* Input row */}
      <div
        style={{
          ...s.inputWrap,
          ...(text ? s.inputFocused : {}),
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          placeholder={PLACEHOLDERS[mode]}
          onChange={handleInput}
          onKeyDown={handleKey}
          style={s.textarea}
        />
        <div style={s.actions}>
          {/* Attach menu */}
          <div style={{ position: "relative" }}>
            <button
              style={s.iconBtn}
              title="Attach files"
              onClick={() => setMenuOpen((o) => !o)}
            >
              ＋
            </button>
            {menuOpen && (
              <div style={s.menu}>
                <button
                  style={s.menuItem}
                  onClick={() => {
                    onAddProject();
                    setMenuOpen(false);
                  }}
                >
                  <span>📁</span> Add Project
                </button>
                <button
                  style={s.menuItem}
                  onClick={() => {
                    onAddFiles();
                    setMenuOpen(false);
                  }}
                >
                  <span>📄</span> Add Files
                </button>
              </div>
            )}
          </div>

          {/* Send */}
          <button style={s.sendBtn} onClick={submit} title="Send (⌘↵)">
            ↑
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span style={s.modePill}>{MODE_LABEL[mode]}</span>
        <span style={s.shortcut}>⌘↵ to send</span>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bar: {
    flexShrink: 0,
    padding: "8px 12px 12px",
    borderTop: "1px solid var(--vscode-panel-border, #333)",
    background: "var(--vscode-sideBar-background)",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  chips: { display: "flex", flexWrap: "wrap" as const, gap: 4 },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #444)",
    borderRadius: 6,
    padding: "2px 6px",
    fontSize: 11,
    color: "var(--vscode-foreground)",
    maxWidth: 160,
  },
  chipIcon: { fontSize: 10, flexShrink: 0 },
  chipName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    opacity: 0.85,
  },
  chipRemove: {
    background: "transparent",
    border: "none",
    color: "var(--vscode-descriptionForeground)",
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
    padding: 0,
    opacity: 0.6,
  },
  hint: {
    fontSize: 10,
    color: "var(--vscode-descriptionForeground)",
    opacity: 0.4,
    textAlign: "center" as const,
    padding: "2px 0",
  },
  inputWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    background: "var(--vscode-input-background)",
    border: "1px solid var(--vscode-input-border, #555)",
    borderRadius: 10,
    padding: "6px 6px 6px 10px",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  inputFocused: {
    borderColor: "#f97316",
    boxShadow: "0 0 0 2px rgba(249,115,22,0.15)",
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    color: "var(--vscode-input-foreground)",
    fontSize: 12,
    fontFamily: "inherit",
    lineHeight: 1.5,
    minHeight: 18,
    maxHeight: 80,
    overflowY: "auto" as const,
  },
  actions: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "var(--vscode-descriptionForeground)",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    border: "none",
    background: "#f97316",
    color: "white",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.12s",
  },
  menu: {
    position: "absolute",
    bottom: "calc(100% + 6px)",
    right: 0,
    background: "var(--vscode-menu-background, #252526)",
    border: "1px solid var(--vscode-menu-border, #454545)",
    borderRadius: 8,
    overflow: "hidden",
    minWidth: 160,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    zIndex: 100,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    fontSize: 12,
    cursor: "pointer",
    color: "var(--vscode-foreground)",
    background: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left" as const,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2px",
  },
  modePill: {
    fontSize: 10,
    color: "var(--vscode-descriptionForeground)",
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid var(--vscode-panel-border, #444)",
  },
  shortcut: {
    fontSize: 10,
    color: "var(--vscode-descriptionForeground)",
    opacity: 0.4,
  },
};
