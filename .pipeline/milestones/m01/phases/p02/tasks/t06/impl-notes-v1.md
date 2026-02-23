Implemented `t06` exactly per the locked plan by creating the three model files and re-export barrel.

**Changes made**
- Created [comment.model.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/comment.model.ts)
- Created [label.model.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/label.model.ts)
- Created [index.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/index.ts)

**What was implemented**
- `CommentModel` with required `body`, required/indexed `task` ref to `Task`, required `author` ref to `User`, and `timestamps: true`.
- `LabelModel` with required `name`, required `color`, required/indexed `project` ref to `Project`, and `timestamps: true`.
- Barrel re-exports for:
  - `UserModel`, `ProjectModel`, `BoardModel`, `TaskModel`, `CommentModel`, `LabelModel`
  - `hashPassword`, `verifyPassword`
  - all related `*Document` types (including `ColumnDocument`).

**Dependencies**
- No dependency installation was needed (as specified).

**Verification run**
- Passed: `npm run build -w @taskboard/server`
- Passed: barrel import check (`tsx` inline import of all exports)
- Passed: `npm run test -w @taskboard/server`
- The plan’s runtime checks that use `Model.collection`, `schema.path`, and `new Model().validate()` are not supported in this repo’s local `mongoose` workspace shim (`packages/mongoose`), so I verified schema structure/index flags via `schema.definition` instead:
  - `Comment.task indexed: true`
  - `Label.project indexed: true`