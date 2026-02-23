Implemented the locked plan exactly and ran all verification commands successfully.

Changed files:
- `packages/shared/package.json`
- `packages/shared/vitest.config.ts`
- `packages/shared/src/__tests__/constants.test.ts`
- `packages/server/test/app.test.ts`
- `package-lock.json` (from `npm install`)

What was implemented:
- Added shared package test infrastructure:
  - `test` script: `vitest run`
  - `devDependencies.vitest`: `^3.0.0`
  - Vitest config with `environment: "node"`
- Added shared trivial constants tests (4 tests) for `PRIORITIES` and `DEFAULT_COLUMNS`.
- Added server trivial tests (3 tests) for:
  - `buildApp()` instance shape
  - `/api/health` endpoint response
  - `config` default values

Verification run (all passed):
1. `npm install`
2. `npm run test -w @taskboard/shared` (4/4 passing)
3. `npm run test -w @taskboard/server` (3/3 passing)
4. `npm run test` (7/7 passing across both packages)
5. All plan-provided Node assertion checks (commands 5–10) passed with `OK` outputs.