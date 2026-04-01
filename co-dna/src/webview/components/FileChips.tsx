import React from "react";

export interface FileChip {
  name: string;
  type: "file" | "project";
}

interface FileChipsProps {
  files: FileChip[];
  onRemove: (name: string) => void;
}

export function FileChips({ files, onRemove }: FileChipsProps) {
  if (files.length === 0) return null;

  return (
    <div style={styles.wrap}>
      {files.map((f) => (
        <div key={f.name} style={styles.chip}>
          <span style={styles.chipIcon}>
            {f.type === "project" ? "📁" : "📄"}
          </span>
          <span style={styles.chipName} title={f.name}>
            {f.name.length > 18 ? f.name.slice(0, 16) + "…" : f.name}
          </span>
          <button
            style={styles.removeBtn}
            onClick={() => onRemove(f.name)}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 5,
    padding: "4px 0 2px",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-panel-border, #444)",
    borderRadius: 6,
    padding: "3px 6px",
    fontSize: 11,
    color: "var(--vscode-foreground)",
    maxWidth: 160,
  },
  chipIcon: { fontSize: 11, flexShrink: 0 },
  chipName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    opacity: 0.85,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--vscode-descriptionForeground)",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
    marginLeft: 2,
    flexShrink: 0,
    opacity: 0.6,
  },
};