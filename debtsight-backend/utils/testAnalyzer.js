function normalizePaths(paths) {
  if (!Array.isArray(paths)) return [];
  return paths
    .filter((p) => typeof p === "string")
    .map((p) => p.replace(/\\/g, "/"));
}

function detectByPaths(paths) {
  const p = normalizePaths(paths);
  const testFileRe =
    /(\.test\.js$|\.spec\.js$)|(^|\/)test(\/|$)|(^|\/)(tests|__tests__)(\/|$)/i;
  return p.filter((x) => testFileRe.test(x));
}

function detectByCode(code) {
  const s = String(code || "");
  // Common JS test frameworks
  return /\b(describe|it|test)\s*\(/.test(s) || /\bexpect\s*\(/.test(s);
}

export function analyzeTests({ code, project_files } = {}) {
  const matchedTestFiles = detectByPaths(project_files);
  const hasTests =
    matchedTestFiles.length > 0 || detectByCode(code);

  if (!hasTests) {
    return {
      has_tests: false,
      coverage_estimate: 0,
      test_files_count: 0,
      code_files_count: 0,
    };
  }

  const paths = normalizePaths(project_files);
  const testFiles = matchedTestFiles.length > 0 ? matchedTestFiles : [];
  const codeFiles = paths.filter((x) => /\.(js|jsx|ts|tsx)$/.test(x));
  const codeFilesExcludingTests = codeFiles.filter(
    (x) => !testFiles.includes(x)
  );

  const t = testFiles.length || 1; // if detected via code sniffing only, assume at least 1
  const c = Math.max(1, codeFilesExcludingTests.length);
  const ratio = t / c;

  // 40–80 based on test-to-code ratio (cap at 1.0)
  const coverage_estimate = Math.round(
    40 + Math.min(1, ratio) * 40
  );

  return {
    has_tests: true,
    coverage_estimate,
    test_files_count: testFiles.length,
    code_files_count: codeFilesExcludingTests.length,
  };
}

