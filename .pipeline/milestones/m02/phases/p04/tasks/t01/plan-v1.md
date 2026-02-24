I now have comprehensive understanding of the entire codebase. Here is the implementation plan:

# Task 1: Comment Route Handlers — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/comment.routes.ts` | Create | Comment CRUD route handlers (two Fastify plugin exports) |

## 2. Dependencies

- **Models**: `CommentModel`, `TaskModel`, `BoardModel`, `ProjectModel` from `../models/index.js`
- **Mongoose**: `mongoose` for `Types.ObjectId.isValid()` validation
- **Type**: `FastifyPluginAsync` from `fastify`
- **Auth**: JWT middleware already applied globally via `auth.middleware.ts` — `request.user.id` is available on all non-public routes
- **No external packages** need to be installed

## 3. Implementation Details

### 3.1 File: `packages/server/src/routes/comment.routes.ts`

#### Imports

```typescript
import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { CommentModel, TaskModel, BoardModel, ProjectModel } from "../models/index.js";
```

#### Validation Functions

Three private helper functions, following the exact pattern used in `task.routes.ts`:

**`isValidObjectId(value: unknown): boolean`**
- Uses `(mongoose as unknown as { Types: { ObjectId: { isValid(input: string): boolean } } }).Types.ObjectId.isValid(value as string)`
- Identical to the pattern in `task.routes.ts:6-10` and `board.routes.ts:5-9`

**`isValidCreateCommentBody(body: unknown): body is { body: string }`**
- Returns `false` if `body` is falsy or not an object
- Destructures `body` field from the request body (note: the field name is `body` on the Comment model)
- Returns `false` if `body` is not a string or is empty after trimming
- Returns `true` otherwise

**`isValidUpdateCommentBody(body: unknown): body is { body: string }`**
- Identical validation to create — `body` field is required and must be a non-empty string
- Returns `false` if the request body is falsy, not an object, or `body` field is missing/empty

#### Authorization Helper Pattern

The authorization chain for comments follows this pattern (not extracted to a helper — inline in each handler, matching the codebase convention):

For **task-scoped routes** (`GET/POST /:taskId/comments`):
1. Validate `taskId` is a valid ObjectId → 400 if not
2. `TaskModel.findOne({ _id: taskId })` → 404 "Task not found" if null
3. `BoardModel.findOne({ _id: task.board })` → 404 "Task not found" if null
4. `ProjectModel.findOne({ _id: board.project, owner: request.user.id })` → 404 "Task not found" if null

For **comment-scoped routes** (`PUT/DELETE /:id`):
1. Validate `id` is a valid ObjectId → 400 if not
2. `CommentModel.findOne({ _id: id })` → 404 "Comment not found" if null
3. `TaskModel.findOne({ _id: comment.task })` → 404 "Comment not found" if null
4. `BoardModel.findOne({ _id: task.board })` → 404 "Comment not found" if null
5. `ProjectModel.findOne({ _id: board.project, owner: request.user.id })` → 404 "Comment not found" if null

#### Export 1: `taskCommentRoutes: FastifyPluginAsync`

Registered with prefix `/api/tasks` in `app.ts`.

**`GET /:taskId/comments`** — List comments for a task
- Params: `taskId` (string)
- Authorization: task → board → project → owner chain
- Query: `CommentModel.find({ task: taskId })` with `.sort({ createdAt: 1 })` and `.populate("author", "name email")`
- The `.sort()` and `.populate()` calls use the same type assertion pattern as `task.routes.ts:203-207` (chain casting)
- Response: `200 { data: comments[] }`
- Each comment in the response includes `author` as `{ _id, name, email }` (no `passwordHash`)

**`POST /:taskId/comments`** — Create a comment
- Params: `taskId` (string)
- Body validation: `isValidCreateCommentBody(request.body)` → 400 `{ error: "Comment body is required" }` if invalid
- Authorization: task → board → project → owner chain
- Create: `CommentModel.create({ body: request.body.body, task: taskId, author: request.user.id })`
- Response: `201 { data: comment }`

#### Export 2: `commentRoutes: FastifyPluginAsync`

Registered with prefix `/api/comments` in `app.ts`.

**`PUT /:id`** — Update a comment
- Params: `id` (string)
- Body validation: `isValidUpdateCommentBody(request.body)` → 400 `{ error: "Comment body is required" }` if invalid
- Authorization: comment → task → board → project → owner chain
- Update: `CommentModel.findOneAndUpdate({ _id: id }, { body: request.body.body }, { new: true })` using the same type assertion pattern as task routes
- Response: `200 { data: updatedComment }`

**`DELETE /:id`** — Delete a comment
- Params: `id` (string)
- Authorization: comment → task → board → project → owner chain
- Delete: `(CommentModel as ...).deleteOne({ _id: id })`
- Response: `200 { data: { message: "Comment deleted" } }` (matches task delete pattern)

## 4. Contracts

### Request/Response Shapes

**POST /api/tasks/:taskId/comments**
```
Request:  { "body": "This is a comment" }
Response: 201 { "data": { "_id": "...", "body": "This is a comment", "task": "...", "author": "...", "createdAt": "...", "updatedAt": "..." } }
```

**GET /api/tasks/:taskId/comments**
```
Response: 200 { "data": [
  { "_id": "...", "body": "Comment text", "task": "...", "author": { "_id": "...", "name": "Admin", "email": "admin@taskboard.local" }, "createdAt": "...", "updatedAt": "..." }
] }
```

**PUT /api/comments/:id**
```
Request:  { "body": "Updated comment text" }
Response: 200 { "data": { "_id": "...", "body": "Updated comment text", "task": "...", "author": "...", "createdAt": "...", "updatedAt": "..." } }
```

**DELETE /api/comments/:id**
```
Response: 200 { "data": { "message": "Comment deleted" } }
```

**Error Responses:**
```
400: { "error": "Comment body is required" }
400: { "error": "Invalid task ID" } / { "error": "Invalid comment ID" }
404: { "error": "Task not found" } / { "error": "Comment not found" }
401: { "error": "Unauthorized" }  (handled by auth middleware)
```

## 5. Test Plan

No tests are delivered in this task. Tests are covered in Task 4 (Comment integration tests). The verification for this task focuses on TypeScript compilation and structural correctness.

## 6. Implementation Order

1. Create `packages/server/src/routes/comment.routes.ts`:
   - Write the three validation functions (`isValidObjectId`, `isValidCreateCommentBody`, `isValidUpdateCommentBody`)
   - Implement `taskCommentRoutes` with `GET /:taskId/comments` and `POST /:taskId/comments`
   - Implement `commentRoutes` with `PUT /:id` and `DELETE /:id`
2. **Do NOT modify `app.ts`** — route registration is handled in Task 3

## 7. Verification Commands

```bash
# Verify TypeScript compiles without errors
cd packages/server && npx tsc --noEmit

# Verify the file exports the expected symbols (quick structural check)
node -e "import('./dist/routes/comment.routes.js').then(m => console.log(Object.keys(m)))"
```

## 8. Key Patterns to Follow (from existing codebase)

- **Type assertions for Mongoose**: Use `(Model as unknown as { method(...): ReturnType }).method(...)` pattern for all Mongoose operations that TypeScript doesn't natively understand (e.g., `.find().sort().populate()` chains). This is the established pattern in `task.routes.ts`.
- **`request.params` casting**: `const { taskId } = request.params as { taskId: string }` — direct casting, no schema validation.
- **`request.body` casting**: Validated via type-guard function first, then accessed via the narrowed type.
- **Error message consistency**: "Invalid X ID" for bad format, "X not found" for non-existent resources, using the parent resource name (e.g., "Task not found" when the task doesn't exist during comment authorization chain traversal).
- **No try/catch blocks**: Route handlers don't wrap logic in try/catch; Fastify's error handler catches unhandled errors.
- **`request.user.id`**: Available as a string from the JWT, typed via the `@fastify/jwt` module augmentation in `auth.middleware.ts`.