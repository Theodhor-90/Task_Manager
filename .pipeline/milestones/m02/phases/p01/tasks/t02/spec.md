## Objective

Add `GET /:id` and `PUT /:id` handlers to the existing `project.routes.ts` file to support fetching and updating individual projects.

## Deliverables

### 1. Add `GET /:id` handler in `packages/server/src/routes/project.routes.ts`

- Parse `request.params.id`
- Return `400 { error: "Invalid project ID" }` if not a valid MongoDB ObjectId (use `mongoose.Types.ObjectId.isValid()`)
- Query `ProjectModel.findOne({ _id: id, owner: request.user.id })`
- Return `404 { error: "Project not found" }` if not found
- Return `200 { data: project }` on success

### 2. Add `PUT /:id` handler in `packages/server/src/routes/project.routes.ts`

- Parse `request.params.id`; return 400 if not a valid ObjectId
- Validate body: at least one of `name` (non-empty string) or `description` (string) must be provided
- Return `400 { error: "..." }` if no valid update fields are present
- Use `ProjectModel.findOneAndUpdate({ _id: id, owner: request.user.id }, updates, { new: true })`
- Return `404 { error: "Project not found" }` if not found
- Return `200 { data: updatedProject }` on success

## Key Constraints

- All endpoints filter by `owner: request.user.id` for ownership scoping
- Return 404 (not 403) when project doesn't exist or isn't owned by user — prevents information leakage
- Use `findOneAndUpdate` with `{ new: true }` to return the updated document
- Only allow updating `name` and `description` fields — ignore any other fields in the body

## Files

| File | Action |
|------|--------|
| `packages/server/src/routes/project.routes.ts` | **Modify** (add GET /:id and PUT /:id handlers) |

## Dependencies

- **t01**: Route file and registration must exist

## Verification

1. `GET /api/projects/:id` with a valid project ID returns 200 with project data
2. `GET /api/projects/:id` with a non-existent ID returns 404
3. `GET /api/projects/:id` with an invalid ObjectId returns 400
4. `PUT /api/projects/:id` with `{ "name": "Updated" }` returns 200 with updated project
5. `PUT /api/projects/:id` with non-existent ID returns 404
6. `PUT /api/projects/:id` with no valid fields returns 400
7. Server still compiles without errors