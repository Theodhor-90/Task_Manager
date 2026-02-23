Good. Now I see the two patterns in the codebase:
- `project.model.ts`: ref field typed as `string` with `type: String` (owner)
- `board.model.ts`: ref field typed as `Types.ObjectId` with `type: Schema.Types.ObjectId` (project)

The Task model has multiple ref fields (`board`, `project`, `labels`). The task spec says these should be indexed. I also need to check the shared `PRIORITIES` constant format carefully. Now I have everything needed to write the plan.

# Task t05: Task Model — Implementation Plan

## 0. Task Scope Source

The scope for this task is defined in `.pipeline/milestones/m01/phases/p02/tasks/t05/spec.md`:

> Implement the Mongoose Task model with all fields including priority enum, position ordering, and indexes on frequently queried fields.

And from the **Master Plan** Section 4.5:

> **Task**: _id (ObjectId, auto), title (string, required), description (string, optional markdown), status (string, matches column name), priority (string, enum low/medium/high/urgent), position (number, sort order within column), dueDate (Date, optional), labels (ObjectId[], Ref → Label[]), board (ObjectId, Ref → Board), project (ObjectId, Ref → Project, denormalized), createdAt (Date, auto), updatedAt (Date, auto)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/models/task.model.ts` | **Create** | Mongoose Task schema/model with priority enum, position ordering, label references, board/project references, and indexes on `board` and `project` |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically the `@taskboard/shared` package (provides `PRIORITIES` constant) and the server package scaffold
- **t01 must be complete** — Mongoose is installed as a dependency of `@taskboard/server`
- **t03 must be complete** — `ProjectModel` exists (the `project` field references Project documents)
- **t04 must be complete** — `BoardModel` exists (the `board` field references Board documents)
- A running MongoDB instance is NOT required for this task (model definition only; tests are in t08)

### Packages to Install
None — all dependencies (`mongoose`, `@taskboard/shared`) are already installed.

### Existing Code Used
- `mongoose` already installed in `packages/server` (from t01)
- `PRIORITIES` from `@taskboard/shared` (`packages/shared/src/constants/index.ts`) — provides the priority enum values `["low", "medium", "high", "urgent"]` as a `readonly Priority[]`

### Design References
- The `Task` interface in `@taskboard/shared` (`packages/shared/src/types/index.ts`) defines the API/transport-level entity shape (`_id`, `title`, `description`, `status`, `priority`, `position`, `dueDate`, `labels`, `board`, `project`, `createdAt`, `updatedAt`). The `Priority` type defines the enum as `"low" | "medium" | "high" | "urgent"`. The `TaskDocument` interface in this task mirrors those fields at the Mongoose document level but does **not** import from `@taskboard/shared`. The shared types are design references only — the Mongoose model is self-contained.

## 3. Implementation Details

### `packages/server/src/models/task.model.ts`

**Purpose**: Defines the Mongoose schema and model for the Task entity. Tasks are the core work items in TaskBoard. Each task belongs to a Board (and is denormalized with a Project reference for efficient querying). Tasks have a status that matches a column name on the board, a priority level, a position for ordering within a column, optional labels, and an optional due date. Tasks are referenced by the Comment model.

**Exports**:
- `TaskDocument` — TypeScript interface for typed access to Task documents
- `TaskModel` — Mongoose model for the `tasks` collection

**Implementation**:

```typescript
import mongoose, { Schema, type Document, type Types } from "mongoose";
import { PRIORITIES } from "@taskboard/shared";

export interface TaskDocument extends Document {
  title: string;
  description: string;
  status: string;
  priority: string;
  position: number;
  dueDate: Date | null;
  labels: Types.ObjectId[];
  board: Types.ObjectId;
  project: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "medium",
    },
    position: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    labels: [
      {
        type: Schema.Types.ObjectId,
        ref: "Label",
      },
    ],
    board: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
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

export const TaskModel = mongoose.model<TaskDocument>("Task", taskSchema);
```

**Key decisions**:
- **`TaskDocument` interface**: Extends Mongoose `Document` to provide typed access to fields. Reference fields (`board`, `project`, `labels`) are typed as `Types.ObjectId` / `Types.ObjectId[]`, consistent with the Board model's pattern for ObjectId ref fields (using `Schema.Types.ObjectId` in the schema definition)
- **`PRIORITIES` from `@taskboard/shared`**: Used as the `enum` value for the `priority` field. This ensures the model and the shared package stay in sync — if a priority value is added or removed in the shared constants, the schema enum updates automatically. The `PRIORITIES` constant is `["low", "medium", "high", "urgent"]`
- **`priority` defaults to `"medium"`**: The task spec explicitly requires this: "Priority defaults to `'medium'` when not provided"
- **`position` defaults to `0`**: The task spec explicitly requires this: "Position defaults to 0 when not provided". Tasks are sorted by `position` within a column (status group)
- **`status` is a free-form `String`, not an enum**: Status values must match column names on the board (e.g., "To Do", "In Progress"), which are user-configurable. Enforcing valid status values is a route-level concern (check against board.columns), not a schema-level constraint
- **`description` defaults to `""`**: Consistent with the Project model's pattern for optional string fields. The Master Plan marks description as optional; using `default: ""` means the field is always present on the document
- **`dueDate` defaults to `null`**: Optional field. Using `null` as the default (rather than `undefined`) ensures the field is present in the document and can be explicitly cleared
- **`labels` as `Types.ObjectId[]`**: Array of references to Label documents. Defined as a schema-level array of ObjectId with `ref: "Label"` to enable `.populate("labels")` in queries. Empty array by default (Mongoose default for array fields)
- **`index: true` on `board` and `project`**: The task spec explicitly requires indexes on these fields: "Indexes: `board` (for fetching tasks by board), `project` (for fetching tasks by project)". These are the primary query patterns — tasks are fetched by board (for the kanban view) and by project (for cascade deletes and project-level queries)
- **No compound index on `[board, status, position]`**: While tasks are queried by board + status and sorted by position, a compound index is a premature optimization for an MVP with limited data volume. Single-field indexes on `board` and `project` are sufficient
- **Timestamps enabled**: Mongoose auto-manages `createdAt` and `updatedAt` fields
- **No business logic utilities**: Unlike the User model which needed hash/verify functions, the Task model is a pure data schema. Task-specific logic (move, reorder, status validation) belongs in route handlers

## 4. Contracts

### `TaskModel`

**Schema fields**:

| Field | Type | Required | Unique | Index | Default | Notes |
|-------|------|----------|--------|-------|---------|-------|
| `title` | String | Yes | No | No | — | — |
| `description` | String | No | No | No | `""` | Markdown-formatted content |
| `status` | String | Yes | No | No | — | Matches a column name on the board |
| `priority` | String (enum) | No | No | No | `"medium"` | One of: `"low"`, `"medium"`, `"high"`, `"urgent"` |
| `position` | Number | No | No | No | `0` | Sort order within column (0-based) |
| `dueDate` | Date | No | No | No | `null` | Optional deadline |
| `labels` | ObjectId[] (ref → Label) | No | No | No | `[]` | Array of Label references |
| `board` | ObjectId (ref → Board) | Yes | No | Yes | — | Board this task belongs to |
| `project` | ObjectId (ref → Project) | Yes | No | Yes | — | Denormalized project reference |
| `createdAt` | Date | Auto | No | No | Auto | — |
| `updatedAt` | Date | Auto | No | No | Auto | — |

**Usage example** (for reference by downstream tasks):
```typescript
import { TaskModel } from "./models/task.model.js";

// Create a task with all fields
const task = await TaskModel.create({
  title: "Implement login page",
  description: "## Requirements\n- Email + password form\n- Error handling",
  status: "To Do",
  priority: "high",
  position: 0,
  dueDate: new Date("2025-06-01"),
  labels: [labelId1, labelId2],
  board: boardId,
  project: projectId,
});

// Create with minimal fields (defaults applied)
const minimal = await TaskModel.create({
  title: "Quick fix",
  status: "In Progress",
  board: boardId,
  project: projectId,
});
// minimal.description === ""
// minimal.priority === "medium"
// minimal.position === 0
// minimal.dueDate === null
// minimal.labels === []

// Query tasks by board (uses index)
const boardTasks = await TaskModel.find({ board: boardId })
  .sort({ position: 1 })
  .populate("labels");

// Query tasks by project (uses index)
const projectTasks = await TaskModel.find({ project: projectId });

// Query tasks by board and status (kanban column)
const columnTasks = await TaskModel.find({
  board: boardId,
  status: "To Do",
}).sort({ position: 1 });
```

### `TaskDocument`

TypeScript interface with the following shape:
```typescript
interface TaskDocument extends Document {
  title: string;
  description: string;
  status: string;
  priority: string;
  position: number;
  dueDate: Date | null;
  labels: Types.ObjectId[];
  board: Types.ObjectId;
  project: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

## 5. Test Plan

No dedicated test file is required for this task. Comprehensive model tests are defined in t08 (`packages/server/test/models/task.model.test.ts`). The t08 test cases for the Task model should cover all verification criteria from the task spec:

1. Create a task with all valid fields — succeeds
2. Create a task with only required fields (title, status, board, project) — succeeds, defaults applied
3. Create a task without `title` — rejected (required field validation)
4. Create a task without `status` — rejected (required field validation)
5. Create a task without `board` — rejected (required field validation)
6. Create a task without `project` — rejected (required field validation)
7. Priority defaults to `"medium"` when not provided
8. Priority rejects values outside the enum (e.g., `"critical"`)
9. Position defaults to `0` when not provided
10. `board` and `project` fields are indexed (verify via `TaskModel.schema.indexes()` or `collection.indexInformation()`)
11. Labels array can reference Label documents (populate works)
12. `dueDate` accepts a valid Date and defaults to `null`

**Verification approach for this task**: Confirm the module compiles, the model can be imported, schema validation works, and indexes are defined. Full automated coverage comes in t08.

## 6. Implementation Order

1. **Create `packages/server/src/models/task.model.ts`** — Implement the schema and model as specified above
2. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm the module compiles without errors
3. **Run existing tests** — Run `npm run test -w @taskboard/server` to confirm no regressions

Note: No packages need to be installed (Mongoose and `@taskboard/shared` are already present). The model file does NOT need to be re-exported from `packages/server/src/index.ts` — models are internal to the server package and imported directly by routes, middleware, seed script, and other models within the same package. The public API of `@taskboard/server` (exposed via `index.ts`) only exports `buildApp`, `config`, `connectDb`, and `disconnectDb`.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 2. Verify the model can be imported (quick smoke test)
cd packages/server && npx tsx -e "
import { TaskModel } from './src/models/task.model.js';
console.log('TaskModel:', typeof TaskModel);
console.log('Collection name:', TaskModel.collection.collectionName);
console.log('Schema paths:', Object.keys(TaskModel.schema.paths).join(', '));
console.log('All imports ok');
"

# 3. Verify PRIORITIES integration and enum enforcement
cd packages/server && npx tsx -e "
import { TaskModel } from './src/models/task.model.js';
import { PRIORITIES } from '@taskboard/shared';
import mongoose from 'mongoose';

const priorityPath = TaskModel.schema.path('priority');
console.log('Priority enum values:', priorityPath.options.enum);
console.log('Matches PRIORITIES:', JSON.stringify(priorityPath.options.enum) === JSON.stringify([...PRIORITIES]));

// Test default values
const doc = new TaskModel({
  title: 'Test',
  status: 'To Do',
  board: new mongoose.Types.ObjectId(),
  project: new mongoose.Types.ObjectId(),
});
console.log('Priority default:', doc.priority);
console.log('Position default:', doc.position);
console.log('Description default:', JSON.stringify(doc.description));
console.log('DueDate default:', doc.dueDate);
console.log('Labels default:', JSON.stringify(doc.labels));
"

# 4. Verify indexes are defined
cd packages/server && npx tsx -e "
import { TaskModel } from './src/models/task.model.js';
const indexes = TaskModel.schema.indexes();
console.log('Schema-level indexes:', JSON.stringify(indexes));
// Note: field-level indexes (index: true) are also created but may not appear in schema.indexes()
const boardPath = TaskModel.schema.path('board');
const projectPath = TaskModel.schema.path('project');
console.log('Board indexed:', boardPath.options.index === true);
console.log('Project indexed:', projectPath.options.index === true);
"

# 5. Verify schema validation rules
cd packages/server && npx tsx -e "
import mongoose from 'mongoose';
import { TaskModel } from './src/models/task.model.js';

// Test required field validation (no title)
try {
  await new TaskModel({ status: 'To Do', board: new mongoose.Types.ObjectId(), project: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing title');
} catch (e) { console.log('PASS: missing title rejected'); }

// Test required field validation (no status)
try {
  await new TaskModel({ title: 'Test', board: new mongoose.Types.ObjectId(), project: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing status');
} catch (e) { console.log('PASS: missing status rejected'); }

// Test required field validation (no board)
try {
  await new TaskModel({ title: 'Test', status: 'To Do', project: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing board');
} catch (e) { console.log('PASS: missing board rejected'); }

// Test required field validation (no project)
try {
  await new TaskModel({ title: 'Test', status: 'To Do', board: new mongoose.Types.ObjectId() }).validate();
  console.log('FAIL: should have rejected missing project');
} catch (e) { console.log('PASS: missing project rejected'); }

// Test invalid priority
try {
  await new TaskModel({ title: 'Test', status: 'To Do', board: new mongoose.Types.ObjectId(), project: new mongoose.Types.ObjectId(), priority: 'critical' }).validate();
  console.log('FAIL: should have rejected invalid priority');
} catch (e) { console.log('PASS: invalid priority rejected'); }

// Test valid document
const doc = new TaskModel({ title: 'Test', status: 'To Do', board: new mongoose.Types.ObjectId(), project: new mongoose.Types.ObjectId() });
await doc.validate();
console.log('PASS: valid document accepted');
"

# 6. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```