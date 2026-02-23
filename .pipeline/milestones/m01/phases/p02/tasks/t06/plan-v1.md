Good — no existing barrel file in `models/`. The barrel file is one of the deliverables for t06. Now I have everything needed to write the implementation plan.

# Task t06: Comment and Label Models — Implementation Plan

## 0. Task Scope Source

The scope for this task is defined in `.pipeline/milestones/m01/phases/p02/tasks/t06/spec.md`:

> Implement the Mongoose Comment and Label models, and create a barrel file that re-exports all models from a single entry point.

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/models/comment.model.ts` | **Create** | Mongoose Comment schema/model with body, task reference (indexed), author reference, and timestamps |
| 2 | `packages/server/src/models/label.model.ts` | **Create** | Mongoose Label schema/model with name, color, project reference (indexed), and timestamps |
| 3 | `packages/server/src/models/index.ts` | **Create** | Barrel file re-exporting all 6 models and password utilities from a single entry point |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically the server package scaffold and Mongoose configuration
- **t01 must be complete** — Mongoose is installed as a dependency of `@taskboard/server`
- **t02 must be complete** — `UserModel` and password utilities exist (for Comment.author reference and barrel re-export)
- **t03 must be complete** — `ProjectModel` exists (for Label.project reference and barrel re-export)
- **t04 must be complete** — `BoardModel` exists (for barrel re-export)
- **t05 must be complete** — `TaskModel` exists (for Comment.task reference and barrel re-export)
- A running MongoDB instance is NOT required for this task (model definition only; tests are in t08)

### Packages to Install
None — all dependencies (`mongoose`) are already installed from t01.

### Existing Code Used
- `mongoose` already installed in `packages/server` (from t01)
- Existing model files: `user.model.ts`, `project.model.ts`, `board.model.ts`, `task.model.ts` (for barrel re-exports)

### Design References
- The `Comment` interface in `@taskboard/shared` defines: `_id`, `body`, `task`, `author`, `createdAt`, `updatedAt`
- The `Label` interface in `@taskboard/shared` defines: `_id`, `name`, `color`, `project`, `createdAt` (note: no `updatedAt` in the shared type, but Mongoose `timestamps: true` adds both — the task spec explicitly acknowledges this)

## 3. Implementation Details

### `packages/server/src/models/comment.model.ts`

**Purpose**: Defines the Mongoose schema and model for the Comment entity. Comments are associated with Tasks and authored by Users. The `task` field is indexed for efficient fetching of all comments belonging to a task.

**Exports**:
- `CommentDocument` — TypeScript interface for typed access to Comment documents
- `CommentModel` — Mongoose model for the `comments` collection

**Implementation**:

```typescript
import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface CommentDocument extends Document {
  body: string;
  task: Types.ObjectId;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    body: {
      type: String,
      required: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CommentModel = mongoose.model<CommentDocument>(
  "Comment",
  commentSchema
);
```

**Key decisions**:
- **`CommentDocument` interface**: Extends Mongoose `Document`. Reference fields (`task`, `author`) are typed as `Types.ObjectId`, consistent with the `board.model.ts` and `task.model.ts` pattern for ObjectId ref fields
- **`index: true` on `task`**: The task spec explicitly requires this: "Index on `task` field (for fetching comments by task)". This is the primary query pattern — comments are fetched by task when viewing a task's detail panel
- **No index on `author`**: In a single-user MVP, all comments have the same author, so an index provides no benefit
- **`required: true` on `author`**: Every comment must have an author. The task spec lists `author` as `ObjectId, ref → 'User', required`
- **Timestamps enabled**: Mongoose auto-manages `createdAt` and `updatedAt` fields
- **Import style**: Uses `import mongoose, { Schema, ... }` (default + named), consistent with `user.model.ts`, `project.model.ts`, and `board.model.ts`

### `packages/server/src/models/label.model.ts`

**Purpose**: Defines the Mongoose schema and model for the Label entity. Labels are scoped to a Project and can be attached to Tasks. The `project` field is indexed for efficient fetching of all labels belonging to a project.

**Exports**:
- `LabelDocument` — TypeScript interface for typed access to Label documents
- `LabelModel` — Mongoose model for the `labels` collection

**Implementation**:

```typescript
import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface LabelDocument extends Document {
  name: string;
  color: string;
  project: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const labelSchema = new Schema<LabelDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LabelModel = mongoose.model<LabelDocument>("Label", labelSchema);
```

**Key decisions**:
- **`LabelDocument` interface**: Extends Mongoose `Document`. Includes both `createdAt` and `updatedAt` because Mongoose `timestamps: true` generates both fields, even though the shared `Label` interface only defines `createdAt`. The task spec explicitly acknowledges this: "Timestamps: enabled (note: shared type only has `createdAt` but Mongoose timestamps adds both)"
- **`index: true` on `project`**: The task spec explicitly requires this: "Index on `project` field (for fetching labels by project)". Labels are fetched by project when displaying the label picker in the task detail panel
- **`color` is `String, required`**: Stores hex color values (e.g., `"#ef4444"`). No format validation at the schema level — hex format enforcement is a route-level concern. The Master Plan specifies "Hex color, e.g., '#ef4444'"
- **No `unique` compound index on `[name, project]`**: While duplicate label names within a project are likely undesirable, the task spec does not require uniqueness enforcement. This can be added in a future iteration if needed
- **Import style**: Uses `import mongoose, { Schema, ... }` (default + named), consistent with the majority of existing models

### `packages/server/src/models/index.ts`

**Purpose**: Barrel file that provides a single import point for all models and password utilities. Downstream code (seed script, route handlers, test helpers) can import everything from `./models/index.js` instead of individual model files.

**Exports**: Re-exports from all 6 model files:
- From `user.model.ts`: `UserModel`, `UserDocument`, `hashPassword`, `verifyPassword`
- From `project.model.ts`: `ProjectModel`, `ProjectDocument`
- From `board.model.ts`: `BoardModel`, `BoardDocument`, `ColumnDocument`
- From `task.model.ts`: `TaskModel`, `TaskDocument`
- From `comment.model.ts`: `CommentModel`, `CommentDocument`
- From `label.model.ts`: `LabelModel`, `LabelDocument`

**Implementation**:

```typescript
export { UserModel, hashPassword, verifyPassword } from "./user.model.js";
export type { UserDocument } from "./user.model.js";
export { ProjectModel } from "./project.model.js";
export type { ProjectDocument } from "./project.model.js";
export { BoardModel } from "./board.model.js";
export type { BoardDocument, ColumnDocument } from "./board.model.js";
export { TaskModel } from "./task.model.js";
export type { TaskDocument } from "./task.model.js";
export { CommentModel } from "./comment.model.js";
export type { CommentDocument } from "./comment.model.js";
export { LabelModel } from "./label.model.js";
export type { LabelDocument } from "./label.model.js";
```

**Key decisions**:
- **Separate `export type` for interfaces**: Uses TypeScript's `export type` for Document interfaces since they are type-only exports. This is correct for `"verbatimModuleSyntax"` or `"isolatedModules"` settings and is best practice for type-only re-exports
- **Re-exports password utilities**: `hashPassword` and `verifyPassword` are included because the task spec explicitly requires it: "Re-export password utilities: `hashPassword`, `verifyPassword`"
- **`.js` extensions**: Consistent with the existing `packages/server/src/index.ts` which uses `.js` extensions for ES module imports
- **All Document interfaces re-exported**: Provides typed access for downstream consumers (test helpers, route handlers) that need to type variables or function parameters

## 4. Contracts

### `CommentModel`

**Schema fields**:

| Field | Type | Required | Unique | Index | Default |
|-------|------|----------|--------|-------|---------|
| `body` | String | Yes | No | No | — |
| `task` | ObjectId (ref → Task) | Yes | No | Yes | — |
| `author` | ObjectId (ref → User) | Yes | No | No | — |
| `createdAt` | Date | Auto | No | No | Auto |
| `updatedAt` | Date | Auto | No | No | Auto |

**Usage example**:
```typescript
import { CommentModel } from "./models/index.js";

// Create a comment
const comment = await CommentModel.create({
  body: "This looks good, moving to review.",
  task: taskId,
  author: userId,
});
// comment.body === "This looks good, moving to review."
// comment.task === taskId
// comment.author === userId
// comment.createdAt is set automatically

// Fetch comments for a task (uses index on task)
const comments = await CommentModel.find({ task: taskId })
  .sort({ createdAt: 1 })
  .populate("author");
```

### `LabelModel`

**Schema fields**:

| Field | Type | Required | Unique | Index | Default |
|-------|------|----------|--------|-------|---------|
| `name` | String | Yes | No | No | — |
| `color` | String | Yes | No | No | — |
| `project` | ObjectId (ref → Project) | Yes | No | Yes | — |
| `createdAt` | Date | Auto | No | No | Auto |
| `updatedAt` | Date | Auto | No | No | Auto |

**Usage example**:
```typescript
import { LabelModel } from "./models/index.js";

// Create a label
const label = await LabelModel.create({
  name: "Bug",
  color: "#ef4444",
  project: projectId,
});
// label.name === "Bug"
// label.color === "#ef4444"
// label.project === projectId
// label.createdAt is set automatically

// Fetch labels for a project (uses index on project)
const labels = await LabelModel.find({ project: projectId });
```

### Barrel file `models/index.ts`

**Import pattern for downstream consumers**:
```typescript
// Import specific models and utilities
import { UserModel, hashPassword, CommentModel, LabelModel } from "./models/index.js";

// Import types
import type { CommentDocument, LabelDocument } from "./models/index.js";
```

## 5. Test Plan

No dedicated test file is required for this task. Comprehensive model tests are defined in t08. The t08 test cases should cover all verification criteria from the task spec:

**Comment model tests**:
1. Create a comment with valid fields (body, task, author) — succeeds
2. Create a comment without `body` — rejected (required field validation)
3. Create a comment without `task` — rejected (required field validation)
4. `task` field is indexed (verify via schema path options)

**Label model tests**:
5. Create a label with valid fields (name, color, project) — succeeds
6. Create a label without `name` — rejected (required field validation)
7. Create a label without `color` — rejected (required field validation)
8. Create a label without `project` — rejected (required field validation)
9. `project` field is indexed (verify via schema path options)

**Barrel file tests**:
10. All 6 models can be imported from `models/index.js`
11. `hashPassword` and `verifyPassword` can be imported from `models/index.js`

**Verification approach for this task**: Confirm all modules compile, the barrel file re-exports everything correctly, and schema validation works. Full automated coverage comes in t08.

## 6. Implementation Order

1. **Create `packages/server/src/models/comment.model.ts`** — Implement the Comment schema and model as specified above
2. **Create `packages/server/src/models/label.model.ts`** — Implement the Label schema and model as specified above
3. **Create `packages/server/src/models/index.ts`** — Implement the barrel file re-exporting all models and password utilities
4. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm all modules compile without errors
5. **Run existing tests** — Run `npm run test -w @taskboard/server` to confirm no regressions

Note: No packages need to be installed (Mongoose is already present from t01). The barrel file does NOT need to be re-exported from `packages/server/src/index.ts` — models are internal to the server package. The public API of `@taskboard/server` (exposed via `src/index.ts`) only exports `buildApp`, `config`, `connectDb`, and `disconnectDb`.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 2. Verify Comment model can be imported
cd packages/server && npx tsx -e "
import { CommentModel } from './src/models/comment.model.js';
console.log('CommentModel:', typeof CommentModel);
console.log('Collection name:', CommentModel.collection.collectionName);
console.log('Schema paths:', Object.keys(CommentModel.schema.paths).join(', '));
console.log('Comment import ok');
"

# 3. Verify Label model can be imported
cd packages/server && npx tsx -e "
import { LabelModel } from './src/models/label.model.js';
console.log('LabelModel:', typeof LabelModel);
console.log('Collection name:', LabelModel.collection.collectionName);
console.log('Schema paths:', Object.keys(LabelModel.schema.paths).join(', '));
console.log('Label import ok');
"

# 4. Verify barrel file re-exports everything
cd packages/server && npx tsx -e "
import {
  UserModel, hashPassword, verifyPassword,
  ProjectModel,
  BoardModel,
  TaskModel,
  CommentModel,
  LabelModel
} from './src/models/index.js';
console.log('UserModel:', typeof UserModel);
console.log('hashPassword:', typeof hashPassword);
console.log('verifyPassword:', typeof verifyPassword);
console.log('ProjectModel:', typeof ProjectModel);
console.log('BoardModel:', typeof BoardModel);
console.log('TaskModel:', typeof TaskModel);
console.log('CommentModel:', typeof CommentModel);
console.log('LabelModel:', typeof LabelModel);
console.log('All barrel exports ok');
"

# 5. Verify indexes are defined
cd packages/server && npx tsx -e "
import { CommentModel, LabelModel } from './src/models/index.js';
const taskPath = CommentModel.schema.path('task');
const projectPath = LabelModel.schema.path('project');
console.log('Comment.task indexed:', taskPath.options.index === true);
console.log('Label.project indexed:', projectPath.options.index === true);
"

# 6. Verify schema validation rules
cd packages/server && npx tsx -e "
import mongoose from 'mongoose';
import { CommentModel, LabelModel } from './src/models/index.js';

// Comment: missing body
try {
  await new CommentModel({ task: new mongoose.Types.ObjectId(), author: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing body');
} catch (e) { console.log('PASS: missing body rejected'); }

// Comment: missing task
try {
  await new CommentModel({ body: 'test', author: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing task');
} catch (e) { console.log('PASS: missing task rejected'); }

// Comment: valid
const comment = new CommentModel({ body: 'test', task: new mongoose.Types.ObjectId(), author: new mongoose.Types.ObjectId() });
await comment.validate();
console.log('PASS: valid comment accepted');

// Label: missing name
try {
  await new LabelModel({ color: '#ef4444', project: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing name');
} catch (e) { console.log('PASS: missing name rejected'); }

// Label: missing color
try {
  await new LabelModel({ name: 'Bug', project: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing color');
} catch (e) { console.log('PASS: missing color rejected'); }

// Label: missing project
try {
  await new LabelModel({ name: 'Bug', color: '#ef4444' }).validate();
  console.log('FAIL: should have rejected missing project');
} catch (e) { console.log('PASS: missing project rejected'); }

// Label: valid
const label = new LabelModel({ name: 'Bug', color: '#ef4444', project: new mongoose.Types.ObjectId() });
await label.validate();
console.log('PASS: valid label accepted');
"

# 7. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```