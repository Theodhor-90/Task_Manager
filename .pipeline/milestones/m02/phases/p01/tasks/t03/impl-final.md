Implemented the locked plan exactly, with only the required files changed:

- Updated [`mongoose.test-double.ts`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/mongoose.test-double.ts):
  - Added `$in` operator handling in `matches()`
  - Added `deleteOne()` to the model test-double API

- Updated [`project.routes.ts`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/project.routes.ts):
  - Added imports for `TaskModel`, `CommentModel`, `LabelModel`
  - Added `DELETE /:id` with:
    - ObjectId validation (`400`)
    - ownership/not-found check (`404`)
    - cascade delete order: comments -> tasks -> labels -> board -> project
    - success response: `200 { data: { message: "Project deleted" } }`

- Updated [`project.routes.test.ts`](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/project.routes.test.ts):
  - Added model imports: `TaskModel`, `CommentModel`, `LabelModel`, `ProjectModel`
  - Added `describe("DELETE /api/projects/:id")` with all 6 planned tests:
    - success delete
    - cascade delete verification
    - board-only project deletion
    - `404` non-existent id
    - `400` invalid id format
    - `401` missing auth

Verification commands run and passing:

1. `cd packages/server && npm run build`
2. `cd packages/server && npm test`
3. `cd packages/server && npx vitest run test/routes/project.routes.test.ts`
4. `cd packages/server && npx vitest run test/routes/auth.routes.test.ts`
5. `cd packages/server && npx vitest run test/app.test.ts`