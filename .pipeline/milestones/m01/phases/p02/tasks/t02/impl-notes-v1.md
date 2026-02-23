Implemented the locked-plan code changes:

1. Added dependencies to server package manifest:
- [`packages/server/package.json`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/package.json)

2. Created user model exactly per plan:
- [`packages/server/src/models/user.model.ts`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/user.model.ts)

Verification commands run (as required) and results:

1. `npm install bcryptjs -w @taskboard/server && npm install -D @types/bcryptjs -w @taskboard/server`
- Failed: network/DNS (`ENOTFOUND registry.npmjs.org`).

2. `npm run build -w @taskboard/server`
- Failed:
  - `Cannot find module 'bcryptjs'` (install blocked above).
  - Local workspace `mongoose` stub does not export `Schema`/`Document` and does not type `model` (current repo setup issue).

3. `cd packages/server && npx tsx -e "...import { UserModel... }..."`
- Failed in sandbox with `EPERM` while `tsx` tries to create IPC pipe.

4. `cd packages/server && npx tsx -e "...hashPassword/verifyPassword..."`
- Failed in this environment due `tsx` eval mode/top-level await output format error.

5. `npm run test -w @taskboard/server`
- Passed (`0` tests, `0` failures).

Summary: planned file implementation is complete, but full verification is blocked by environment constraints (no npm registry access, sandbox `tsx` limitations) and the repo’s current local `mongoose` stub lacking model/schema APIs.