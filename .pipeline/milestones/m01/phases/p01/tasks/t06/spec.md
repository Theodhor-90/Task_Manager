## Task: Test infrastructure verification

### Objective

Set up and verify the test infrastructure across the monorepo by adding trivial tests in the shared and server packages and confirming that `npm run test` works from the root.

### Deliverables

1. **Trivial test in `packages/shared/`** — A simple test that imports and validates a type or constant from the shared package (e.g., verify `PRIORITIES` array has 4 entries, verify `DEFAULT_COLUMNS` has expected values)

2. **Trivial test in `packages/server/`** — A simple test (e.g., unit test that the app factory returns a Fastify instance, or that the config module returns expected defaults)

3. **Root `test` script verification** — `npm run test` from root executes tests across all packages using Vitest

4. **Vitest configuration** — Ensure Vitest is configured for both shared and server packages (add vitest config to shared if not already present)

### Files to Create

- `packages/shared/src/__tests__/constants.test.ts` (or `packages/shared/test/constants.test.ts`)
- `packages/server/test/app.test.ts` (or `packages/server/src/__tests__/app.test.ts`)
- `packages/shared/vitest.config.ts` (if not already present)

### Files to Modify

- Root `package.json` — ensure `test` script runs Vitest across workspaces
- Any `package.json` in sub-packages if test scripts need updating

### Constraints

- Tests should be trivial — the purpose is to verify the test infrastructure works, not to test business logic
- Use Vitest as the test runner (as specified in the master plan tech stack)
- Tests must pass reliably (no flaky or environment-dependent tests)
- Follow project conventions: test files in `test/` directories or co-located as `*.test.ts`

### Dependencies

- **t01** (Root workspace configuration)
- **t02** (Shared package scaffold) — tests import from shared
- **t03** (Server package scaffold) — tests exercise the server app factory
- **t05** (Cross-package imports and build verification) — ensures imports work before writing tests that depend on them

### Verification Criteria

1. `npm run test` from root succeeds and runs tests in both shared and server packages
2. At least one test passes in `packages/shared/`
3. At least one test passes in `packages/server/`
4. Vitest configuration is correct and discoverable in both packages
5. Test output shows all tests passing with zero failures