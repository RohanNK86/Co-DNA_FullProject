/**
 * Lightweight heuristic language detection from source text.
 */
export function detectLanguage(code) {
  const s = String(code || "");
  if (!s.trim()) {
    return "Unknown";
  }

  if (/^\s*#include\s*</m.test(s) || /\bstd::\w+/.test(s)) {
    return "C++";
  }
  if (/\bpublic\s+static\s+void\s+main\s*\(/.test(s) || /\bimport\s+java\./.test(s)) {
    return "Java";
  }
  if (/\bpackage\s+main\b/.test(s) && /\bimport\s*\(/.test(s)) {
    return "Go";
  }
  if (/\bfn\s+\w+\s*\(/.test(s) && /\b(let|mut|pub)\b/.test(s)) {
    return "Rust";
  }
  if (/^\s*def\s+\w+\s*\([^)]*\)\s*:/m.test(s)) {
    return "Python";
  }
  if (/<\?php\b/.test(s)) {
    return "PHP";
  }
  if (/^\s*class\s+\w+/.test(s) && /\bdef\s+\w+/.test(s) && /^\s*end\s*$/m.test(s)) {
    return "Ruby";
  }
  if (/\b(function|const|let|var)\b/.test(s) && /=>/.test(s)) {
    if (/:\s*(string|number|boolean|void)\b/.test(s) || /\b(interface|type)\s+\w+/.test(s)) {
      return "TypeScript";
    }
    return "JavaScript";
  }
  if (/\b(function|const|let|var)\b/.test(s) && /\bconsole\.(log|error|warn)\b/.test(s)) {
    return "JavaScript";
  }

  return "Unknown";
}
