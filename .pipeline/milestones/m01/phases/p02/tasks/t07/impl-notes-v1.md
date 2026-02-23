Implemented the locked plan items for `t07`:

1. Created [`packages/server/src/seed.ts`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/seed.ts) with `seedDefaultUser()` that:
- checks user count
- creates `admin@taskboard.local` with name `Admin` and hashed `admin123` when empty
- logs create/skip outcomes
- is idempotent

2. Modified [`packages/server/src/server.ts`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/server.ts) to:
- call `connectDb()` before startup
- call `seedDefaultUser()` after DB connect
- then call `app.listen(...)` in the existing `try/catch`

Verification run results (from the locked plan commands):

1. `npm run build -w @taskboard/server` passed.
2. Seed import smoke test passed.
3. `server.ts` import smoke test passed.
4. Seed runtime verification script failed in this repo because the local workspace `mongoose` package is a stub and its `model()` objects do not implement runtime methods like `deleteMany/findOne/countDocuments`.
5. `npm run test -w @taskboard/server` passed.

No dependencies were added (per plan).