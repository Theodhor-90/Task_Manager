## Task: Board Model with Embedded Columns

### Objective
Implement the Mongoose Board model with a 1:1 relationship to Project and embedded Column subdocuments.

### Deliverables
- **Create** `packages/server/src/models/board.model.ts`

### Implementation Details
- Define a Column subdocument schema:
  - `name`: String, required
  - `position`: Number, required
  - Each column subdocument gets an auto-generated `_id`
- Define the Board schema matching the shared `Board` interface:
  - `project`: ObjectId, ref → `'Project'`, required, unique index (enforces 1:1 relationship)
  - `columns`: Array of Column subdocuments, ordered
  - Timestamps: enabled
- Unique index on `project` field to enforce one board per project
- Default columns on board creation: `["To Do", "In Progress", "In Review", "Done"]` — use `DEFAULT_COLUMNS` from `packages/shared/src/constants/index.ts`
- Export the `BoardModel` (Mongoose model)

### Dependencies
- **t01**: MongoDB connection module (Mongoose installed)
- **t03**: Project model must exist (for project reference integrity)
- Uses `DEFAULT_COLUMNS` from `packages/shared/src/constants/index.ts`

### Verification Criteria
- `BoardModel` can create a board linked to a project with embedded columns
- Creating a second board for the same project is rejected (unique constraint on `project`)
- Columns are stored as embedded subdocuments with `_id`, `name`, and `position`
- Columns can be added, removed, and reordered within the embedded array
- Default columns constant is correctly imported and usable