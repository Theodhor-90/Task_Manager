Implemented fixes for all review findings.

### Changes made

1. Fixed workspace build/test failure when no workspace packages exist yet.
- Updated `package.json` scripts:
  - `build`: `node ./scripts/run-workspaces.mjs build`
  - `test`: `node ./scripts/run-workspaces.mjs test`
- Added `scripts/run-workspaces.mjs` to:
  - detect valid workspace packages under `packages/*`
  - run `npm run <script> --workspaces --if-present` when present
  - exit successfully with a clear skip message when none exist

Files:
- `package.json`
- `scripts/run-workspaces.mjs`

2. Added required TypeScript path alias configuration.
- Added `baseUrl` and `paths` in `tsconfig.base.json`:
  - `"baseUrl": "."`
  - `"paths": { "@taskboard/*": ["packages/*/src"] }`

File:
- `tsconfig.base.json`

### Verification run (all passed)

Executed:
- ESM validation of `package.json` fields
- ESM validation of `tsconfig.base.json` fields (including alias checks)
- `npm install`
- `npx tsc --version`
- `npx concurrently --version`
- `.gitignore` pattern checks (`node_modules`, `dist`, `logs`)
- `npm run build`
- `npm test`

Result:
- All commands exited with code `0`.
- `build` and `test` now succeed in current repo state by skipping cleanly when no workspace packages are present.