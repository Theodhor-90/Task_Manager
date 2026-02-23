## Task: Comment and Label Models

### Objective
Implement the Mongoose Comment and Label models, and create a barrel file that re-exports all models from a single entry point.

### Deliverables
- **Create** `packages/server/src/models/comment.model.ts`
- **Create** `packages/server/src/models/label.model.ts`
- **Create** `packages/server/src/models/index.ts` (barrel file)

### Implementation Details

**Comment model** (`comment.model.ts`):
- Fields:
  - `body`: String, required
  - `task`: ObjectId, ref → `'Task'`, required, indexed
  - `author`: ObjectId, ref → `'User'`, required
  - Timestamps: enabled
- Index on `task` field (for fetching comments by task)
- Export `CommentModel`

**Label model** (`label.model.ts`):
- Fields:
  - `name`: String, required
  - `color`: String, required (hex color string, e.g., `"#ef4444"`)
  - `project`: ObjectId, ref → `'Project'`, required, indexed
  - Timestamps: enabled (note: shared type only has `createdAt` but Mongoose timestamps adds both)
- Index on `project` field (for fetching labels by project)
- Export `LabelModel`

**Barrel file** (`index.ts`):
- Re-export all models: `UserModel`, `ProjectModel`, `BoardModel`, `TaskModel`, `CommentModel`, `LabelModel`
- Re-export password utilities: `hashPassword`, `verifyPassword`

### Dependencies
- **t01**: MongoDB connection module (Mongoose installed)
- **t02**: User model (for Comment.author reference and re-export)
- **t03**: Project model (for Label.project reference and re-export)
- **t04**: Board model (for re-export)
- **t05**: Task model (for Comment.task reference and re-export)

### Verification Criteria
- `CommentModel` can create a comment with valid fields
- Creating a comment with missing `body` or `task` is rejected
- `LabelModel` can create a label with valid fields
- Creating a label with missing `name`, `color`, or `project` is rejected
- `Comment.task` field is indexed
- `Label.project` field is indexed
- The barrel file re-exports all 6 models and password utilities
- Importing from `models/index.ts` provides access to all models