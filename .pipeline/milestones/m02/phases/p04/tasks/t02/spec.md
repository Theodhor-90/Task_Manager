# Task 2: Label route handlers

## Objective

Create the label CRUD route handlers with label deletion cleanup logic (removing deleted label references from all tasks), following the same Fastify plugin pattern as existing route files.

## Deliverables

- New file `packages/server/src/routes/label.routes.ts` exporting two Fastify plugins:
  - **`projectLabelRoutes: FastifyPluginAsync`** — handles routes under `/api/projects/:projectId/labels`:
    - `GET /:projectId/labels` — list labels for a project, sorted by `createdAt` ascending.
    - `POST /:projectId/labels` — create a label. `name` (non-empty string) and `color` (hex string, e.g. `"#ef4444"`) are both required. `project` is set from `:projectId` URL param. Returns 201.
  - **`labelRoutes: FastifyPluginAsync`** — handles routes under `/api/labels`:
    - `PUT /:id` — update label `name` and/or `color`. At least one valid field must be provided. Returns 200.
    - `DELETE /:id` — remove the label's ObjectId from the `labels` array of all tasks that reference it using `TaskModel.updateMany({ labels: labelId }, { $pull: { labels: labelId } })`, then delete the label document. Returns 200.

## Implementation Details

- **Validation functions** to implement: `isValidObjectId(id)`, `isValidCreateLabelBody(body)`, `isValidUpdateLabelBody(body)` — manual type-guards consistent with existing route files.
- **Authorization**: For `GET/POST` on project labels — verify the project exists and its `owner` matches `request.user.id`. For `PUT/DELETE` on a label — look up the label, find its project, verify ownership.
- **Label deletion cleanup**: The `$pull` operation on `TaskModel` must execute before deleting the label document itself. This ensures referential integrity.
- **Response envelope**: `{ data: T }` for success, `{ error: string }` for errors. HTTP status codes: 200, 201, 400, 401, 404.
- **Error cases**: Return 400 for missing `name` or `color` on create, 400 for no valid fields on update, 400 for invalid ObjectId format, 404 for non-existent project or label, 401 for missing/invalid JWT.
- **Pattern reference**: Follow the dual-export pattern from `task.routes.ts` and `board.routes.ts`.

## Files

| File | Action |
|------|--------|
| `packages/server/src/routes/label.routes.ts` | Create |

## Dependencies

- Existing Mongoose models: `LabelModel`, `TaskModel`, `ProjectModel` (from `packages/server/src/models/index.ts`)
- JWT auth middleware already applied
- No dependencies on other tasks in this phase (can be done in parallel with Task 1)

## Verification

1. File exports `projectLabelRoutes` and `labelRoutes` as `FastifyPluginAsync`
2. TypeScript compiles without errors
3. All four endpoints handle success and error cases with correct status codes and response envelopes
4. Label delete performs `$pull` on all tasks before removing the label document
5. Labels are sorted by `createdAt` ascending on list endpoint