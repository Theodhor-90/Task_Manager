## Objective

Add the `DELETE /:id` handler to `project.routes.ts` that deletes a project and cascades the deletion to all associated resources: board, tasks, comments, and labels.

## Deliverables

### 1. Add `DELETE /:id` handler in `packages/server/src/routes/project.routes.ts`

- Parse `request.params.id`; return `400 { error: "Invalid project ID" }` if not a valid ObjectId
- Find project by `{ _id: id, owner: request.user.id }`; return `404 { error: "Project not found" }` if not found
- Execute cascade delete in this specific order (dependents before parents):
  1. Find the board: `BoardModel.findOne({ project: id })`
  2. If board exists:
     - Find all task IDs: `TaskModel.find({ board: board._id }).select("_id")`
     - Delete all comments on those tasks: `CommentModel.deleteMany({ task: { $in: taskIds } })`
     - Delete all tasks: `TaskModel.deleteMany({ board: board._id })`
     - Delete all labels for the project: `LabelModel.deleteMany({ project: id })`
     - Delete the board: `BoardModel.deleteOne({ _id: board._id })`
  3. Delete the project: `ProjectModel.deleteOne({ _id: id })`
- Return `200 { data: { message: "Project deleted" } }`

## Key Constraints

- **Delete order matters**: Comments → Tasks → Labels → Board → Project. This respects the reference dependency graph and avoids dangling references.
- MongoDB standalone does not support multi-collection transactions — each `deleteMany`/`deleteOne` runs in sequence
- Must import all models: `ProjectModel`, `BoardModel`, `TaskModel`, `CommentModel`, `LabelModel`
- Even if no board/tasks/comments/labels exist, the delete should still succeed (handle empty collections gracefully)

## Files

| File | Action |
|------|--------|
| `packages/server/src/routes/project.routes.ts` | **Modify** (add DELETE /:id handler) |

## Dependencies

- **t01**: Route file and registration must exist
- **t02**: GET/PUT handlers should already be in place (ordering convention)

## Verification

1. `DELETE /api/projects/:id` on an existing project returns `200 { data: { message: "Project deleted" } }`
2. After deletion, the project is no longer in the `projects` collection
3. After deletion, the associated board is removed from the `boards` collection
4. After deletion, all tasks that were on the board are removed
5. After deletion, all comments on those tasks are removed
6. After deletion, all labels scoped to the project are removed
7. `DELETE /api/projects/:id` with non-existent ID returns 404
8. `DELETE /api/projects/:id` with invalid ObjectId returns 400
9. Deleting a project with no associated resources (just project + board, no tasks/comments/labels) succeeds without errors