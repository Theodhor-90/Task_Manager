## Task: Root workspace configuration

### Objective

Initialize the npm workspaces monorepo root with workspace configuration, shared TypeScript config, and orchestration scripts.

### Deliverables

1. **Root `package.json`** with:
   - `"workspaces": ["packages/*"]`
   - `"private": true`
   - Scripts:
     - `dev` — runs server and client concurrently using the `concurrently` package with `--kill-others-on-fail` flag
     - `build` — builds all packages
     - `test` — runs tests across all packages
   - Dev dependencies: `concurrently`, `typescript`

2. **`tsconfig.base.json`** at repo root with shared compiler options:
   - TypeScript strict mode enabled
   - ES modules (`"module": "ESNext"` or equivalent)
   - Path aliases for cross-package imports
   - Target ES2022 or later

3. **`.gitignore`** covering `node_modules/`, `dist/`, build artifacts, and logs

### Files to Create

- `package.json` (root)
- `tsconfig.base.json`
- `.gitignore` (if not already present, verify/update)

### Constraints

- TypeScript strict mode everywhere, ES modules (import/export, no require)
- File naming convention: kebab-case for files
- Requires Node.js >= 18 and npm >= 9 with workspaces support
- The `concurrently` package must use `--kill-others-on-fail` for clean shutdown of dev servers

### Dependencies

- None — this is the first task of the first phase of the first milestone

### Verification Criteria

1. `package.json` at root has valid `workspaces` field pointing to `packages/*`
2. `tsconfig.base.json` compiles with strict mode enabled and ES module configuration
3. Root `package.json` contains `dev`, `build`, and `test` scripts
4. `.gitignore` excludes `node_modules/`, `dist/`, and log files