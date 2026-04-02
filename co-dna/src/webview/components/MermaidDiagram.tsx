import React, { useEffect, useRef, useState } from "react";

interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  render: (
    id: string,
    definition: string
  ) => Promise<{
    svg: string;
    bindFunctions?: (element: Element) => void;
  }>;
}

let mermaidMod: MermaidAPI | null = null;
let initDone = false;

async function getMermaid(): Promise<MermaidAPI> {
  if (mermaidMod) {
    return mermaidMod;
  }
  const mod = (await import("mermaid")) as { default: MermaidAPI };
  mermaidMod = mod.default;
  if (!initDone) {
    mermaidMod.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      fontFamily:
        "var(--vscode-editor-font-family, ui-sans-serif, system-ui, sans-serif)",
      suppressErrorRendering: true,
    });
    initDone = true;
  }
  return mermaidMod;
}

function nextId() {
  return `codna-m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const host: React.CSSProperties = {
  overflowX: "auto" as const,
  maxWidth: "100%",
  padding: "8px 4px",
  background: "var(--vscode-editor-background)",
  border: "1px solid var(--vscode-panel-border, #333)",
  borderRadius: 8,
};

const errPre: React.CSSProperties = {
  fontSize: 10,
  lineHeight: 1.5,
  color: "#f87171",
  padding: "8px 10px",
  background: "rgba(248,113,113,0.08)",
  borderRadius: 6,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};

const toggle: React.CSSProperties = {
  alignSelf: "flex-start",
  fontSize: 10,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--vscode-panel-border, #555)",
  background: "transparent",
  color: "var(--vscode-descriptionForeground)",
  cursor: "pointer",
};

const srcPre: React.CSSProperties = {
  fontSize: 10,
  lineHeight: 1.45,
  padding: "8px 10px",
  background: "var(--vscode-textBlockQuote-background, #1e1e1e)",
  border: "1px solid var(--vscode-panel-border, #333)",
  borderRadius: 8,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  fontFamily: "var(--vscode-editor-font-family, monospace)",
  margin: 0,
};

export function MermaidDiagram({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const text = source.trim();
    if (!el) {
      return;
    }
    if (!text) {
      el.innerHTML = "";
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);
    el.innerHTML =
      "<p style=\"font-size:11px;opacity:0.55;margin:8px\">Rendering diagram…</p>";

    void (async () => {
      try {
        const m = await getMermaid();
        if (cancelled) {
          return;
        }
        const id = nextId();
        const { svg, bindFunctions } = await m.render(id, text);
        if (cancelled) {
          return;
        }
        const node = ref.current;
        if (!node) {
          return;
        }
        node.innerHTML = svg;
        bindFunctions?.(node);
      } catch (e) {
        if (cancelled) {
          return;
        }
        const node = ref.current;
        if (node) {
          node.innerHTML = "";
        }
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (!source.trim()) {
    return null;
  }

  return (
    <div style={wrap}>
      {error ? <pre style={errPre}>{error}</pre> : null}
      <div ref={ref} style={host} className="co-dna-mermaid-host" />
      <button
        type="button"
        style={toggle}
        onClick={() => setShowSource((v) => !v)}
      >
        {showSource ? "Hide source" : "Show Mermaid source"}
      </button>
      {showSource ? <pre style={srcPre}>{source}</pre> : null}
    </div>
  );
}
