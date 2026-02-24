I now have complete understanding of the codebase. Let me produce the implementation plan.

# Task 8 Implementation Plan: End-to-End Smoke Verification and Cleanup

## 1. Deliverables

| # | File/Artifact | Action | Purpose |
|---|--------------|--------|---------|
| D1 | `packages/server/src/app.ts` | Audit (no change needed) | Verify no unused imports remain; `DEFAULT_COLUMNS` is actively used in the health endpoint on line 18, and `import type { Task }` was already removed in a prior task |
| D2 | Server test suite | Run | Confirm all pre-existing tests (7 model test files + 1 seed test + app.test.ts) and auth integration tests (auth.routes.test.ts) pass with zero failures |
| D3 | TypeScript compilation | Run | Confirm both `packages/server` and `packages/client` compile without errors |
| D4 | Client build | Run | Confirm `npm run build -w packages/client` succeeds (runs `tsc --noEmit && vite build`) |
| D5 | Dev environment | Run | Confirm `npm run dev` starts both server and client concurrently with no errors |
| D6 | End-to-end auth flow | Manual verification | Walk through all 7 steps of the e2e flow (redirect to login → login → dashboard → refresh → logout → redirect) and all 13 phase exit criteria |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| Tasks t01–t07 | All completed | `.pipeline/state.json` — all 7 prior tasks have `status: "completed"` |
| MongoDB running on `localhost:27017` | Required at runtime | For server startup, seed user creation, and auth endpoint testing |
| Node.js 18+ | Required | Runtime prerequisite |
| All server dependencies installed | Already done | `packages/server/package.json` — `@fastify/jwt`, `@fastify/cors`, `fastify-plugin`, `bcryptjs`, `mongoose`, etc. |
| All client dependencies installed | Already done | `packages/client/package.json` — `react`, `react-router-dom`, `tailwindcss`, etc. |

No new package installs are required.

## 3. Implementation Details

### D1: Code Audit — `packages/server/src/app.ts`

**Purpose**: Verify no unused imports or dead code remain in the main app file after all task 1–7 modifications.

**Current state** (line-by-line analysis):

```typescript
import Fastify from "fastify";                          // Used: line 9
import { DEFAULT_COLUMNS } from "@taskboard/shared";    // Used: line 18 (health endpoint response)
import { corsPlugin } from "./plugins/cors.plugin.js";  // Used: line 14
import { jwtPlugin } from "./plugins/jwt.plugin.js";    // Used: line 13
import { authMiddleware } from "./middleware/auth.middleware.js"; // Used: line 15
import { authRoutes } from "./routes/auth.routes.js";   // Used: line 21
```

**Conclusion**: All 6 imports are actively used. No dead code exists. The task spec mentions cleaning up `import type { Task }` — this was already removed in a prior task (likely t01 or t03). The spec also mentions `import { DEFAULT_COLUMNS }` — this is still needed because the health endpoint on line 18 returns `{ status: "ok", defaultColumns: DEFAULT_COLUMNS }`. **No modifications needed**.

### D2: Server Test Suite Verification

**Purpose**: Confirm all server tests pass with zero failures. This validates no regressions were introduced during the 7-task phase.

**Test files and expected counts**:

| File | Tests | Description |
|------|-------|-------------|
| `test/models/user.model.test.ts` | Phase 2 model tests | User model CRUD and validation |
| `test/models/project.model.test.ts` | Phase 2 model tests | Project model CRUD and validation |
| `test/models/board.model.test.ts` | Phase 2 model tests | Board model CRUD and validation |
| `test/models/task.model.test.ts` | Phase 2 model tests | Task model CRUD and validation |
| `test/models/comment.model.test.ts` | Phase 2 model tests | Comment model CRUD and validation |
| `test/models/label.model.test.ts` | Phase 2 model tests | Label model CRUD and validation |
| `test/models/seed.test.ts` | Phase 2 seed tests | Seed user creation |
| `test/app.test.ts` | 12 tests | buildApp (2), plugins (4), config (1), auth middleware (5) |
| `test/routes/auth.routes.test.ts` | 8 tests | Login (4), Me (3), Health (1) — Supertest-based integration tests |

**Command**: `npm run test -w packages/server`

**Expected result**: All tests pass. The Mongoose test double (configured via `vitest.config.ts` alias) handles all database operations in-memory for tests.

### D3: TypeScript Compilation Verification

**Purpose**: Confirm both packages compile without type errors.

**Commands**:
- Server: `npx tsc --noEmit -p packages/server/tsconfig.json`
- Client: `npx tsc --noEmit -p packages/client/tsconfig.json`

**What this validates**:
- All `@taskboard/shared` types (`LoginRequest`, `LoginResponse`, `ApiSuccessResponse`, `ApiErrorResponse`, `DEFAULT_COLUMNS`, `PRIORITIES`) are correctly imported and used
- Fastify type augmentations (`FastifyJWT.user` in `auth.middleware.ts`) work correctly
- React component types, hook types, and event handler types are correct
- No implicit `any` or missing type annotations (strict mode)

### D4: Client Build Verification

**Purpose**: Confirm the Vite production build succeeds.

**Command**: `npm run build -w packages/client`

**What this validates**: The build script runs `tsc --noEmit && vite build`, which:
1. TypeScript compilation check (same as D3 for client)
2. Vite bundling with tree-shaking, JSX transformation, Tailwind CSS processing
3. All `import.meta.env.*` references resolve correctly
4. All React Router, React context, and component imports resolve

### D5: Dev Environment Verification

**Purpose**: Confirm `npm run dev` starts both server and client concurrently with no startup errors.

**Command**: `npm run dev`

**What this validates**:
- Root `package.json` script: `concurrently --kill-others-on-fail "npm run dev -w @taskboard/server" "npm run dev -w @taskboard/client"`
- Server: `npm run build && node dist/server.js` — TypeScript compiles, Fastify starts, connects to MongoDB, runs seed script, listens on port 3001
- Client: `vite` — Vite dev server starts on port 5173 with proxy forwarding `/api` to `localhost:3001`
- No crash, no unhandled errors, no port conflicts

**Prerequisite**: MongoDB must be running on `localhost:27017`.

### D6: End-to-End Auth Flow Verification

**Purpose**: Manually walk through the full auth flow to confirm all 13 phase exit criteria are met.

**E2E Flow Steps** (from task spec):

| Step | Action | Expected Result | Validates Exit Criteria |
|------|--------|-----------------|------------------------|
| 1 | Server starts, check seed user | Server boots without errors, `seedDefaultUser()` logs "created default admin user" or "users already exist" | — |
| 2 | Navigate to `http://localhost:5173/` in browser | Redirected to `/login` (ProtectedRoute redirects unauthenticated users) | EC #9 |
| 3 | Enter `admin@taskboard.local` / `admin123`, click "Sign in" | Redirected to `/` (dashboard), `localStorage.getItem("taskboard_token")` returns a JWT string | EC #1, EC #8 |
| 4 | Dashboard content | Shows "Welcome, Admin" header and "Logout" button | EC #10 |
| 5 | Refresh page (F5) | Dashboard still renders with "Welcome, Admin" (token persists in localStorage, `getMe()` validates it, auth context populates user) | EC #5, EC #8 |
| 6 | Click "Logout" | Redirected to `/login`, `localStorage.getItem("taskboard_token")` returns `null` | EC #11 |
| 7 | Navigate to `http://localhost:5173/` while logged out | Redirected to `/login` | EC #9 |

**Additional API-level checks** (can be done with `curl` or browser DevTools):

| Check | Command/Action | Expected Result | Exit Criteria |
|-------|---------------|-----------------|---------------|
| Login with valid credentials | `POST /api/auth/login` with `{ email: "admin@taskboard.local", password: "admin123" }` | 200 with `{ data: { token: "...", user: { id, email, name } } }` | EC #1 |
| Login with wrong password | `POST /api/auth/login` with `{ email: "admin@taskboard.local", password: "wrong" }` | 401 with `{ error: "Invalid credentials" }` | EC #2 |
| Login with missing fields | `POST /api/auth/login` with `{}` | 400 with `{ error: "Email and password are required" }` | EC #3 |
| Me without token | `GET /api/auth/me` with no auth header | 401 with `{ error: "Unauthorized" }` | EC #4 |
| Me with valid token | `GET /api/auth/me` with `Authorization: Bearer <token>` | 200 with `{ data: { id, email, name } }` | EC #5 |
| Health without token | `GET /api/health` | 200 with `{ status: "ok", defaultColumns: [...] }` | EC #6 |
| Server tests pass | `npm run test -w packages/server` | All pass, zero failures | EC #7, EC #13 |
| Dev starts cleanly | `npm run dev` | Both server and client start without errors | EC #12 |

## 4. Contracts

This task produces no new code artifacts. The contracts validated are those established by tasks 1–7:

### Phase 3 Exit Criteria Mapping

| EC # | Criterion | Source Task | How Verified |
|------|-----------|-------------|--------------|
| 1 | `POST /api/auth/login` with valid credentials returns 200 with `{ data: { token, user } }` | t03 | curl + E2E step 3 |
| 2 | `POST /api/auth/login` with invalid credentials returns 401 with `{ error: "Invalid credentials" }` | t03 | curl |
| 3 | `POST /api/auth/login` with missing fields returns 400 with `{ error: "Email and password are required" }` | t03 | curl |
| 4 | `GET /api/auth/me` without token returns 401 | t02, t03 | curl |
| 5 | `GET /api/auth/me` with valid token returns 200 with user data | t02, t03 | curl + E2E step 5 |
| 6 | `GET /api/health` responds 200 without any token | t01, t02 | curl |
| 7 | All 8 server integration tests in `auth.routes.test.ts` pass | t04 | `npm run test -w packages/server` |
| 8 | Client login page authenticates against server and stores token in `localStorage` | t05, t06, t07 | E2E step 3 |
| 9 | Unauthenticated access to `/` or `/projects/:id/board` redirects to `/login` | t06, t07 | E2E steps 2, 7 |
| 10 | Placeholder dashboard renders user's name and logout button after successful login | t07 | E2E step 4 |
| 11 | Logout clears token from `localStorage` and redirects to `/login` | t06, t07 | E2E step 6 |
| 12 | `npm run dev` starts server and client concurrently with no errors | All | `npm run dev` |
| 13 | All pre-existing tests (models, seed, app) still pass | All | `npm run test -w packages/server` |

## 5. Test Plan

### Automated Tests

No new tests are created in this task. The verification runs the existing test suites:

| Suite | Command | Expected Tests |
|-------|---------|---------------|
| All server tests | `npm run test -w packages/server` | All model tests (user, project, board, task, comment, label), seed test, app.test.ts (12 tests), auth.routes.test.ts (8 tests) |
| Client TypeScript check | `npx tsc --noEmit -p packages/client/tsconfig.json` | Zero errors |
| Client build | `npm run build -w packages/client` | Succeeds with zero errors |

### Manual E2E Test

The 7-step E2E flow described in D6 is performed manually with the dev environment running. Each step must produce the expected result before proceeding to the next.

### Regression Checks

| Area | What to Check | Pass Criteria |
|------|---------------|---------------|
| Model tests | All Phase 2 model test files pass | Zero failures |
| Seed test | `seed.test.ts` passes | Zero failures |
| App tests | `app.test.ts` — 12 tests covering buildApp, plugins, config, auth middleware | Zero failures |
| Auth integration | `auth.routes.test.ts` — 8 Supertest tests | Zero failures |
| Client compilation | TypeScript strict mode, no implicit any | Zero errors |
| Client build | Vite production build | Zero errors |

## 6. Implementation Order

1. **Audit `packages/server/src/app.ts` for dead code** — Verify all imports are used. The `import type { Task }` was already removed. `DEFAULT_COLUMNS` is still used in the health endpoint. No modifications needed.

2. **Run server tests** — Execute `npm run test -w packages/server`. Verify all tests pass with zero failures. If any test fails, investigate and fix the root cause before proceeding.

3. **Run TypeScript compilation checks** — Execute `npx tsc --noEmit -p packages/server/tsconfig.json` and `npx tsc --noEmit -p packages/client/tsconfig.json`. Both must succeed with zero errors.

4. **Run client build** — Execute `npm run build -w packages/client`. Must succeed.

5. **Start dev environment** — Execute `npm run dev` (requires MongoDB running). Verify both server and client start without errors. Server should log "Server listening at http://0.0.0.0:3001" and seed message. Client should show Vite dev server on port 5173.

6. **Perform E2E auth flow verification** — Walk through all 7 steps of the manual E2E flow:
   - Step 1: Verify seed user exists (server startup logs)
   - Step 2: Navigate to `/` → redirected to `/login`
   - Step 3: Login with `admin@taskboard.local` / `admin123` → redirected to dashboard
   - Step 4: Dashboard shows "Welcome, Admin" and logout button
   - Step 5: Refresh page → dashboard persists
   - Step 6: Click logout → redirected to `/login`, token cleared
   - Step 7: Navigate to `/` → redirected to `/login`

7. **Perform API-level curl checks** — Verify all 6 API-level exit criteria with curl commands against the running server.

8. **Verify board page protection** — Navigate to `/projects/123/board` while logged out → redirected to `/login`. Login, then navigate to `/projects/123/board` → board page renders with priority levels.

## 7. Verification Commands

```bash
# 1. Audit: Verify no unused imports in app.ts (should show only active imports)
grep "^import" packages/server/src/app.ts

# 2. Run all server tests
npm run test -w packages/server

# 3. TypeScript compilation — server
npx tsc --noEmit -p packages/server/tsconfig.json

# 4. TypeScript compilation — client
npx tsc --noEmit -p packages/client/tsconfig.json

# 5. Client production build
npm run build -w packages/client

# 6. Start dev environment (run in terminal, leave running for manual verification)
npm run dev

# 7. API-level checks (in a separate terminal, while dev environment is running)

# EC #1: Login with valid credentials
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskboard.local","password":"admin123"}'
# Expected: {"data":{"token":"eyJ...","user":{"id":"...","email":"admin@taskboard.local","name":"Admin"}}}

# EC #2: Login with wrong password
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskboard.local","password":"wrong"}'
# Expected: {"error":"Invalid credentials"}

# EC #3: Login with missing fields
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: {"error":"Email and password are required"}

# EC #4: Me without token
curl -s http://localhost:3001/api/auth/me
# Expected: {"error":"Unauthorized"}

# EC #5: Me with valid token (replace TOKEN with actual token from step #1)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskboard.local","password":"admin123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"data":{"id":"...","email":"admin@taskboard.local","name":"Admin"}}

# EC #6: Health without token
curl -s http://localhost:3001/api/health
# Expected: {"status":"ok","defaultColumns":["To Do","In Progress","In Review","Done"]}

# 8. Browser-based E2E checks (manual)
# Open http://localhost:5173/ — should redirect to /login
# Login with admin@taskboard.local / admin123 — should redirect to /
# Dashboard shows "Welcome, Admin" and "Logout" button
# Refresh page — dashboard persists
# Click Logout — redirected to /login, localStorage cleared
# Navigate to / — redirected to /login
# Login again, navigate to /projects/123/board — board page renders
```