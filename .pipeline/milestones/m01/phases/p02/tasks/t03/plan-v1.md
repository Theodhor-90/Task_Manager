Now I have a thorough understanding of the codebase, the patterns established by t01 and t02, and the data model from the MASTER_PLAN. The t03 task should be the **Project Model** based on the milestone spec's Phase 2 deliverable list (db.ts → user.model → project.model → board.model → task.model → comment.model → label.model → seed → tests).

However, the user's prompt says to read `.pipeline/milestones/m01/phases/p02/tasks/t03/spec.md` — but that file doesn't exist (the t03 directory is empty). Since the state.json shows t03 is in "planning" status with 0 iterations, and the task spec hasn't been created yet, I need to derive the scope from the milestone specification, following the pattern established by t01 and t02 plans.

Let me now produce the implementation plan:

# Task t03: Project Model — Implementation Plan

## 0. Task Scope Source

There is no `spec.md` file in the t03 task directory. The scope for this task is derived from the **Milestone 1 spec** (`.pipeline/milestones/m01/spec-v1.md`), Phase 2, Deliverable #2:

> `project.model.ts` — name (required, trimmed), description (optional), owner (ObjectId ref → User), timestamps

And from the **Master Plan** Section 4.2:

> **Project**: _id (ObjectId, auto), name (string, required), description (string, optional), owner (ObjectId, Ref → User), createdAt (Date, auto), updatedAt (Date, auto)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/models/project.model.ts` | **Create** | Mongoose Project schema/model with name validation, owner reference to User, and timestamps |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically `packages/server/src/config.ts` and the server package scaffold
- **t01 must be complete** — Mongoose is installed as a dependency of `@taskboard/server`
- **t02 must be complete** — `UserModel` exists (the `owner` field references User documents; needed for downstream populate usage though not imported at the schema level)
- A running MongoDB instance is NOT required for this task (model definition only; tests are in t08)

### Packages to Install
None — all dependencies (`mongoose`) are already installed from t01.

### Existing Code Used
- `mongoose` already installed in `packages/server` (from t01)

### Design References
- The `Project` interface in `@taskboard/shared` (`packages/shared/dist/types/index.d.ts`) defines the API/transport-level entity shape (`_id`, `name`, `description`, `owner`, `createdAt`, `updatedAt`). The `ProjectDocument` interface in this task mirrors those fields at the Mongoose document level but does **not** import from `@taskboard/shared`. The shared type is a design reference only — the Mongoose model is self-contained and extends `Document` independently.

## 3. Implementation Details

### `packages/server/src/models/project.model.ts`

**Purpose**: Defines the Mongoose schema and model for the Project entity. Projects are the top-level organizational unit in TaskBoard. Each project has an owner (User), and when a project is created, a Board is automatically created with it (handled by the Board model or route logic, not within this model). Projects are referenced by Board, Task, and Label models.

**Exports**:
- `ProjectDocument` — TypeScript interface for typed access to Project documents
- `ProjectModel` — Mongoose model for the `projects` collection

**Implementation**:

```typescript
import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ProjectDocument extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = mongoose.model<ProjectDocument>(
  "Project",
  projectSchema
);
```

**Key decisions**:
- **`ProjectDocument` interface**: Extends Mongoose `Document` to provide typed access to fields. The `owner` field is typed as `Types.ObjectId` since at the schema level it stores a reference ID. When populated via `.populate("owner")`, callers will need to cast or use Mongoose's populated type utilities — this is consistent with standard Mongoose typing patterns
- **`description` defaults to `""`**: The Master Plan marks description as optional. Using `default: ""` means the field is always present on the document (avoiding `undefined` checks downstream) while still being optional at creation time. No `required` constraint is set
- **`trim: true` on `name`**: Prevents leading/trailing whitespace in project names, consistent with the milestone spec's explicit requirement (`name (required, trimmed)`)
- **`ref: "User"` on `owner`**: Establishes the Mongoose reference to enable `.populate("owner")` in queries. The string `"User"` must match the model name registered by `UserModel` in `user.model.ts`
- **`required: true` on `owner`**: Every project must have an owner. In the MVP (single-user), this is always the seed admin user
- **No index on `owner`**: In a single-user MVP, all projects belong to one user, so an index on `owner` provides no query benefit. If multi-user support is added later, an index can be added then
- **Timestamps enabled**: Mongoose auto-manages `createdAt` and `updatedAt` fields
- **No business logic utilities**: Unlike the User model which needed `hashPassword`/`verifyPassword`, the Project model is a pure data schema with no domain-specific utility functions

## 4. Contracts

### `ProjectModel`

**Schema fields**:

| Field | Type | Required | Unique | Transforms | Default |
|-------|------|----------|--------|------------|---------|
| `name` | String | Yes | No | trim | — |
| `description` | String | No | No | — | `""` |
| `owner` | ObjectId (ref → User) | Yes | No | — | — |
| `createdAt` | Date | Auto | No | — | Auto |
| `updatedAt` | Date | Auto | No | — | Auto |

**Usage example** (for reference by downstream tasks):
```typescript
import { ProjectModel } from "./models/project.model.js";

// Create a project
const project = await ProjectModel.create({
  name: "My Project",
  description: "A sample project",
  owner: userId, // ObjectId from UserModel
});
// project.name === "My Project"
// project.description === "A sample project"
// project.owner === userId
// project.createdAt is set automatically

// Create with minimal fields (description defaults to "")
const minimal = await ProjectModel.create({
  name: "Minimal Project",
  owner: userId,
});
// minimal.description === ""

// Query with populated owner
const populated = await ProjectModel.findById(projectId).populate("owner");
// populated.owner.name === "Admin"
```

### `ProjectDocument`

TypeScript interface with the following shape:
```typescript
interface ProjectDocument extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

## 5. Test Plan

No dedicated test file is required for this task. Comprehensive model tests are defined in t08 (`packages/server/test/models/project.model.test.ts`). The t08 test cases for the Project model should include:

1. Create a project with valid fields (name, description, owner) — succeeds
2. Create a project with only required fields (name, owner) — succeeds, description defaults to `""`
3. Create a project without `name` — rejected (required field validation)
4. Create a project without `owner` — rejected (required field validation)
5. Project name is trimmed (leading/trailing whitespace removed)
6. Owner field references a valid User document (populate works)

**Verification approach for this task**: Confirm the module compiles, the model can be imported, and schema validation works. Full automated coverage comes in t08.

## 6. Implementation Order

1. **Create `packages/server/src/models/project.model.ts`** — Implement the schema and model as specified above
2. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm the module compiles without errors
3. **Run existing tests** — Run `npm run test -w @taskboard/server` to confirm no regressions

Note: No packages need to be installed (Mongoose is already present from t01). The model file does NOT need to be re-exported from `packages/server/src/index.ts` — models are internal to the server package and imported directly by routes, middleware, and other models within the same package. The public API of `@taskboard/server` (exposed via `index.ts`) only exports `buildApp`, `config`, `connectDb`, and `disconnectDb`.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 2. Verify the model can be imported (quick smoke test)
cd packages/server && npx tsx -e "
import { ProjectModel } from './src/models/project.model.js';
console.log('ProjectModel:', typeof ProjectModel);
console.log('Collection name:', ProjectModel.collection.collectionName);
console.log('Schema paths:', Object.keys(ProjectModel.schema.paths).join(', '));
console.log('All imports ok');
"

# 3. Verify schema validation rules (requires running MongoDB)
cd packages/server && npx tsx -e "
import mongoose from 'mongoose';
import { ProjectModel } from './src/models/project.model.js';
import { config } from './src/config.js';
await mongoose.connect(config.mongodbUri);

// Test required field validation (no name)
try {
  await new ProjectModel({ owner: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing name');
} catch (e) {
  console.log('PASS: missing name rejected');
}

// Test required field validation (no owner)
try {
  await new ProjectModel({ name: 'Test' }).validate();
  console.log('FAIL: should have rejected missing owner');
} catch (e) {
  console.log('PASS: missing owner rejected');
}

// Test valid document
const doc = new ProjectModel({ name: '  Trimmed  ', owner: new mongoose.Types.ObjectId() });
await doc.validate();
console.log('PASS: valid document accepted');
console.log('Name trimmed:', JSON.stringify(doc.name));
console.log('Description default:', JSON.stringify(doc.description));

await mongoose.disconnect();
"

# 4. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```