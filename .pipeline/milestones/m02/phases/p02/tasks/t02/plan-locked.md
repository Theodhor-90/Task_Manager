Now I have all the context needed. Let me produce the implementation plan for Task t02 (Column add endpoint).

# Task 2 Implementation Plan: Column Add Endpoint

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/board.routes.ts` | Modify | Populate the `columnRoutes` stub with the `POST /:boardId/columns` handler |
| 2 | `packages/server/src/app.ts` | Modify | Import `columnRoutes` and register under `/api/boards` prefix |
| 3 | `packages/server/test/routes/board.routes.test.ts` | Modify | Add integration tests for `POST /api/boards/:boardId/columns` |

## 2. Dependencies

- **Task t01 complete**: `board.routes.ts` exists with `boardRoutes` and empty `columnRoutes` stub; test file exists with `createProject` helper that returns both `projectId` and `boardId`
- **Phase 1 (Projects API) complete**: `POST /api/projects` auto-creates a Board with 4 default columns
- **Existing models**: `ProjectModel` (from `project.model.ts`), `BoardModel` (from `board.model.ts`) — `BoardDocument` has `columns: Types.DocumentArray<ColumnDocument>`
- **Auth middleware**: Globally registered in `app.ts` — all non-public routes require JWT
- **Test infrastructure**: `board.routes.test.ts` already has `httpRequest`, `seedAdminUser`, `getAuthToken`, `createProject`, `normalizeId`, lifecycle hooks
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## 3. Implementation Details

### 3.1 `packages/server/src/routes/board.routes.ts` (Modify)

**Changes**: Replace the empty `columnRoutes` stub with a functional plugin containing the `POST /:boardId/columns` handler.

**Add validation helper** (following `project.routes.ts` pattern for `isValidCreateProjectBody`):

```typescript
function isValidCreateColumnBody(
  body: unknown,
): body is { name: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return false;
  }

  return true;
}
```

**Route: `POST /:boardId/columns`**

Handler logic:
1. Extract `boardId` from `request.params as { boardId: string }`
2. Validate `boardId` with `isValidObjectId()` — return `400 { error: "Invalid board ID" }` if invalid
3. Validate request body with `isValidCreateColumnBody()` — return `400 { error: "Column name is required" }` if invalid
4. Query `BoardModel.findOne({ _id: boardId })` — return `404 { error: "Board not found" }` if null
5. Verify ownership: query `ProjectModel.findOne({ _id: board.project, owner: request.user.id })` — return `404 { error: "Board not found" }` if null (use same 404 to avoid leaking board existence)
6. Calculate position as `board.columns.length` (append to end)
7. Push new column subdocument `{ name: body.name, position }` to `board.columns`
8. Save the board via `board.save()` (using appropriate TypeScript cast)
9. Extract the newly created column (last element of `board.columns` after save)
10. Return `201 { data: newColumn }` — serialize the column subdocument using `toJSON()` if available

**Updated `columnRoutes` export**:

```typescript
export const columnRoutes: FastifyPluginAsync = async (app) => {
  app.post("/:boardId/columns", async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
    }

    if (!isValidCreateColumnBody(request.body)) {
      return reply.code(400).send({ error: "Column name is required" });
    }

    const { name } = request.body;

    const board = await BoardModel.findOne({ _id: boardId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const position = board.columns.length;

    (board.columns as unknown as Array<{ name: string; position: number }>).push({
      name,
      position,
    });

    await (board as unknown as { save(): Promise<void> }).save();

    const newColumn = board.columns[board.columns.length - 1];
    const columnWithToJson = newColumn as unknown as Partial<{ toJSON(): Record<string, unknown> }>;
    const columnData = typeof columnWithToJson.toJSON === "function"
      ? columnWithToJson.toJSON()
      : newColumn;

    return reply.code(201).send({ data: columnData });
  });
};
```

**Note**: The `isValidObjectId` function already exists in the file from Task t01. No duplication needed.

### 3.2 `packages/server/src/app.ts` (Modify)

**Changes**:
1. Add import: `import { columnRoutes } from "./routes/board.routes.js";` — update the existing import to include `columnRoutes`
2. Register `columnRoutes` under the `/api/boards` prefix, after the existing `boardRoutes` registration

**Updated import line**:
```typescript
import { boardRoutes, columnRoutes } from "./routes/board.routes.js";
```

**Registration** (add after the `boardRoutes` registration line):
```typescript
await app.register(columnRoutes, { prefix: "/api/boards" });
```

**Full registration order after changes**:
```typescript
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(projectRoutes, { prefix: "/api/projects" });
await app.register(boardRoutes, { prefix: "/api/projects" });
await app.register(columnRoutes, { prefix: "/api/boards" });
```

### 3.3 `packages/server/test/routes/board.routes.test.ts` (Modify)

**Changes**: Add a new `describe("POST /api/boards/:boardId/columns", ...)` block inside the existing `describe("board routes", ...)` block, after the existing `GET /api/projects/:projectId/board` test group.

**Tests to add**:

1. **"adds a column at the end with correct position"**
   - Create a project (auto-creates board with 4 default columns)
   - `POST /api/boards/:boardId/columns` with `{ name: "QA" }` and auth header → expect 201
   - Assert `body.data.name` is `"QA"`
   - Assert `body.data.position` is `4` (appended after 4 defaults)
   - Assert `body.data._id` is defined
   - Verify via `GET /api/projects/:projectId/board` — assert columns length is 5 and last column name is `"QA"` with position 4

2. **"returns 400 when name is missing"**
   - Create a project
   - `POST /api/boards/:boardId/columns` with `{}` and auth header → expect 400
   - Assert `body.error` is `"Column name is required"`

3. **"returns 400 when name is empty string"**
   - Create a project
   - `POST /api/boards/:boardId/columns` with `{ name: "" }` and auth header → expect 400
   - Assert `body.error` is `"Column name is required"`

4. **"returns 400 when name is whitespace only"**
   - Create a project
   - `POST /api/boards/:boardId/columns` with `{ name: "   " }` and auth header → expect 400
   - Assert `body.error` is `"Column name is required"`

5. **"returns 404 for non-existent boardId"**
   - `POST /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns` with `{ name: "Test" }` and auth header → expect 404
   - Assert `body.error` is `"Board not found"`

6. **"returns 400 for invalid boardId format"**
   - `POST /api/boards/not-a-valid-id/columns` with `{ name: "Test" }` and auth header → expect 400
   - Assert `body.error` is `"Invalid board ID"`

7. **"returns 401 without auth token"**
   - `POST /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns` with `{ name: "Test" }` and no auth header → expect 401
   - Assert `body.error` is `"Unauthorized"`

8. **"can add multiple columns sequentially"**
   - Create a project
   - `POST /api/boards/:boardId/columns` with `{ name: "QA" }` → expect 201, assert position 4
   - `POST /api/boards/:boardId/columns` with `{ name: "Deployed" }` → expect 201, assert position 5
   - Verify via `GET /api/projects/:projectId/board` — assert columns length is 6, positions are `[0,1,2,3,4,5]`

## 4. Contracts

### Request: `POST /api/boards/:boardId/columns`

**Path parameters**:
- `boardId` — valid MongoDB ObjectId string (24-char hex)

**Headers**:
- `Authorization: Bearer <jwt_token>` (required)

**Request body**:
```json
{ "name": "QA" }
```

### Response: Created (201)

```json
{
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "name": "QA",
    "position": 4
  }
}
```

### Response: Invalid/missing name (400)

```json
{ "error": "Column name is required" }
```

### Response: Invalid ObjectId (400)

```json
{ "error": "Invalid board ID" }
```

### Response: Not Found (404)

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
- **Lifecycle**: Already established in `board.routes.test.ts` from Task t01:
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest availability
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
  - `afterAll`: `app.close()`, `teardownTestDb()`
- **HTTP client**: Dual-mode `httpRequest` helper (supertest if TCP binding works, Fastify inject otherwise)
- **Data setup**: Projects created via `createProject()` helper which returns `{ projectId, boardId }`

### Test Specifications

| # | Test Name | Setup | Action | Assertions |
|---|-----------|-------|--------|------------|
| 1 | adds a column at the end with correct position | `createProject("Column Test")` | POST `/api/boards/:boardId/columns` with `{ name: "QA" }` | 201; data.name = "QA"; data.position = 4; data._id defined; GET board shows 5 columns, last is "QA" at position 4 |
| 2 | returns 400 when name is missing | `createProject("Missing Name")` | POST `/api/boards/:boardId/columns` with `{}` | 400; error = "Column name is required" |
| 3 | returns 400 when name is empty string | `createProject("Empty Name")` | POST `/api/boards/:boardId/columns` with `{ name: "" }` | 400; error = "Column name is required" |
| 4 | returns 400 when name is whitespace only | `createProject("WS Name")` | POST `/api/boards/:boardId/columns` with `{ name: "   " }` | 400; error = "Column name is required" |
| 5 | returns 404 for non-existent boardId | None | POST `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns` with `{ name: "Test" }` | 404; error = "Board not found" |
| 6 | returns 400 for invalid boardId format | None | POST `/api/boards/not-a-valid-id/columns` with `{ name: "Test" }` | 400; error = "Invalid board ID" |
| 7 | returns 401 without auth token | None | POST `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns` with `{ name: "Test" }`, no auth | 401; error = "Unauthorized" |
| 8 | can add multiple columns sequentially | `createProject("Multi")` | POST columns "QA" (pos 4), then "Deployed" (pos 5) | Both 201; GET board shows 6 columns with positions [0,1,2,3,4,5] |

## 6. Implementation Order

1. **Modify `packages/server/src/routes/board.routes.ts`**
   - Add `isValidCreateColumnBody` validation helper
   - Replace empty `columnRoutes` stub with `POST /:boardId/columns` handler
2. **Modify `packages/server/src/app.ts`**
   - Update import to include `columnRoutes` from `./routes/board.routes.js`
   - Register `columnRoutes` under `/api/boards` prefix
3. **Modify `packages/server/test/routes/board.routes.test.ts`**
   - Add `describe("POST /api/boards/:boardId/columns", ...)` test group
   - Implement all 8 test cases
4. **Run tests and verify**

## 7. Verification Commands

```bash
# Run board route tests only
cd packages/server && npx vitest run test/routes/board.routes.test.ts

# Run all server tests (ensure no regressions in project routes)
cd packages/server && npx vitest run

# Verify TypeScript compilation
cd packages/server && npx tsc --noEmit
```