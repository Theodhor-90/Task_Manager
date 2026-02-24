## Objective

Verify the full authentication flow works end-to-end across server and client, ensure no regressions, and clean up any dead code.

## Deliverables

- **End-to-end auth flow verification** — Confirm the following sequence works:
  1. Server starts, seed user exists
  2. Client navigates to `/` → redirected to `/login`
  3. Login with `admin@taskboard.local` / `admin123` → redirected to dashboard
  4. Dashboard shows "Welcome, Admin" and logout button
  5. Refresh page → token persists, dashboard still renders
  6. Logout → redirected to `/login`, localStorage cleared
  7. Navigate to `/` while logged out → redirected to `/login`

- **Test suite verification**:
  - Run all existing tests (models, seed, app) — confirm no regressions
  - Run auth integration tests — confirm all 8 pass

- **Cleanup**:
  - Remove the unused `import type { Task }` and `import { DEFAULT_COLUMNS }` from `app.ts` if they are no longer needed after route restructuring

- **Dev environment check**:
  - Confirm `npm run dev` starts both server and client concurrently with no errors

## Key Implementation Details

- This is a verification and cleanup task — no new features.
- The e2e flow should be tested manually by starting the dev environment.
- All 13 exit criteria from the phase spec should be validated.
- Any unused imports or dead code introduced during the phase should be removed.

## Dependencies

- **t01 through t07** — All prior tasks must be complete.

## Verification Criteria

1. Full auth flow (login → dashboard → refresh → logout → redirect) works end-to-end.
2. All pre-existing tests (models, seed, app) pass with zero failures.
3. All 8 auth integration tests pass with zero failures.
4. `npm run dev` starts both server and client concurrently with no errors.
5. No unused imports or dead code remain in modified files.
6. All 13 phase exit criteria are met.