Now I have all the context needed. Let me produce the implementation plan.

# Task 1 Plan — Install `react-markdown`

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/package.json` | **Modify** | Add `react-markdown` to production `dependencies` |
| 2 | `packages/client/node_modules/react-markdown/` | **Created by npm** | The installed package and its transitive dependencies |

---

## 2. Dependencies

- **None** — this is the first task in Phase 3 and has no prerequisite tasks.
- **Runtime prerequisite**: `react` (already installed as `^19.0.0` in the client package). `react-markdown` v9+ supports React 18/19.
- **Tool prerequisite**: `npm` available at the project root for workspace-aware installation.

---

## 3. Implementation Details

### 3.1 Install the package

Run from the project root:

```bash
npm install react-markdown -w packages/client
```

This will:
- Resolve the latest stable `react-markdown` (currently v9.x) and its transitive dependencies (`remark-parse`, `remark-rehype`, `rehype-raw`, `unified`, etc.)
- Add `"react-markdown": "^9.x.x"` (exact version TBD by npm) to the `dependencies` section of `packages/client/package.json`
- Update the root `package-lock.json`
- Install files into `node_modules/`

### 3.2 What NOT to do

- Do **not** install `@types/react-markdown` — `react-markdown` v9 ships its own TypeScript type declarations.
- Do **not** install `remark-gfm` or any remark/rehype plugins — the phase spec only requires basic markdown rendering via `react-markdown`; GitHub-flavored markdown extensions are out of scope.
- Do **not** add any source code changes — no components or imports are created in this task. Code that uses `react-markdown` is covered by Task 5 (Markdown Description Editor with Preview Toggle).

---

## 4. Contracts

Not applicable — this task is a dependency installation with no code interfaces.

---

## 5. Test Plan

This task requires no new test files. Verification is purely operational:

| # | Verification | Method | Expected Result |
|---|-------------|--------|-----------------|
| 1 | Dependency listed in package.json | Inspect `packages/client/package.json` → `dependencies` | `"react-markdown"` key exists with a semver range (e.g., `"^9.0.0"`) |
| 2 | Package resolves in workspace | Run `npm ls react-markdown -w packages/client` | Shows `react-markdown@9.x.x` without `MISSING` or `ERR` |
| 3 | Client compiles | Run `npm run build -w packages/client` | TypeScript type check (`tsc --noEmit`) and Vite build succeed with exit code 0 |
| 4 | Existing tests still pass | Run `npm run test -w packages/client` | All existing tests pass — no regressions from the new dependency |
| 5 | Dev server starts | Run `npm run dev -w packages/client` (manual spot-check) | Vite dev server starts on port 5173 without errors |

Tests 1–4 are the automated/scriptable checks. Test 5 is an optional manual confirmation.

---

## 6. Implementation Order

1. **Step 1**: Run `npm install react-markdown -w packages/client` from the project root
2. **Step 2**: Verify `packages/client/package.json` now includes `react-markdown` in `dependencies`
3. **Step 3**: Run `npm ls react-markdown -w packages/client` to confirm clean resolution
4. **Step 4**: Run `npm run build -w packages/client` to verify the client still compiles
5. **Step 5**: Run `npm run test -w packages/client` to verify no regressions in existing tests

---

## 7. Verification Commands

```bash
# 1. Install the dependency
npm install react-markdown -w packages/client

# 2. Confirm it's listed in package.json
node -e "const pkg = require('./packages/client/package.json'); console.log('react-markdown:', pkg.dependencies['react-markdown'])"

# 3. Verify clean resolution in the workspace
npm ls react-markdown -w packages/client

# 4. Verify client compiles (TypeScript + Vite build)
npm run build -w packages/client

# 5. Verify existing tests still pass
npm run test -w packages/client
```

All five commands should exit with code 0 for the task to be considered complete.