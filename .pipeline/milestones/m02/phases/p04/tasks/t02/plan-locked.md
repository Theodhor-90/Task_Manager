Now I have all the context needed. Let me produce the implementation plan.

# Task 2: Label Route Handlers — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/label.routes.ts` | Create | Label CRUD route handlers (two Fastify plugin exports) |

## 2. Dependencies

- **Models**: `LabelModel`, `TaskModel`, `ProjectModel` from `../models/index.js`
- **Mongoose**: `mongoose` for `Types.ObjectId.isValid()` validation
- **Type**: `FastifyPluginAsync` from `fastify`
- **Auth**: JWT middleware already applied globally via `auth.middleware.ts` — `request.user.id` is available on all routes
- **No external packages** need to be installed

## 3. Implementation Details

### 3.1 File: `packages/server/src/routes/label.routes.ts`

#### Imports

```typescript
import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { LabelModel, TaskModel, ProjectModel } from "../models/index.js";
```

#### Validation Functions

Three private helper functions, following the exact pattern used in `task.routes.ts` and `board.routes.ts`:

**`isValidObjectId(value: unknown): boolean`**
- Uses `(mongoose as unknown as { Types: { ObjectId: { isValid(input: string): boolean } } }).Types.ObjectId.isValid(value as string)`
- Identical to the pattern in `task.routes.ts:6-10`, `board.routes.ts:5-9`, and `project.routes.ts:62-66`

**`isValidCreateLabelBody(body: unknown): body is { name: string; color: string }`**
- Returns `false` if `body` is falsy or not an object
- Destructures `name` and `color` fields from the request body
- Returns `false` if `name` is not a string or is empty after trimming
- Returns `false` if `color` is not a string or is empty after trimming
- Returns `true` otherwise

**`isValidUpdateLabelBody(body: unknown): body is { name?: string; color?: string }`**
- Returns `false` if `body` is falsy or not an object
- Destructures `name` and `color` fields from the request body
- Returns `false` if neither `name` nor `color` is defined (at least one required)
- Returns `false` if `name` is defined but not a string or is empty after trimming
- Returns `false` if `color` is defined but not a string or is empty after trimming
- Returns `true` otherwise

#### Authorization Pattern

For **project-scoped routes** (`GET/POST /:projectId/labels`):
1. Validate `projectId` is a valid ObjectId → 400 `{ error: "Invalid project ID" }` if not
2. `ProjectModel.findOne({ _id: projectId, owner: request.user.id })` → 404 `{ error: "Project not found" }` if null

For **label-scoped routes** (`PUT/DELETE /:id`):
1. Validate `id` is a valid ObjectId → 400 `{ error: "Invalid label ID" }` if not
2. `LabelModel.findOne({ _id: id })` → 404 `{ error: "Label not found" }` if null
3. `ProjectModel.findOne({ _id: label.project, owner: request.user.id })` → 404 `{ error: "Label not found" }` if null

#### Export 1: `projectLabelRoutes: FastifyPluginAsync`

Registered with prefix `/api/projects` in `app.ts`.

**`GET /:projectId/labels`** — List labels for a project
- Params: `projectId` (string) — extracted via `const { projectId } = request.params as { projectId: string }`
- Authorization: verify project exists and owner matches `request.user.id`
- Query: `LabelModel.find({ project: projectId })` with `.sort({ createdAt: 1 })`
- Uses the same type assertion pattern as `task.routes.ts:203-207` for the `.find().sort()` chain:
  ```typescript
  const labels = await (LabelModel as unknown as {
    find(filter: Record<string, unknown>): {
      sort(sortObj: Record<string, number>): Promise<unknown[]>;
    };
  }).find({ project: projectId }).sort({ createdAt: 1 });
  ```
- Response: `200 { data: labels[] }`

**`POST /:projectId/labels`** — Create a label
- Params: `projectId` (string)
- Body validation: `isValidCreateLabelBody(request.body)` → 400 `{ error: "Label name and color are required" }` if invalid
- Authorization: verify project exists and owner matches `request.user.id`
- Create: `LabelModel.create({ name: request.body.name, color: request.body.color, project: projectId })`
- Response: `201 { data: label }`

#### Export 2: `labelRoutes: FastifyPluginAsync`

Registered with prefix `/api/labels` in `app.ts`.

**`PUT /:id`** — Update a label
- Params: `id` (string) — extracted via `const { id } = request.params as { id: string }`
- Body validation: `isValidUpdateLabelBody(request.body)` → 400 `{ error: "At least one valid field is required" }` if invalid
- Authorization: label → project → owner chain
- Build updates object: only include `name` and/or `color` if defined
- Update: `LabelModel.findOneAndUpdate({ _id: id }, updates, { new: true })` using the same type assertion pattern as `task.routes.ts:483-493`
- Response: `200 { data: updatedLabel }`

**`DELETE /:id`** — Delete a label
- Params: `id` (string)
- Authorization: label → project → owner chain
- Cleanup: `TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })` — removes the label ID from all tasks' `labels` arrays **before** deleting the label document
  ```typescript
  await (TaskModel as unknown as {
    updateMany(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ): Promise<unknown>;
  }).updateMany(
    { labels: id },
    { $pull: { labels: id } },
  );
  ```
- Delete: `(LabelModel as unknown as { deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> }).deleteOne({ _id: id })`
- Response: `200 { data: { message: "Label deleted" } }` (matches task/column/project delete pattern)

## 4. Contracts

### Request/Response Shapes

**POST /api/projects/:projectId/labels**
```
Request:  { "name": "Bug", "color": "#ef4444" }
Response: 201 { "data": { "_id": "...", "name": "Bug", "color": "#ef4444", "project": "...", "createdAt": "...", "updatedAt": "..." } }
```

**GET /api/projects/:projectId/labels**
```
Response: 200 { "data": [
  { "_id": "...", "name": "Bug", "color": "#ef4444", "project": "...", "createdAt": "...", "updatedAt": "..." }
] }
```

**PUT /api/labels/:id**
```
Request:  { "name": "Feature", "color": "#22c55e" }
Response: 200 { "data": { "_id": "...", "name": "Feature", "color": "#22c55e", "project": "...", "createdAt": "...", "updatedAt": "..." } }
```

**DELETE /api/labels/:id**
```
Response: 200 { "data": { "message": "Label deleted" } }
```

**Error Responses:**
```
400: { "error": "Label name and color are required" }
400: { "error": "At least one valid field is required" }
400: { "error": "Invalid project ID" } / { "error": "Invalid label ID" }
404: { "error": "Project not found" } / { "error": "Label not found" }
401: { "error": "Unauthorized" }  (handled by auth middleware)
```

## 5. Test Plan

No tests are delivered in this task. Tests are covered in Task 5 (Label integration tests). The verification for this task focuses on TypeScript compilation and structural correctness.

## 6. Implementation Order

1. Create `packages/server/src/routes/label.routes.ts`:
   - Write the three validation functions (`isValidObjectId`, `isValidCreateLabelBody`, `isValidUpdateLabelBody`)
   - Implement `projectLabelRoutes` with `GET /:projectId/labels` and `POST /:projectId/labels`
   - Implement `labelRoutes` with `PUT /:id` and `DELETE /:id`
2. **Do NOT modify `app.ts`** — route registration is handled in Task 3

## 7. Verification Commands

```bash
# Verify TypeScript compiles without errors
cd packages/server && npx tsc --noEmit

# Verify the file exports the expected symbols (quick structural check)
node -e "import('./dist/routes/label.routes.js').then(m => console.log(Object.keys(m)))"
```

## 8. Key Patterns to Follow (from existing codebase)

- **Type assertions for Mongoose**: Use `(Model as unknown as { method(...): ReturnType }).method(...)` pattern for all Mongoose operations that TypeScript doesn't natively understand (e.g., `.find().sort()` chains, `.findOneAndUpdate()`, `.deleteOne()`, `.updateMany()`). This is the established pattern in `task.routes.ts`, `board.routes.ts`, and `project.routes.ts`.
- **`request.params` casting**: `const { projectId } = request.params as { projectId: string }` — direct casting, no schema validation.
- **`request.body` casting**: Validated via type-guard function first, then accessed via the narrowed type.
- **Error message consistency**: "Invalid X ID" for bad ObjectId format, "X not found" for non-existent resources. When traversing the authorization chain from a label, use "Label not found" for any failure in the chain (matching how task routes use "Task not found" when the board or project isn't found).
- **No try/catch blocks**: Route handlers don't wrap logic in try/catch; Fastify's error handler catches unhandled errors.
- **`request.user.id`**: Available as a string from the JWT, typed via the `@fastify/jwt` module augmentation in `auth.middleware.ts`.
- **Delete response pattern**: `{ data: { message: "X deleted" } }` — used consistently in `task.routes.ts:558`, `board.routes.ts:403`, and `project.routes.ts:206`.
- **Updates object pattern**: Build a `Record<string, unknown>` with only the fields that are defined, then pass to `findOneAndUpdate` (see `task.routes.ts:476-481` and `project.routes.ts:144-146`).
- **$pull for cleanup**: The `TaskModel.updateMany` with `$pull` must execute **before** the label document is deleted, ensuring referential integrity.