I'm unable to write the file due to permissions. Here is the complete implementation plan:

---

# Implementation Plan — T01: Root Workspace Configuration

## 1. File Structure

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | **Modify** | Replace pipeline-engine config with npm workspaces monorepo root config |
| `tsconfig.base.json` | **Create** | Shared TypeScript compiler options inherited by all workspace packages |
| `tsconfig.json` | **Modify** | Retain for the pipeline engine source in `src/`; extend `tsconfig.base.json` |
| `.gitignore` | **Modify** | Add coverage, env files, OS artifacts to existing entries |
| `packages/.gitkeep` | **Create** | Empty directory to satisfy the `packages/*` workspace glob |

### What NOT to touch

- `src/` — existing pipeline engine code; remains as-is
- `.pipeline/` — pipeline state and specs; remains as-is
- `MASTER_PLAN.md` — read-only reference

---

## 2. Dependencies

### Packages to install (root devDependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| `concurrently` | `^9.0.0` | Run server + client dev scripts in parallel |
| `typescript` | `^5.7.0` | Already present; no change needed |

> `vitest` and `@types/node` are already present in root `devDependencies` for the pipeline engine. They remain.

### System requirements

- Node.js >= 18
- npm >= 9 (workspaces support)

---

## 3. Implementation Details

### 3.1 `package.json` (Modify)

**Purpose**: Transform the root package.json into a monorepo workspace root that also retains the pipeline engine's build/test capabilities.

**Current state**: Named `"pipeline"`, contains scripts for the pipeline engine (`build`, `typecheck`, `test`, `start`, `pipeline`), devDependencies for `typescript`, `vitest`, `@types/node`.

**Target state**:

```json
{
  "name": "taskboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently --kill-others-on-fail \"npm run dev -w @taskboard/server\" \"npm run dev -w @taskboard/client\"",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "pipeline:build": "tsc -p tsconfig.json",
    "pipeline:typecheck": "tsc -p tsconfig.json --noEmit",
    "pipeline:test": "vitest run",
    "pipeline:start": "tsc -p tsconfig.json && node dist/orchestrator.js",
    "pipeline": "tsc -p tsconfig.json && node dist/orchestrator.js"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "concurrently": "^9.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Key decisions**:

1. **Rename** `"name"` from `"pipeline"` to `"taskboard"` to reflect the project identity.
2. **Add** `"workspaces": ["packages/*"]` to enable npm workspace resolution.
3. **Namespace existing pipeline scripts** under `pipeline:` prefix to avoid collision with workspace-level `dev`/`build`/`test`.
4. **`dev` script** uses `concurrently --kill-others-on-fail` with workspace-scoped commands. These will fail gracefully until server/client packages exist (t03/t04), which is expected — t01 sets up the structure, not the packages.
5. **`build` script** uses `npm run build --workspaces --if-present` so it skips packages without a build script.
6. **`test` script** uses `npm run test --workspaces --if-present` for the same reason.
7. **Add** `concurrently` to `devDependencies`.

### 3.2 `tsconfig.base.json` (Create)

**Purpose**: Shared TypeScript compiler options that all workspace packages will extend via `"extends": "../../tsconfig.base.json"`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

**Key decisions**:

1. **`module: "Node16"` / `moduleResolution: "Node16"`** — Aligns with the existing `tsconfig.json` and supports ES modules with proper `.js` extension resolution in Node.
2. **`target: "ES2022"`** — Matches master plan requirement ("ES2022 or later").
3. **`strict: true`** — Master plan mandates strict mode everywhere.
4. **`declaration: true` + `declarationMap: true`** — Enables cross-package type resolution via workspace dependencies.
5. **`sourceMap: true`** — Enables debugging.
6. **`isolatedModules: true`** — Required for tools like Vite and esbuild that perform single-file transpilation.
7. **`verbatimModuleSyntax: true`** — Enforces explicit `import type` for type-only imports; aligns with modern TS best practices.
8. **No `outDir` or `rootDir`** — These are per-package concerns, set in each package's own `tsconfig.json`.
9. **No `paths` aliases** — npm workspaces handles cross-package resolution via `node_modules` symlinks; path aliases are unnecessary and would complicate the setup.

### 3.3 `tsconfig.json` (Modify)

**Purpose**: Retain the existing pipeline engine's TypeScript configuration but have it extend the base config to avoid duplication.

**Target state**:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Key decisions**:

1. **Extends base** to inherit shared options, reducing duplication.
2. **Retains `outDir` and `rootDir`** specific to the pipeline engine source.
3. **`include: ["src"]`** scopes compilation to the pipeline code only (excludes `packages/`).

### 3.4 `.gitignore` (Modify)

**Purpose**: Extend the existing `.gitignore` with additional patterns needed for the monorepo.

**Current state**:
```
node_modules/
dist/
logs/
.pipeline/tmp/
```

**Additions**:
```
# Environment
.env
.env.local
.env.*.local

# Coverage
coverage/

# OS artifacts
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# TypeScript incremental
*.tsbuildinfo
```

### 3.5 `packages/.gitkeep` (Create)

**Purpose**: The workspace glob `"packages/*"` requires this directory to exist. It will be empty until t02/t03/t04 create sub-packages.

**Contents**: Empty file.

---

## 4. API Contracts

N/A — This task creates configuration files only; no API endpoints.

---

## 5. Test Plan

This task produces configuration files, not application code. Verification is done via structural and compilation checks rather than unit tests.

### 5.1 Structural verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Workspaces field exists | `node -e "..."` (parse package.json, assert `workspaces` is array) | No error |
| `packages/` directory exists | `test -d packages` | Exit 0 |
| `tsconfig.base.json` exists | `test -f tsconfig.base.json` | Exit 0 |
| Required scripts exist | `node -e "..."` (parse package.json, assert `dev`, `build`, `test` exist) | No error |

### 5.2 TypeScript compilation

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Pipeline engine still compiles | `npx tsc -p tsconfig.json --noEmit` | Exit code 0, no errors |

### 5.3 Dependency installation

| Check | Command | Expected Result |
|-------|---------|-----------------|
| `npm install` succeeds from root | `npm install` | Exit code 0 |
| `concurrently` is available | `npx concurrently --version` | Prints version number |

---

## 6. Implementation Order

```
Step 1: Create packages/.gitkeep
         |
Step 2: Create tsconfig.base.json
         |
Step 3: Modify tsconfig.json (extend base)
         |
Step 4: Verify pipeline engine still compiles:
         npx tsc -p tsconfig.json --noEmit
         |
Step 5: Modify package.json (add workspaces, scripts, concurrently)
         |
Step 6: Run npm install (installs concurrently)
         |
Step 7: Modify .gitignore (add new patterns)
         |
Step 8: Run all verification commands
```

**Rationale for ordering**:

- **Steps 1-2**: Create the new files first (no existing files affected).
- **Step 3**: Modify `tsconfig.json` to extend the base — this is the riskiest change since it could break the pipeline engine compilation.
- **Step 4**: Verify immediately after the risky change — if the pipeline engine breaks, fix before proceeding.
- **Step 5**: Modify `package.json` — adds workspace config and new scripts.
- **Step 6**: `npm install` — resolves the new `concurrently` dependency and validates workspace configuration.
- **Step 7**: `.gitignore` — low-risk, append-only change.
- **Step 8**: Full verification pass.

---

## 7. Verification Commands

Run these in order after implementation is complete:

```bash
# 1. Verify packages directory exists
test -d packages && echo "packages/ OK"

# 2. Verify tsconfig.base.json exists and has strict mode
node -e "
  const fs = require('fs');
  const ts = JSON.parse(fs.readFileSync('tsconfig.base.json','utf8'));
  if (ts.compilerOptions.strict !== true) throw 'strict not enabled';
  if (ts.compilerOptions.target !== 'ES2022') throw 'wrong target';
  console.log('tsconfig.base.json OK');
"

# 3. Verify pipeline engine still compiles against modified tsconfig.json
npx tsc -p tsconfig.json --noEmit

# 4. Verify npm install succeeds (validates workspace config)
npm install

# 5. Verify concurrently is installed
npx concurrently --version

# 6. Verify package.json has workspaces field
node -e "
  const p = JSON.parse(require('fs').readFileSync('package.json','utf8'));
  if (!Array.isArray(p.workspaces) || p.workspaces[0] !== 'packages/*') process.exit(1);
  console.log('workspaces OK:', p.workspaces);
"

# 7. Verify required scripts exist
node -e "
  const p = JSON.parse(require('fs').readFileSync('package.json','utf8'));
  ['dev','build','test'].forEach(s => {
    if (!p.scripts[s]) { console.error('Missing script:', s); process.exit(1); }
  });
  console.log('scripts OK');
"

# 8. Verify .gitignore contains essential patterns
grep -q 'node_modules' .gitignore && grep -q '.env' .gitignore && grep -q 'dist' .gitignore && echo ".gitignore OK"
```

**All 8 checks must pass for the task to be considered complete.**

---

Would you like me to save this plan to `.pipeline/milestones/m01/phases/p01/tasks/t01/plan.md`? (The write was blocked by permissions on previous attempts.)