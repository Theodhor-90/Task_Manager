Implemented `t05` per the locked plan.

**Changes made**
1. Added workspace dependency in `packages/server/package.json`:
- `"@taskboard/shared": "*"`

2. Added workspace dependency in `packages/client/package.json`:
- `"@taskboard/shared": "*"`

3. Updated `packages/server/src/app.ts`:
- Added `import type { Task } from "@taskboard/shared";`
- Added `import { DEFAULT_COLUMNS } from "@taskboard/shared";`
- Added `GET /api/health` returning:
  - `{ status: "ok", defaultColumns: DEFAULT_COLUMNS }`

4. Updated `packages/client/src/App.tsx`:
- Added `import type { Priority } from "@taskboard/shared";`
- Added `import { PRIORITIES } from "@taskboard/shared";`
- Rendered priorities in `BoardPage` with `PRIORITIES.join(", ")`

5. Updated `packages/server/vitest.config.ts`:
- Removed `globals: true`
- Kept `passWithNoTests: true`

**Verification run**
1. `npm install` ✅
2. `npm ls @taskboard/shared` ✅ (shows server + client depend on shared)
3. `npm run build -w @taskboard/shared` ✅
4. `npm run build -w @taskboard/server` ✅
5. `npm run build -w @taskboard/client` ✅
6. `npm run build` ✅
7. `npm run test` ✅
8. Server source assertion script ✅
9. Client source assertion script ✅
10. Vitest config assertion script ✅
11. Planned socket-based health check command ❌ blocked by sandbox `EPERM` on bind to `0.0.0.0:3001`
- Runtime behavior still verified via `Fastify` `app.inject()` against built server app ✅
12. Planned `timeout 8 npm run dev ...` command couldn’t run as written (`timeout` not installed)
- Equivalent 8-second background-run probe executed; startup logs captured, then stopped ✅ (server side still constrained by sandbox `EPERM`)