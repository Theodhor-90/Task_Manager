Now I have everything I need. Let me produce the implementation plan.

# Task 4 Implementation Plan — Integration tests: CRUD operations (happy paths)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/routes/project.routes.test.ts` | **Create** | Integration test file with scaffold (lifecycle, helpers) and happy-path tests for all 5 project CRUD endpoints |

**Note on existing state**: Tasks t01–t03 each added their own tests incrementally to this file as they implemented route handlers. The file already exists with 31 passing tests covering both happy-path and error-case scenarios. This task's role is to formalize the test scaffold and verify the happy-path tests are complete and correctly structured. If the existing file already satisfies all deliverables, the implementation step is to verify and confirm — no code changes needed.

## 2. Dependencies

- **t01 (completed)**: `POST /` and `GET /` route handlers implemented and registered in `app.ts`
- **t02 (completed)**: `GET /:id` and `PUT /:id` route handlers implemented
- **t03 (completed)**: `DELETE /:id` handler with cascade logic implemented
- **Mongoose test-double**: Extended by t01–t03 with `find()`, `findOneAndUpdate()`, `deleteOne()`, and `$in` operator support
- **Existing infrastructure** (from Milestone 1):
  - `packages/server/src/app.ts` — Fastify app factory with JWT, CORS, auth middleware, auth routes, and project routes registered
  - `packages/server/src/models/index.ts` — exports all models (`UserModel`, `ProjectModel`, `BoardModel`, `TaskModel`, `CommentModel`, `LabelModel`, `hashPassword`)
  - `packages/server/test/helpers/db.ts` — exports `setupTestDb`, `teardownTestDb`, `clearCollections`
  - `packages/server/test/helpers/mongoose.test-double.ts` — in-memory model substitute aliased via Vitest config

## 3. Implementation Details

### 3.1 Test scaffold

**File**: `packages/server/test/routes/project.routes.test.ts`

**Imports**:
```typescript
import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import {
  BoardModel,
  UserModel,
  hashPassword,
  TaskModel,
  CommentModel,
  LabelModel,
  ProjectModel,
} from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";
```

**Pattern notes**: The import list includes `TaskModel`, `CommentModel`, `LabelModel`, and `ProjectModel` — these are used by the error-case and cascade-delete tests that will be added in t05. Including them here avoids a second import modification pass. However, for this task (t04), only `BoardModel`, `UserModel`, `hashPassword`, and `ProjectModel` are strictly needed.

**Type and utility definitions**:

```typescript
type HttpMethod = "get" | "post" | "put" | "delete";
```

Extended beyond `auth.routes.test.ts`'s `"get" | "post"` to support all HTTP methods needed by project CRUD tests.

```typescript
function normalizeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value?: unknown }).value === "string"
  ) {
    return (value as { value: string }).value;
  }
  return String(value);
}
```

This utility handles the `ObjectId` representation difference between the test-double (returns `ObjectId` instances with a `.value` property) and real Mongoose (returns strings). It normalizes `_id` values so tests work in both environments. Used when extracting IDs from API responses to construct subsequent request URLs.

```typescript
async function canBindTcpPort(): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(0, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}
```

Same pattern as `auth.routes.test.ts` — detects whether the test environment supports TCP binding (needed for supertest). Falls back to Fastify's `app.inject()` if not.

**Describe block and lifecycle**:

```typescript
describe("project routes", () => {
  let app: FastifyInstance;
  let useSupertest = true;
  let token = "";

  async function seedAdminUser(): Promise<void> { /* ... */ }
  async function getAuthToken(): Promise<string> { /* ... */ }
  async function httpRequest(options: { ... }): Promise<{ body: unknown }> { /* ... */ }

  beforeAll(async () => {
    await setupTestDb();
    app = await buildApp();
    await app.ready();
    useSupertest = await canBindTcpPort();
  });

  beforeEach(async () => {
    await clearCollections();
    await seedAdminUser();
    token = await getAuthToken();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  // ... test describe blocks ...
});
```

**Key difference from `auth.routes.test.ts`**: The `beforeEach` hook calls `getAuthToken()` and stores the result in the `token` variable. This is because every project route test needs an auth token, and obtaining it per-test via a fresh login ensures test isolation while reducing boilerplate.

**`seedAdminUser` helper**:
```typescript
async function seedAdminUser(): Promise<void> {
  const passwordHash = await hashPassword("admin123");
  await UserModel.create({
    email: "admin@taskboard.local",
    name: "Admin",
    passwordHash,
  });
}
```

Identical to the pattern in `auth.routes.test.ts`. Creates the admin user with known credentials that `getAuthToken()` will use.

**`getAuthToken` helper**:
```typescript
async function getAuthToken(): Promise<string> {
  const response = await httpRequest({
    method: "post",
    path: "/api/auth/login",
    expectedStatus: 200,
    payload: { email: "admin@taskboard.local", password: "admin123" },
  });
  const body = response.body as { data: { token: string } };
  return body.data.token;
}
```

Logs in via the auth endpoint and returns the JWT token string. Called in `beforeEach` so every test starts with a fresh, valid token.

**`httpRequest` helper**:
```typescript
async function httpRequest(options: {
  method: HttpMethod;
  path: string;
  expectedStatus: number;
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<{ body: unknown }> {
  const { method, path, expectedStatus, payload, headers } = options;

  if (useSupertest) {
    let chain = request(app.server)[method](path).expect(expectedStatus);
    if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        chain = chain.set(name, value);
      }
    }
    if (payload !== undefined) {
      chain = chain.send(payload);
    }
    const response = await chain.expect("content-type", /json/);
    return { body: response.body };
  }

  const response = await app.inject({
    method: method.toUpperCase(),
    url: path,
    headers,
    payload,
  });

  expect(response.statusCode).toBe(expectedStatus);
  expect(response.headers["content-type"]).toMatch(/json/);
  return { body: JSON.parse(response.body) };
}
```

Follows the exact same dual-path pattern as `auth.routes.test.ts`: uses `supertest` when TCP binding works, falls back to `app.inject()` otherwise. Extended to support `put` and `delete` methods via the broader `HttpMethod` type.

### 3.2 Happy-path tests

#### Describe: `POST /api/projects`

**Test 1: "creates a project with name and description"**
- Send `POST /api/projects` with `{ name: "Test Project", description: "A description" }` and auth header
- Expect: 201
- Assert: `body.data.name === "Test Project"`, `body.data.description === "A description"`, `body.data.owner` is defined, `body.data._id` is defined, `body.data.createdAt` is defined, `body.data.updatedAt` is defined

**Test 2: "creates a project with only name"**
- Send `POST /api/projects` with `{ name: "Minimal" }` and auth header
- Expect: 201
- Assert: `body.data.name === "Minimal"`, `body.data.description === ""` (defaults to empty string)

**Test 3: "auto-creates a board with 4 default columns"**
- Send `POST /api/projects` with `{ name: "Board Test" }` and auth header
- Expect: 201
- Extract `projectId` from response using `body.data._id`
- Query `BoardModel.findOne({ project: projectId })` directly
- If board not found via direct ID (ObjectId format mismatch), fall back to listing projects via `GET /api/projects` to get the normalized project, then query by that
- Assert: board is not null, `board.columns` has length 4
- Assert column names in order: `["To Do", "In Progress", "In Review", "Done"]`
- Assert column positions: `[0, 1, 2, 3]`

**Why the fallback**: The test-double stores `_id` as `ObjectId` instances, while the API response may serialize them as strings. The `BoardModel.findOne({ project: ... })` uses the `matches()` function which calls `normalizeForCompare()` on both sides, so it should work regardless — but the fallback ensures robustness.

#### Describe: `GET /api/projects`

**Test 4: "returns empty array when no projects exist"**
- Send `GET /api/projects` with auth header
- Expect: 200
- Assert: `body.data` is an empty array `[]`

**Test 5: "returns all projects owned by the user"**
- Create 2 projects via `POST /api/projects` (`"Project 1"` and `"Project 2"`)
- Send `GET /api/projects` with auth header
- Expect: 200
- Assert: `body.data` has length 2
- Assert: both project names are present (using `expect.arrayContaining`)

**Test 6: "returns projects sorted by createdAt descending"**
- Create project `"First"`, wait 5ms, create project `"Second"`
- Send `GET /api/projects` with auth header
- Expect: 200
- Assert: `body.data[0].name === "Second"`, `body.data[1].name === "First"`

**Why the 5ms delay**: The test-double creates `createdAt` timestamps using `new Date()`. Without a delay, both projects could get identical timestamps, making sort order non-deterministic. The 5ms `setTimeout` ensures distinct timestamps.

#### Describe: `GET /api/projects/:id`

**Test 7: "returns a project by ID"**
- Create a project via `POST /api/projects` with `{ name: "Get Test", description: "desc" }`
- Extract `projectId` using `normalizeId(body.data._id)`
- Send `GET /api/projects/:id` with auth header
- Expect: 200
- Assert: `body.data.name === "Get Test"`, `body.data.description === "desc"`, `normalizeId(body.data._id) === projectId`, `body.data.owner` is defined

#### Describe: `PUT /api/projects/:id`

**Test 8: "updates project name"**
- Create a project with `{ name: "Original" }`
- Extract `projectId`
- Send `PUT /api/projects/:id` with `{ name: "Updated" }` and auth header
- Expect: 200
- Assert: `body.data.name === "Updated"`, `normalizeId(body.data._id) === projectId`

**Test 9: "updates project description"**
- Create a project with `{ name: "Test", description: "old" }`
- Send `PUT /api/projects/:id` with `{ description: "new" }` and auth header
- Expect: 200
- Assert: `body.data.description === "new"`, `body.data.name === "Test"` (name unchanged)

**Test 10: "updates both name and description"**
- Create a project with `{ name: "Before", description: "Before Desc" }`
- Send `PUT /api/projects/:id` with `{ name: "New Name", description: "New Desc" }`
- Expect: 200
- Assert: both fields updated

#### Describe: `DELETE /api/projects/:id`

**Test 11: "deletes a project and returns success message"**
- Create a project with `{ name: "Delete Me" }`
- Extract `projectId`
- Send `DELETE /api/projects/:id` with auth header
- Expect: 200
- Assert: `body.data.message === "Project deleted"`
- Verify project is gone: `GET /api/projects/:id` returns 404

## 4. Contracts

This task produces a test file only — no new API contracts are introduced. The tests verify the contracts defined in tasks t01–t03:

| Endpoint | Method | Success Status | Response Shape |
|----------|--------|---------------|----------------|
| `/api/projects` | POST | 201 | `{ data: { _id, name, description, owner, createdAt, updatedAt } }` |
| `/api/projects` | GET | 200 | `{ data: Project[] }` |
| `/api/projects/:id` | GET | 200 | `{ data: { _id, name, description, owner, createdAt, updatedAt } }` |
| `/api/projects/:id` | PUT | 200 | `{ data: { _id, name, description, owner, createdAt, updatedAt } }` |
| `/api/projects/:id` | DELETE | 200 | `{ data: { message: "Project deleted" } }` |

## 5. Test Plan

The test plan IS the deliverable for this task. The 11 happy-path tests are enumerated in Section 3.2 above. Summary:

| # | Describe Block | Test Name | Verifies |
|---|---------------|-----------|----------|
| 1 | POST /api/projects | creates a project with name and description | 201 response with all fields |
| 2 | POST /api/projects | creates a project with only name | description defaults to "" |
| 3 | POST /api/projects | auto-creates a board with 4 default columns | Board document created with correct columns/positions |
| 4 | GET /api/projects | returns empty array when no projects exist | Empty data array |
| 5 | GET /api/projects | returns all projects owned by the user | All created projects returned |
| 6 | GET /api/projects | returns projects sorted by createdAt descending | Newest first |
| 7 | GET /api/projects/:id | returns a project by ID | Single project with correct fields |
| 8 | PUT /api/projects/:id | updates project name | Name updated, ID preserved |
| 9 | PUT /api/projects/:id | updates project description | Description updated, name unchanged |
| 10 | PUT /api/projects/:id | updates both name and description | Both fields updated |
| 11 | DELETE /api/projects/:id | deletes a project and returns success message | 200 with message, project gone on re-fetch |

### Test setup

- **beforeAll**: Connect to test DB, build Fastify app, detect supertest capability
- **beforeEach**: Clear all collections, seed admin user, obtain fresh auth token
- **afterAll**: Close Fastify app, tear down test DB

### Test isolation

Each test starts from a clean state — `clearCollections()` removes all documents from every model collection, `seedAdminUser()` creates a known user, and `getAuthToken()` obtains a valid JWT. No test depends on state from a previous test.

## 6. Implementation Order

1. **Verify existing file** — The file `packages/server/test/routes/project.routes.test.ts` already exists with 31 passing tests, including all 11 happy-path tests listed in this plan. Check that the scaffold (imports, helpers, lifecycle hooks) and all happy-path tests match the spec requirements.

2. **Adjust if needed** — If any happy-path test is missing or incorrectly structured, add or fix it. Specifically verify:
   - Test scaffold: `setupTestDb`/`teardownTestDb` in `beforeAll`/`afterAll`, `clearCollections` + `seedAdminUser` + `getAuthToken` in `beforeEach`
   - `httpRequest` helper supports `get`, `post`, `put`, `delete` methods
   - All 11 happy-path tests exist with correct assertions
   - `normalizeId` helper is present for ObjectId handling

3. **Run tests and verify** — Execute the test suite to confirm all tests pass.

## 7. Verification Commands

```bash
# 1. Run all project routes tests
cd packages/server && npx vitest run test/routes/project.routes.test.ts

# 2. Run all server tests to verify no regressions
cd packages/server && npm test

# 3. Run auth routes tests (verify no interference)
cd packages/server && npx vitest run test/routes/auth.routes.test.ts

# 4. Run app-level tests
cd packages/server && npx vitest run test/app.test.ts

# 5. Verify TypeScript compiles
cd packages/server && npm run build
```