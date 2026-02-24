Now I have everything I need. Let me produce the implementation plan.

# Task 1 Implementation Plan: Create task route file with validation helpers and route registration

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/task.routes.ts` | Create | Task route handlers file with validation utilities and two exported Fastify plugins (`boardTaskRoutes`, `taskRoutes`) |
| 2 | `packages/server/src/app.ts` | Modify | Import and register both task route plugins with correct prefixes |

## 2. Dependencies

- **No in-phase dependencies** — this is the first task in phase 3
- **External prerequisites** (all already in place):
  - `@taskboard/shared` package exporting `PRIORITIES` constant from `packages/shared/src/constants/index.ts`
  - `packages/server/src/app.ts` with existing plugin registration pattern
  - `packages/server/src/models/index.ts` exporting `TaskModel`, `BoardModel`, `ProjectModel`, `CommentModel`
  - Fastify app factory (`buildApp`) with JWT auth middleware already registered

## 3. Implementation Details

### 3.1 `packages/server/src/routes/task.routes.ts` (Create)

**Imports:**

```typescript
import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { PRIORITIES } from "@taskboard/shared";
import { TaskModel, BoardModel, ProjectModel, CommentModel } from "../models/index.js";
```

**`isValidObjectId(value: unknown): boolean`**

Identical to the pattern in `board.routes.ts:5-9`:

```typescript
function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}
```

**`isValidCreateTaskBody(body: unknown): body is { title: string; description?: string; priority?: string; dueDate?: string; labels?: string[]; status?: string }`**

Validation logic:
1. Guard: if `!body || typeof body !== "object"` → return false
2. Destructure `{ title, description, priority, dueDate, labels, status }` from `body as Record<string, unknown>`
3. `title` — required, must be `typeof title === "string" && title.trim().length > 0`; return false otherwise
4. `description` — optional; if present, must be `typeof description === "string"`
5. `priority` — optional; if present, must be `typeof priority === "string"` AND `(PRIORITIES as readonly string[]).includes(priority)`
6. `dueDate` — optional; if present, must be `typeof dueDate === "string"`
7. `labels` — optional; if present, must be `Array.isArray(labels)` and every element must be `typeof el === "string"`
8. `status` — optional; if present, must be `typeof status === "string" && status.trim().length > 0`
9. Return true if all checks pass

**`isValidUpdateTaskBody(body: unknown): body is { title?: string; description?: string; priority?: string; dueDate?: string | null; labels?: string[] }`**

Validation logic:
1. Guard: if `!body || typeof body !== "object"` → return false
2. Destructure `{ title, description, priority, dueDate, labels }` from `body as Record<string, unknown>`
3. Check that at least one field is present (`title !== undefined || description !== undefined || priority !== undefined || dueDate !== undefined || labels !== undefined`); return false if none
4. `title` — if present, must be `typeof title === "string" && title.trim().length > 0`
5. `description` — if present, must be `typeof description === "string"`
6. `priority` — if present, must be `typeof priority === "string"` AND `(PRIORITIES as readonly string[]).includes(priority)`
7. `dueDate` — if present, must be `typeof dueDate === "string" || dueDate === null`
8. `labels` — if present, must be `Array.isArray(labels)` and every element must be `typeof el === "string"`
9. Return true if all checks pass

**`isValidMoveTaskBody(body: unknown): body is { position: number; status?: string }`**

Validation logic:
1. Guard: if `!body || typeof body !== "object"` → return false
2. Destructure `{ position, status }` from `body as Record<string, unknown>`
3. `position` — required, must be `typeof position === "number" && Number.isInteger(position) && position >= 0`
4. `status` — optional; if present, must be `typeof status === "string" && status.trim().length > 0`
5. Return true if all checks pass

**`boardTaskRoutes: FastifyPluginAsync`**

Exported Fastify plugin. Contains two stub route handlers:

```typescript
export const boardTaskRoutes: FastifyPluginAsync = async (app) => {
  // GET /:boardId/tasks — list tasks for a board (Task 3)
  app.get("/:boardId/tasks", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  // POST /:boardId/tasks — create a task (Task 2)
  app.post("/:boardId/tasks", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });
};
```

**`taskRoutes: FastifyPluginAsync`**

Exported Fastify plugin. Contains four stub route handlers:

```typescript
export const taskRoutes: FastifyPluginAsync = async (app) => {
  // GET /:id — get task by ID (Task 4)
  app.get("/:id", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  // PUT /:id — update task (Task 4)
  app.put("/:id", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  // DELETE /:id — delete task (Task 4)
  app.delete("/:id", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  // PUT /:id/move — move/reorder task (Task 5)
  app.put("/:id/move", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });
};
```

Note: The `PUT /:id/move` route must be registered **before** `PUT /:id` to prevent Fastify from treating `"move"` as an `:id` parameter. Alternatively, since Fastify uses `find-my-way` for routing, it will correctly differentiate `/tasks/:id/move` from `/tasks/:id` because `/move` is a literal path segment after the param. The order of registration within the plugin is: `GET /:id`, then `PUT /:id/move`, then `PUT /:id`, then `DELETE /:id`. Actually — Fastify's `find-my-way` router handles this correctly regardless of order since `/:id/move` is a distinct route pattern from `/:id`. But to be safe and follow the convention of placing more-specific routes first, register `PUT /:id/move` before `PUT /:id`.

**Full file structure:**

```
imports
isValidObjectId()
isValidCreateTaskBody()
isValidUpdateTaskBody()
isValidMoveTaskBody()
export boardTaskRoutes   (GET /:boardId/tasks, POST /:boardId/tasks)
export taskRoutes        (GET /:id, PUT /:id/move, PUT /:id, DELETE /:id)
```

### 3.2 `packages/server/src/app.ts` (Modify)

**Changes:**

1. Add import at line 8 (after the `projectRoutes` import):
   ```typescript
   import { boardTaskRoutes, taskRoutes } from "./routes/task.routes.js";
   ```

2. Add two route registrations after line 26 (after `columnRoutes` registration):
   ```typescript
   await app.register(boardTaskRoutes, { prefix: "/api/boards" });
   await app.register(taskRoutes, { prefix: "/api/tasks" });
   ```

**Resulting registration order in `app.ts`:**
```
authRoutes     → /api/auth
projectRoutes  → /api/projects
boardRoutes    → /api/projects
columnRoutes   → /api/boards
boardTaskRoutes → /api/boards   (new — same prefix as columnRoutes, Fastify merges them)
taskRoutes     → /api/tasks     (new)
```

Note: `boardTaskRoutes` shares the `/api/boards` prefix with `columnRoutes`. This is valid — Fastify registers both plugin's routes under the same prefix. The paths `/:boardId/tasks` will not conflict with `/:boardId/columns` because the second segment differs.

## 4. Contracts

### Validation Function Contracts

**`isValidCreateTaskBody`**

| Input | Returns | Reason |
|-------|---------|--------|
| `{ title: "Fix bug" }` | `true` | Title is the only required field |
| `{ title: "Fix bug", description: "Details", priority: "high", dueDate: "2026-03-01", labels: ["abc123"], status: "To Do" }` | `true` | All optional fields valid |
| `{ title: "" }` | `false` | Empty title |
| `{ description: "No title" }` | `false` | Missing title |
| `{ title: "X", priority: "critical" }` | `false` | Invalid priority value |
| `{ title: "X", labels: "not-array" }` | `false` | Labels must be array |
| `null` | `false` | Not an object |

**`isValidUpdateTaskBody`**

| Input | Returns | Reason |
|-------|---------|--------|
| `{ title: "New title" }` | `true` | At least one field present |
| `{ priority: "low" }` | `true` | Valid priority |
| `{ dueDate: null }` | `true` | Null clears due date |
| `{ labels: ["id1", "id2"] }` | `true` | Valid labels array |
| `{}` | `false` | No updatable fields |
| `{ priority: "critical" }` | `false` | Invalid priority |
| `{ title: "" }` | `false` | Empty title |

**`isValidMoveTaskBody`**

| Input | Returns | Reason |
|-------|---------|--------|
| `{ position: 0 }` | `true` | Position only (within-column reorder) |
| `{ position: 2, status: "Done" }` | `true` | Cross-column move |
| `{ status: "Done" }` | `false` | Missing position |
| `{ position: -1 }` | `false` | Negative position |
| `{ position: 1.5 }` | `false` | Non-integer position |
| `{ position: 0, status: "" }` | `false` | Empty status string |

## 5. Test Plan

This task (t01) creates scaffold/stubs — the comprehensive integration tests are specified in task t06. However, the following should be verified to confirm the task is complete:

### 5.1 Compilation verification
- The new file `task.routes.ts` compiles without TypeScript errors
- The modified `app.ts` compiles without TypeScript errors
- The full server package builds successfully

### 5.2 Server startup verification
- The server starts without errors (no route conflicts, no missing imports)
- The stub endpoints are reachable and return 501

### 5.3 Manual verification of validation helpers (via future tests)
The validation functions will be implicitly tested when integration tests run in task t06. No separate unit test file is needed for this task since:
- The validators are private functions (not exported)
- They will be tested through the route handlers in subsequent tasks

## 6. Implementation Order

1. **Create `packages/server/src/routes/task.routes.ts`**
   - Write all imports
   - Implement `isValidObjectId()` helper
   - Implement `isValidCreateTaskBody()` type guard
   - Implement `isValidUpdateTaskBody()` type guard
   - Implement `isValidMoveTaskBody()` type guard
   - Define and export `boardTaskRoutes` plugin with stub handlers (GET, POST)
   - Define and export `taskRoutes` plugin with stub handlers (GET, PUT /move, PUT, DELETE)

2. **Modify `packages/server/src/app.ts`**
   - Add import for `boardTaskRoutes` and `taskRoutes` from `./routes/task.routes.js`
   - Register `boardTaskRoutes` with prefix `/api/boards`
   - Register `taskRoutes` with prefix `/api/tasks`

## 7. Verification Commands

```bash
# 1. TypeScript compilation check (from server package)
cd packages/server && npx tsc --noEmit

# 2. Full build check (from project root)
npm run build --workspace=packages/server

# 3. Verify server starts without errors (start and immediately verify, then stop)
cd packages/server && npx tsx src/server.ts &
SERVER_PID=$!
sleep 3
kill $SERVER_PID

# 4. Run existing tests to confirm no regressions
cd packages/server && npm test

# 5. Verify stub routes respond (requires running server + auth token)
# After starting the server and obtaining a token:
# curl -H "Authorization: Bearer <token>" http://localhost:3000/api/boards/<boardId>/tasks
# Expected: { "error": "Not implemented" } with status 501
# curl -H "Authorization: Bearer <token>" http://localhost:3000/api/tasks/<taskId>
# Expected: { "error": "Not implemented" } with status 501
```