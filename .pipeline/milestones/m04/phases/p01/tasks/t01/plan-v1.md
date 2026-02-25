Now I have all the context I need. Let me produce the implementation plan.

# Task 1: Install `@dnd-kit` Dependencies — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/package.json` | Modified | Add `@dnd-kit/core` and `@dnd-kit/sortable` to `dependencies` |
| 2 | `packages/client/node_modules/` (transient) | Generated | Installed packages resolved in node_modules |

## 2. Dependencies

- **None** — this is the first task in the phase. The existing monorepo, client package, and dev environment from Milestones 1–3 are already in place.

## 3. Implementation Details

### 3.1 `packages/client/package.json`

**Purpose**: Declare `@dnd-kit/core` and `@dnd-kit/sortable` as production dependencies of the client package.

**What changes**:

Add two entries to the `dependencies` section:

```json
"dependencies": {
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@remix-run/router": "https://registry.npmjs.org/@remix-run/router/-/router-1.8.0.tgz",
  "@taskboard/shared": "*",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router": "https://registry.npmjs.org/react-router/-/react-router-6.15.0.tgz",
  "react-router-dom": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-6.15.0.tgz"
}
```

**Key details**:
- The packages are specified in the master plan tech stack as `@dnd-kit/core` + `@dnd-kit/sortable`
- Install from within the `packages/client` directory (or use `--workspace=@taskboard/client` from root) so the dependencies are scoped to the client package
- Use the latest stable versions available at install time (the `^` caret range allows compatible minor/patch updates)
- These are **production** dependencies (not devDependencies) because they ship runtime code used in the React application

**No code changes** — this task is purely a dependency installation. No source files are created or modified beyond `package.json` and the lockfile.

## 4. Contracts

Not applicable — no code is produced in this task.

## 5. Test Plan

This task has no unit tests. Verification is done via the commands below.

### 5.1 Verification checks

| # | Check | Expected result |
|---|-------|----------------|
| 1 | `@dnd-kit/core` listed in `packages/client/package.json` under `dependencies` | Present with a version specifier |
| 2 | `@dnd-kit/sortable` listed in `packages/client/package.json` under `dependencies` | Present with a version specifier |
| 3 | `npm ls @dnd-kit/core @dnd-kit/sortable` from project root | Both packages resolve without errors or `UNMET DEPENDENCY` warnings |
| 4 | Client dev server starts without errors | `npm run dev` from `packages/client` (or root concurrent dev) launches Vite without import resolution or compilation errors |
| 5 | TypeScript compilation passes | `npx tsc --noEmit` from `packages/client` completes with exit code 0 |
| 6 | Existing client tests still pass | `npm run test --workspace=@taskboard/client` exits with all tests passing |

## 6. Implementation Order

1. **Install packages**: Run `npm install @dnd-kit/core @dnd-kit/sortable` from `packages/client` (or equivalently `npm install @dnd-kit/core @dnd-kit/sortable --workspace=@taskboard/client` from the project root)
2. **Verify `package.json`**: Confirm the two packages appear in `packages/client/package.json` under `dependencies`
3. **Verify resolution**: Run `npm ls @dnd-kit/core @dnd-kit/sortable` from the project root to confirm they resolve without errors
4. **Verify compilation**: Run `npx tsc --noEmit` from `packages/client` to confirm no TypeScript errors were introduced
5. **Verify dev server**: Start the client dev server and confirm it boots without errors
6. **Verify existing tests**: Run `npm run test --workspace=@taskboard/client` to confirm no test regressions

## 7. Verification Commands

```bash
# 1. Install the packages (from project root using workspace flag)
npm install @dnd-kit/core @dnd-kit/sortable --workspace=@taskboard/client

# 2. Verify packages are in package.json
grep -E "@dnd-kit/(core|sortable)" packages/client/package.json

# 3. Verify resolution in dependency tree
npm ls @dnd-kit/core @dnd-kit/sortable

# 4. Verify TypeScript compilation
cd packages/client && npx tsc --noEmit && cd ../..

# 5. Verify client dev server starts (start and then Ctrl+C after confirming)
cd packages/client && npm run dev

# 6. Verify existing tests pass
npm run test --workspace=@taskboard/client
```