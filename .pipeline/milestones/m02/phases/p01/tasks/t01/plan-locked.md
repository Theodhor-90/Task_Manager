I see — the model tests work both with the test-double AND real MongoDB via `setupTestDb`. The vitest config uses the alias that replaces mongoose with the test-double. Let me confirm whether the integration tests (in `test/routes/`) also use the test-double or real mongoose.

Looking at the vitest config — the mongoose alias applies globally to ALL tests, meaning both model tests and route tests use the test-double. The `setupTestDb`/`teardownTestDb` are effectively no-ops with the test-double (since `connect` just sets `state.connected = true`). So the route tests also use the test-double.

This means the project routes need to work with what the test-double supports. I need to understand exactly what's missing. The test-double has: `create`, `findOne`, `deleteMany`, `countDocuments`. It's missing: `find` (with chainable `.sort()`), `findOneAndUpdate`, `deleteOne`.

Now I have a full picture. Let me also check how the auth routes test gets a token for authenticated requests.

Looking back at the auth routes test, the pattern is:
1. Seed an admin user in `beforeEach`
2. Login via `POST /api/auth/login` to get a token
3. Use that token in `Authorization: Bearer <token>` header

For the project routes, the same pattern applies, but the `httpRequest` helper needs to support additional HTTP methods (`put`, `delete`).

Now I have all the context I need. Let me produce the implementation plan.

# Task 1 Implementation Plan — Create project route handler and register in app.ts

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/project.routes.ts` | **Create** | Route handlers for `POST /` and `GET /` on the projects resource |
| 2 | `packages/server/src/app.ts` | **Modify** | Import and register `projectRoutes` with prefix `/api/projects` |

## 2. Dependencies

- **No prior tasks** — this is the first task in phase p01
- **Existing infrastructure required** (all from Milestone 1):
  - `packages/server/src/app.ts` — Fastify app factory with JWT, CORS, auth middleware already registered
  - `packages/server/src/models/index.ts` — exports `ProjectModel`, `BoardModel`
  - `packages/server/src/middleware/auth.middleware.ts` — global `onRequest` hook that validates JWT on non-public routes
  - `@taskboard/shared` — exports `DEFAULT_COLUMNS` (`["To Do", "In Progress", "In Review", "Done"]`)
  - Mongoose test-double at `packages/server/test/helpers/mongoose.test-double.ts` — provides `create`, `findOne`, `deleteMany`, `countDocuments` on models

### Mongoose test-double gap

The existing test-double model object does **not** support:
- `find()` with chainable `.sort()` — needed by `GET /api/projects` handler
- `findOneAndUpdate()` — will be needed in future tasks (t02) but not this one

The `GET /` handler needs `ProjectModel.find({ owner }).sort({ createdAt: -1 })`. Two approaches:
1. **Extend the test-double** to add a `find()` method returning an object with `.sort()`, `.select()`, etc.
2. **Write the handler using only `findOne` patterns** (not viable for listing).

**Decision**: Extend the mongoose test-double to add `find()` returning a chainable query object (with `.sort()`, `.select()`, `.lean()`). This is necessary for this task and will also be needed for all subsequent tasks in M02. The extension is minimal and follows the existing patterns in the test-double.

## 3. Implementation Details

### 3.1 `packages/server/src/routes/project.routes.ts`

**Purpose**: Export `projectRoutes: FastifyPluginAsync` providing `POST /` and `GET /` handlers for the Project resource.

**Exports**:
- `projectRoutes: FastifyPluginAsync`

**Imports**:
```typescript
import type { FastifyPluginAsync } from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { ProjectModel, BoardModel } from "../models/index.js";
```

**Validation function** — `isValidCreateProjectBody`:
```typescript
function isValidCreateProjectBody(body: unknown): body is { name: string; description?: string } {
  if (!body || typeof body !== "object") {
    return false;
  }
  const { name } = body as Record<string, unknown>;
  return typeof name === "string" && name.trim().length > 0;
}
```

Pattern: Matches `isValidLoginRequest` in `auth.routes.ts` — inline type guard, checks `body` is truthy object, validates required fields.

**`POST /` handler**:
1. Call `isValidCreateProjectBody(request.body)`. If false, return `400 { error: "Project name is required" }`.
2. Extract `name` and `description` (default `""`) from `request.body`.
3. Get `owner` from `request.user.id` (populated by auth middleware from JWT).
4. Create project: `const project = await ProjectModel.create({ name, description, owner })`.
5. Build columns array: `DEFAULT_COLUMNS.map((colName, i) => ({ name: colName, position: i }))`.
6. Try to create board: `await BoardModel.create({ project: project._id, columns })`.
7. If board creation throws:
   - Delete the just-created project: `await ProjectModel.deleteMany({ _id: project._id })`.
   - Return `500 { error: "Failed to create project" }`.
8. Return `reply.code(201).send({ data: project })`.

**`GET /` handler**:
1. Query: `const projects = await ProjectModel.find({ owner: request.user.id }).sort({ createdAt: -1 })`.
2. Return `200 { data: projects }`.

**Full route plugin structure**:
```typescript
export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => { /* ... */ });
  app.get("/", async (request, reply) => { /* ... */ });
};
```

### 3.2 `packages/server/src/app.ts`

**Modification**: Add import and registration of `projectRoutes`.

**Changes**:
1. Add import: `import { projectRoutes } from "./routes/project.routes.js";`
2. Add registration after the auth routes line:
   ```typescript
   await app.register(projectRoutes, { prefix: "/api/projects" });
   ```

**Placement**: After `await app.register(authRoutes, { prefix: "/api/auth" });` — this ensures auth routes are registered first, and the global auth middleware (registered as a plugin before any routes) protects all project routes.

### 3.3 Mongoose test-double extension

**File**: `packages/server/test/helpers/mongoose.test-double.ts`

**Modification**: Add a `find()` method to the model object returned by the `model()` function. The `find()` method returns a chainable query object.

**Implementation**:

Add inside the `model()` function's return object, alongside `findOne`, `create`, `deleteMany`, `countDocuments`:

```typescript
find(filter: Record<string, unknown> = {}) {
  const results = getCollectionDocs(name).filter((doc) => matches(doc, filter));

  const query = {
    _results: results,
    sort(sortObj: Record<string, unknown>) {
      const field = Object.keys(sortObj)[0];
      const direction = sortObj[field] === -1 || sortObj[field] === "desc" ? -1 : 1;
      this._results.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal instanceof Date && bVal instanceof Date) {
          return direction * (aVal.getTime() - bVal.getTime());
        }
        if (aVal < bVal) return -direction;
        if (aVal > bVal) return direction;
        return 0;
      });
      return this;
    },
    select() {
      return this;
    },
    lean() {
      return this;
    },
    async then(resolve: (value: Record<string, unknown>[]) => void, reject?: (reason: unknown) => void) {
      try {
        resolve(this._results);
      } catch (err) {
        if (reject) reject(err);
      }
    },
  };

  return query;
},
```

The `then()` method makes the chainable object thenable, so `await model.find({}).sort({})` resolves to the results array. The `select()` and `lean()` are no-ops for forward compatibility.

## 4. Contracts

### `POST /api/projects`

**Request**:
```json
{
  "name": "My Project",
  "description": "Optional description"
}
```
- `name`: string, required, non-empty after trim
- `description`: string, optional, defaults to `""`
- Auth: `Authorization: Bearer <jwt>` header required

**Success Response** (201):
```json
{
  "data": {
    "_id": "64f...",
    "name": "My Project",
    "description": "Optional description",
    "owner": "64f...",
    "createdAt": "2026-02-24T...",
    "updatedAt": "2026-02-24T..."
  }
}
```

**Error Responses**:
- `400 { "error": "Project name is required" }` — missing or empty name
- `401 { "error": "Unauthorized" }` — no/invalid JWT (handled by auth middleware)
- `500 { "error": "Failed to create project" }` — board creation failed

**Side Effect**: A `Board` document is created with:
```json
{
  "_id": "64f...",
  "project": "<project._id>",
  "columns": [
    { "_id": "...", "name": "To Do", "position": 0 },
    { "_id": "...", "name": "In Progress", "position": 1 },
    { "_id": "...", "name": "In Review", "position": 2 },
    { "_id": "...", "name": "Done", "position": 3 }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### `GET /api/projects`

**Request**: No body. Auth header required.

**Success Response** (200):
```json
{
  "data": [
    {
      "_id": "64f...",
      "name": "My Project",
      "description": "...",
      "owner": "64f...",
      "createdAt": "2026-02-24T...",
      "updatedAt": "2026-02-24T..."
    }
  ]
}
```
- Array sorted by `createdAt` descending (newest first)
- Empty array `[]` if no projects exist

**Error Responses**:
- `401 { "error": "Unauthorized" }` — no/invalid JWT

## 5. Test Plan

### Test file

`packages/server/test/routes/project.routes.test.ts`

### Test setup

Follow the exact pattern from `auth.routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { UserModel, hashPassword, BoardModel } from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";
```

**Lifecycle**:
- `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest vs inject
- `beforeEach`: `clearCollections()`, seed admin user, login to get auth token
- `afterAll`: `app.close()`, `teardownTestDb()`

**Helper functions**:
- `seedAdminUser()` — create user with `admin@taskboard.local` / `admin123` (same as auth test)
- `getAuthToken()` — login via `POST /api/auth/login` and return token string
- `httpRequest(options)` — same pattern as auth test, but with `HttpMethod` type extended to include `"put" | "delete"` for future tasks. For this task, only `"get"` and `"post"` are needed.

### Tests

#### Describe: `POST /api/projects`

**Test 1: creates a project with name and description**
- Send `POST /api/projects` with `{ name: "Test Project", description: "A description" }` and auth header
- Expect: 201
- Assert: `body.data.name === "Test Project"`, `body.data.description === "A description"`, `body.data.owner` is defined, `body.data._id` is defined, `body.data.createdAt` is defined, `body.data.updatedAt` is defined

**Test 2: creates a project with only name (description defaults to empty string)**
- Send `POST /api/projects` with `{ name: "Minimal" }` and auth header
- Expect: 201
- Assert: `body.data.name === "Minimal"`, `body.data.description === ""`

**Test 3: auto-creates a board with 4 default columns**
- Send `POST /api/projects` with `{ name: "Board Test" }` and auth header
- Expect: 201
- After response, query `BoardModel.findOne({ project: body.data._id })`
- Assert: board is not null, `board.columns` has length 4
- Assert column names in order: `["To Do", "In Progress", "In Review", "Done"]`
- Assert column positions: `[0, 1, 2, 3]`

**Test 4: returns 400 when name is missing**
- Send `POST /api/projects` with `{ description: "no name" }` and auth header
- Expect: 400
- Assert: `body.error` contains a meaningful message

**Test 5: returns 400 when name is empty string**
- Send `POST /api/projects` with `{ name: "" }` and auth header
- Expect: 400
- Assert: `body.error` contains a meaningful message

**Test 6: returns 400 when name is whitespace only**
- Send `POST /api/projects` with `{ name: "   " }` and auth header
- Expect: 400
- Assert: `body.error` contains a meaningful message

**Test 7: returns 401 without auth token**
- Send `POST /api/projects` with `{ name: "Test" }` and no auth header
- Expect: 401
- Assert: `body.error === "Unauthorized"`

#### Describe: `GET /api/projects`

**Test 8: returns empty array when no projects exist**
- Send `GET /api/projects` with auth header
- Expect: 200
- Assert: `body.data` is an empty array `[]`

**Test 9: returns all projects owned by the user**
- Create 2 projects via `POST /api/projects`
- Send `GET /api/projects` with auth header
- Expect: 200
- Assert: `body.data` has length 2, both project names are present

**Test 10: returns projects sorted by createdAt descending (newest first)**
- Create project "First", then project "Second"
- Send `GET /api/projects` with auth header
- Expect: 200
- Assert: `body.data[0].name === "Second"`, `body.data[1].name === "First"`

**Test 11: returns 401 without auth token**
- Send `GET /api/projects` with no auth header
- Expect: 401
- Assert: `body.error === "Unauthorized"`

## 6. Implementation Order

1. **Extend mongoose test-double** — Add `find()` method with chainable `.sort()`, `.select()`, `.lean()` to the model object in `packages/server/test/helpers/mongoose.test-double.ts`. This unblocks the route handler from being testable.

2. **Create `project.routes.ts`** — Implement `projectRoutes` plugin with `POST /` and `GET /` handlers following the exact patterns from `auth.routes.ts`.

3. **Modify `app.ts`** — Import `projectRoutes` and register with prefix `/api/projects`.

4. **Create `project.routes.test.ts`** — Write all 11 integration tests following the pattern from `auth.routes.test.ts`.

5. **Run tests and verify** — Execute the test suite and fix any issues.

## 7. Verification Commands

```bash
# 1. Compile the server package
cd packages/server && npm run build

# 2. Run all server tests (should pass)
cd packages/server && npm test

# 3. Run only the new project routes test file
cd packages/server && npx vitest run test/routes/project.routes.test.ts

# 4. Run existing tests to verify no regressions
cd packages/server && npx vitest run test/routes/auth.routes.test.ts
cd packages/server && npx vitest run test/app.test.ts

# 5. Verify health endpoint still works (manual smoke test)
cd packages/server && npm run build && node -e "
  import('./dist/app.js').then(async ({ buildApp }) => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    console.log(res.statusCode, JSON.parse(res.body));
    await app.close();
  });
"
```