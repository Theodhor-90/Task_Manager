Implemented the review fix for `dueDate` validation and kept changes aligned with the locked plan.

## What I changed

- Updated [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts:12) to add `isValidDateString(value: string)`.
- Updated create-body validation in [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts:47) so `dueDate` must be a valid date string (not just any string).
- Updated update-body validation in [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts:113) so `dueDate` must be either:
  - `null` (allowed for clearing), or
  - a valid date string.

## Verification run

- `npx tsc --noEmit` (in `packages/server`) passed.
- `npm run build --workspace=packages/server` passed.
- `npm test` (in `packages/server`) passed: **11 files, 146 tests**.
- Startup check via `npm run dev` reached app startup but failed to bind port due sandbox restriction: `listen EPERM ... 0.0.0.0:3001` (environment limitation, not code regression).