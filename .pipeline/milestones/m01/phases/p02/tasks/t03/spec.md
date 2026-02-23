## Task: Project Model

### Objective
Implement the Mongoose Project model with required field validation and owner reference.

### Deliverables
- **Create** `packages/server/src/models/project.model.ts`

### Implementation Details
- Define a Mongoose schema matching the shared `Project` interface from `packages/shared/src/types/index.ts`
- Fields:
  - `name`: String, required, trimmed
  - `description`: String, optional
  - `owner`: ObjectId, ref → `'User'`, required
  - Timestamps: enabled
- Export the `ProjectModel` (Mongoose model)

### Dependencies
- **t01**: MongoDB connection module (Mongoose installed)
- **t02**: User model must exist (for owner reference integrity)

### Verification Criteria
- `ProjectModel` can create a project document with valid fields
- Creating a project with missing `name` is rejected (required validation)
- Creating a project with missing `owner` is rejected
- The `name` field is trimmed on save
- `owner` field correctly references User documents