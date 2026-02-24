I now have all the context needed. Let me produce the implementation plan.

# Task 1 Implementation Plan: Board Retrieval Endpoint and Route Registration

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/board.routes.ts` | Create | Board retrieval route handler (`GET /api/projects/:projectId/board`) and `columnRoutes` stub export for future tasks |
| 2 | `packages/server/src/app.ts` | Modify | Import and register `boardRoutes` under the `/api/projects` prefix |
| 3 | `packages/server/test/routes/board.routes.test.ts` | Create | Integration tests for the board retrieval endpoint |

## 2. Dependencies

- **Phase 1 (Projects API) complete**: `POST /api/projects` auto-creates a Board with 4 default columns — board tests rely on this
- **Existing models**: `ProjectModel` (from `project.model.ts`), `BoardModel` (from `board.model.ts`)
- **Auth middleware**: Already registered globally in `app.ts` — all non-public routes require JWT
- **Shared constants**: `DEFAULT_COLUMNS` from `@taskboard/shared`
- **Test helpers**: `setupTestDb`, `teardownTestDb`, `clearCollections` from `test/helpers/db.ts`
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## 3. Implementation Details

### 3.1 `packages/server/src/routes/board.routes.ts` (Create)

**Purpose**: Exports a `boardRoutes` FastifyPluginAsync that handles board retrieval. Also exports an empty `columnRoutes` FastifyPluginAsync stub for use in future tasks (Tasks 2–5).

**Exports**:
- `boardRoutes: FastifyPluginAsync` — board retrieval scoped under `/api/projects`
- `columnRoutes: FastifyPluginAsync` — empty stub, will be populated in subsequent tasks

**Internal helpers** (following `project.routes.ts` patterns):

```typescript
function isValidObjectId(value: unknown): boolean
```
- Same implementation as in `project.routes.ts`: uses `mongoose.Types.ObjectId.isValid()` with TypeScript cast through `unknown`

**Route: `GET /:projectId/board`**

Handler logic:
1. Extract `projectId` from `request.params as { projectId: string }`
2. Validate `projectId` with `isValidObjectId()` — return `400 { error: "Invalid project ID" }` if invalid
3. Query `ProjectModel.findOne({ _id: projectId, owner: request.user.id })` — return `404 { error: "Project not found" }` if null
4. Query `BoardModel.findOne({ project: projectId })` — return `404 { error: "Board not found" }` if null
5. Sort columns by position ascending before returning:
   - Access `board.columns` (a Mongoose DocumentArray)
   - Use `board.toJSON()` to serialize, then sort the `columns` array by `position`
   - Alternatively, since columns are embedded subdocuments stored in order, sort via `board.columns.sort((a, b) => a.position - b.position)` before serialization
6. Return `200 { data: board }` where `board` includes `_id`, `project`, `columns` (sorted), `createdAt`, `updatedAt`

**TypeScript types** (following project.routes.ts conventions):
- Use `as unknown as` casts for Mongoose operations where needed
- Params extracted via `request.params as { projectId: string }`

**Column routes stub**:
```typescript
export const columnRoutes: FastifyPluginAsync = async (_app) => {
  // Column endpoints will be added in Tasks 2–5
};
```

**Full file structure**:
```typescript
import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { ProjectModel, BoardModel } from "../models/index.js";

function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:projectId/board", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    if (!isValidObjectId(projectId)) {
      return reply.code(400).send({ error: "Invalid project ID" });
    }

    const project = await ProjectModel.findOne({
      _id: projectId,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const board = await BoardModel.findOne({ project: projectId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const boardJson = (board as unknown as { toJSON(): Record<string, unknown> }).toJSON();
    const columns = boardJson.columns as Array<{ position: number }>;
    columns.sort((a, b) => a.position - b.position);

    return reply.code(200).send({ data: boardJson });
  });
};

export const columnRoutes: FastifyPluginAsync = async (_app) => {
  // Column endpoints will be added in Tasks 2–5
};
```

### 3.2 `packages/server/src/app.ts` (Modify)

**Changes**:
1. Add import: `import { boardRoutes } from "./routes/board.routes.js";`
2. Register `boardRoutes` under the `/api/projects` prefix, **after** the existing `projectRoutes` registration

The `boardRoutes` plugin registers `GET /:projectId/board`. Since `projectRoutes` registers `GET /:id`, Fastify can differentiate because `/:projectId/board` has the additional `/board` segment — it will not conflict.

**Registration order** (add line after existing `projectRoutes` registration):
```typescript
await app.register(boardRoutes, { prefix: "/api/projects" });
```

**Important**: Fastify allows multiple plugins under the same prefix. Each plugin gets its own encapsulated context. The `boardRoutes` plugin only adds `GET /:projectId/board`, which doesn't conflict with any route in `projectRoutes` (which has `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`).

### 3.3 `packages/server/test/routes/board.routes.test.ts` (Create)

**Purpose**: Integration tests for `GET /api/projects/:projectId/board`.

**Test infrastructure** (copy exact patterns from `project.routes.test.ts`):
- Same imports: `createServer` from `node:net`, vitest functions, supertest, FastifyInstance, `buildApp`, models, test helpers
- Same `HttpMethod` type alias
- Same `normalizeId` function
- Same `canBindTcpPort` function
- Same `httpRequest` helper with dual supertest/inject support
- Same `seedAdminUser` and `getAuthToken` helpers
- Same `beforeAll`/`beforeEach`/`afterAll` lifecycle hooks

**Helper function specific to board tests**:
```typescript
async function createProject(name: string): Promise<{ projectId: string; boardId: string }>
```
- Creates a project via `POST /api/projects` with the given name
- Fetches the board via `GET /api/projects/:projectId/board`
- Returns both `projectId` and `boardId` as normalized strings

**Test suite**: `describe("board routes", () => { ... })`

**Test group**: `describe("GET /api/projects/:projectId/board", () => { ... })`

**Tests**:

1. **"returns board with columns sorted by position"**
   - Create a project (which auto-creates a board with 4 default columns)
   - `GET /api/projects/:projectId/board` → expect 200
   - Assert `body.data._id` is defined
   - Assert `body.data.project` matches `projectId`
   - Assert `body.data.columns` has length 4
   - Assert column names in order: `["To Do", "In Progress", "In Review", "Done"]`
   - Assert column positions in order: `[0, 1, 2, 3]`

2. **"returns 404 for non-existent project"**
   - `GET /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/board` → expect 404
   - Assert `body.error` is `"Project not found"`

3. **"returns 400 for invalid projectId format"**
   - `GET /api/projects/not-a-valid-id/board` → expect 400
   - Assert `body.error` is `"Invalid project ID"`

4. **"returns 401 without auth token"**
   - `GET /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/board` without authorization header → expect 401
   - Assert `body.error` is `"Unauthorized"`

5. **"board contains correct project reference"**
   - Create a project
   - `GET /api/projects/:projectId/board` → expect 200
   - Assert `normalizeId(body.data.project)` equals `projectId`

6. **"board has timestamps"**
   - Create a project
   - `GET /api/projects/:projectId/board` → expect 200
   - Assert `body.data.createdAt` is defined
   - Assert `body.data.updatedAt` is defined

## 4. Contracts

### Request: `GET /api/projects/:projectId/board`

**Path parameters**:
- `projectId` — valid MongoDB ObjectId string (24-char hex)

**Headers**:
- `Authorization: Bearer <jwt_token>` (required)

### Response: Success (200)

```json
{
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "project": "64a1b2c3d4e5f6a7b8c9d0e2",
    "columns": [
      { "_id": "64a...", "name": "To Do", "position": 0 },
      { "_id": "64a...", "name": "In Progress", "position": 1 },
      { "_id": "64a...", "name": "In Review", "position": 2 },
      { "_id": "64a...", "name": "Done", "position": 3 }
    ],
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z",
    "__v": 0
  }
}
```

### Response: Invalid ObjectId (400)

```json
{ "error": "Invalid project ID" }
```

### Response: Not Found (404)

```json
{ "error": "Project not found" }
```

or

```json
{ "error": "Board not found" }
```

### Response: Unauthorized (401)

```json
{ "error": "Unauthorized" }
```

## 5. Test Plan

### Test Setup

- **Database**: MongoDB at `mongodb://localhost:27017/taskboard_test`
- **Lifecycle**:
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest availability
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
  - `afterAll`: `app.close()`, `teardownTestDb()`
- **HTTP client**: Dual-mode `httpRequest` helper (supertest if TCP binding works, Fastify inject otherwise)
- **Data setup**: Projects created via `POST /api/projects` API (which auto-creates boards)

### Test Specifications

| # | Test Name | Setup | Action | Assertions |
|---|-----------|-------|--------|------------|
| 1 | returns board with columns sorted by position | Create project "Board Test" | GET `/api/projects/:projectId/board` with auth | 200; data._id defined; columns length 4; names = ["To Do", "In Progress", "In Review", "Done"]; positions = [0,1,2,3] |
| 2 | returns 404 for non-existent project | None | GET `/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/board` with auth | 404; error = "Project not found" |
| 3 | returns 400 for invalid projectId format | None | GET `/api/projects/not-a-valid-id/board` with auth | 400; error = "Invalid project ID" |
| 4 | returns 401 without auth token | None | GET `/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/board` without auth header | 401; error = "Unauthorized" |
| 5 | board contains correct project reference | Create project | GET `/api/projects/:projectId/board` with auth | 200; normalizeId(data.project) = projectId |
| 6 | board has timestamps | Create project | GET `/api/projects/:projectId/board` with auth | 200; data.createdAt defined; data.updatedAt defined |

## 6. Implementation Order

1. **Create `packages/server/src/routes/board.routes.ts`**
   - Implement `isValidObjectId` helper
   - Implement `boardRoutes` plugin with `GET /:projectId/board` handler
   - Add empty `columnRoutes` stub export
2. **Modify `packages/server/src/app.ts`**
   - Import `boardRoutes` from `./routes/board.routes.js`
   - Register under `/api/projects` prefix (after `projectRoutes`)
3. **Create `packages/server/test/routes/board.routes.test.ts`**
   - Set up test infrastructure (imports, helpers, lifecycle hooks)
   - Implement `createProject` helper
   - Write all 6 test cases
4. **Run tests and verify**

## 7. Verification Commands

```bash
# Run board route tests only
cd packages/server && npx vitest run test/routes/board.routes.test.ts

# Run all server tests (ensure no regressions in project routes)
cd packages/server && npx vitest run

# Verify TypeScript compilation
cd packages/server && npx tsc --noEmit

# Verify server starts without errors (manual check)
cd packages/server && npm run dev
```