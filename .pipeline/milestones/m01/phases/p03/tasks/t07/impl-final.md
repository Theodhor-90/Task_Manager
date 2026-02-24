Implemented task `t07` exactly per the locked plan.

### Changed files
- [App.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/App.tsx)
- [login-page.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/pages/login-page.tsx)
- [dashboard-page.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/pages/dashboard-page.tsx)
- [board-page.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/pages/board-page.tsx)

### What was implemented
- Added full login page with:
  - email/password form
  - submit loading/disabled state
  - error display on failed login
  - redirect to `/` on success
  - redirect to `/` if already authenticated
  - loading screen while auth context is validating
- Added placeholder dashboard page:
  - shows `Welcome, {user?.name}`
  - includes `Logout` button calling `logout()`
- Extracted board placeholder into its own page file (content preserved).
- Updated `App.tsx` to import pages from `pages/` and removed inline page component definitions.
- No new dependencies were required (none installed).

### Verification run
- `npx tsc --noEmit -p packages/client/tsconfig.json` passed
- `npm run build -w packages/client` passed
- `ls -la packages/client/src/pages/` shows all 3 expected files
- `npm run test -w packages/server` passed (`69/69` tests)

Runtime/manual browser checks listed in the plan were not executed in this terminal session.