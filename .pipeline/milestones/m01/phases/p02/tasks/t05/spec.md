## Task: Task Model

### Objective
Implement the Mongoose Task model with all fields including priority enum, position ordering, and indexes on frequently queried fields.

### Deliverables
- **Create** `packages/server/src/models/task.model.ts`

### Implementation Details
- Define a Mongoose schema matching the shared `Task` interface:
  - `title`: String, required
  - `description`: String, optional (markdown-formatted content)
  - `status`: String, required (matches a column name on the board)
  - `priority`: String, enum `['low', 'medium', 'high', 'urgent']`, default `'medium'` — use `PRIORITIES` from `packages/shared/src/constants/index.ts`
  - `position`: Number, default 0 (sort order within column)
  - `dueDate`: Date, optional
  - `labels`: Array of ObjectId, ref → `'Label'`
  - `board`: ObjectId, ref → `'Board'`, required, indexed
  - `project`: ObjectId, ref → `'Project'`, required, indexed (denormalized for queries)
  - Timestamps: enabled
- Indexes: `board` (for fetching tasks by board), `project` (for fetching tasks by project)
- Export the `TaskModel` (Mongoose model)

### Dependencies
- **t01**: MongoDB connection module (Mongoose installed)
- **t03**: Project model (for project reference)
- **t04**: Board model (for board reference)
- Uses `PRIORITIES` from `packages/shared/src/constants/index.ts`

### Verification Criteria
- `TaskModel` can create a task document with all valid fields
- Creating a task with missing `title` is rejected
- Priority defaults to `'medium'` when not provided
- Priority rejects values outside the enum
- Position defaults to 0 when not provided
- `board` and `project` fields are indexed
- Labels array can reference Label documents