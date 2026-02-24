# Task 1: Comment route handlers

## Objective

Create the comment CRUD route handlers following the established Fastify plugin pattern used by existing route files (`task.routes.ts`, `board.routes.ts`, etc.).

## Deliverables

- New file `packages/server/src/routes/comment.routes.ts` exporting two Fastify plugins:
  - **`taskCommentRoutes: FastifyPluginAsync`** — handles routes under `/api/tasks/:taskId/comments`:
    - `GET /:taskId/comments` — list comments for a task, sorted by `createdAt` ascending, with `author` populated (`name`, `email` only — exclude `passwordHash`). Uses Mongoose `.populate("author", "name email")`.
    - `POST /:taskId/comments` — create a comment. `body` is required (non-empty string). `author` is set from `request.user.id` (JWT). `task` is set from the `:taskId` URL param. Returns 201 on success.
  - **`commentRoutes: FastifyPluginAsync`** — handles routes under `/api/comments`:
    - `PUT /:id` — update the comment `body` field. `body` is required and must be a non-empty string. Returns 200.
    - `DELETE /:id` — delete a comment. Returns 200.

## Implementation Details

- **Validation functions** to implement: `isValidObjectId(id)`, `isValidCreateCommentBody(body)`, `isValidUpdateCommentBody(body)` — using manual type-guard functions consistent with existing route files (no schema validation library).
- **Authorization chain**: For `GET/POST` on task comments — verify the task exists, find its board, find the board's project, and confirm the project owner matches `request.user.id`. For `PUT/DELETE` on a comment — look up the comment, find its task, then follow the same task → board → project → owner chain.
- **Response envelope**: `{ data: T }` for success, `{ error: string }` for errors. HTTP status codes: 200, 201, 400, 401, 404.
- **Error cases**: Return 400 for missing/empty `body` field, 400 for invalid ObjectId format, 404 for non-existent task or comment, 401 for missing/invalid JWT.
- **Pattern reference**: Follow the dual-export pattern used in `packages/server/src/routes/task.routes.ts` which exports both `boardTaskRoutes` and `taskRoutes` for different URL prefixes.

## Files

| File | Action |
|------|--------|
| `packages/server/src/routes/comment.routes.ts` | Create |

## Dependencies

- Existing Mongoose models: `CommentModel`, `TaskModel`, `BoardModel`, `ProjectModel` (from `packages/server/src/models/index.ts`)
- JWT auth middleware already applied to routes via `app.ts` plugin registration
- No dependencies on other tasks in this phase

## Verification

1. File exports `taskCommentRoutes` and `commentRoutes` as `FastifyPluginAsync`
2. TypeScript compiles without errors (`npx tsc --noEmit` from `packages/server`)
3. All four endpoints handle success and error cases with correct status codes and response envelopes
4. Author population returns `name` and `email` only (no `passwordHash`)
5. Comments are sorted by `createdAt` ascending on list endpoint