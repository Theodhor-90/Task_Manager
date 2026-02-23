Implemented the locked plan deliverable by creating the Task model file:

- Created [task.model.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/task.model.ts)
- Added `TaskDocument` interface and `TaskModel` export
- Implemented schema fields exactly as planned:
  - required: `title`, `status`, `board`, `project`
  - defaults: `description: ""`, `priority: "medium"`, `position: 0`, `dueDate: null`
  - enum: `priority` uses shared `PRIORITIES`
  - refs: `labels -> Label[]`, `board -> Board`, `project -> Project`
  - indexes: `board` and `project` set with `index: true`
  - `timestamps: true`

Verification run:

1. `npm run build -w @taskboard/server` passed.
2. `npm run test -w @taskboard/server` passed.
3. The locked plan’s inline `tsx -e` smoke scripts were executed, but parts that rely on full Mongoose runtime introspection (`schema.path`, `schema.indexes`, `new TaskModel(...)`) fail in this repo because `mongoose` is linked to a local stub package (`packages/mongoose`) that does not implement the full API. The model implementation itself compiles and the package test suite passes.