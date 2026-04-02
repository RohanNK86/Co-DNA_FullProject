# Co-DNA extension — troubleshooting (macOS / team setups)

## TypeScript errors like TS1010 inside `node_modules/typescript/lib/*.d.ts`

Those files are **published by Microsoft** and should be complete. If the compiler points *inside* `lib.decorators.d.ts` (or similar) with a parse error, the install is almost always **corrupted on disk**, not a bug in your `src/` code.

### Why this keeps coming back

1. **Cloud‑synced project folders** (iCloud Drive, Dropbox, OneDrive, Google Drive) — they can partially sync or “merge” thousands of small files under `node_modules` and leave **truncated** files.
2. **Unzipping copies** (e.g. `debtsight-ai 2`, `debtsight-ai 3` under **Downloads**) — duplicate trees + interrupted copies cause the same issue.
3. **Copy/paste of `node_modules` from Windows → Mac** (or machine to machine) — **never** copy `node_modules`; always reinstall on each OS.
4. **Interrupted `npm install`** (sleep, VPN drop, closed lid) — rare but can leave a half-written package.
5. **Antivirus / quarantine** on downloaded archives — occasionally affects extracted `node_modules`.

### Fix (safe sequence)

From the **extension root** (`co-dna/`, or `Co-DNA-main/` if that is your clone):

```bash
rm -rf node_modules
npm cache verify
# If you use git and lockfile is good:
git checkout -- package-lock.json
npm ci
```

If you do **not** use the repo lockfile, use `npm install` once after removing `node_modules`.

Then:

```bash
npm run check-types
npm run compile
```

### Prevent recurrence

- Keep the repo in a normal folder, e.g. `~/Projects/Co-DNA_FullProject`, **not** Desktop/Documents if those sync with iCloud.
- **One** clone; **pull from GitHub** instead of making new Downloads zip copies.
- Commit and share **`package-lock.json`**; on Mac/Linux use **`npm ci`** for repeatable installs.
- This repo pins **`typescript`** to an exact version and uses **`npm overrides`** for known dev‑tool advisories (see `package.json`).

## `npm audit` and `npm audit fix --force`

`--force` may **downgrade** `@vscode/test-cli` and break the VS Code test runner. Prefer the **`overrides`** in `package.json` (then `npm install`) so patched transitive versions are used without forcing a breaking downgrade.

## “Permission denied” on `node_modules/.bin/tsc` (macOS)

Use the scripts in `package.json` (they call `node …/typescript/lib/tsc.js` and `node …/eslint/bin/eslint.js`). If issues persist: `chmod +x node_modules/.bin/*` or `xattr -cr .` after copying from Downloads.
