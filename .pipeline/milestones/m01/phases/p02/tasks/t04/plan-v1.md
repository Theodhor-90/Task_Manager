Now I have complete context. The server's `package.json` lists `@taskboard/shared` as a dependency, so importing `DEFAULT_COLUMNS` from `@taskboard/shared` is the correct approach. Let me also verify the shared types for `Board` and `Column` once more to ensure my interface aligns.

Now I have everything needed. Let me produce the implementation plan.

# Task t04: Board Model with Embedded Columns — Implementation Plan

## 0. Task Scope Source

The scope for this task is defined in `.pipeline/milestones/m01/phases/p02/tasks/t04/spec.md` and derived from the **Milestone 1 spec** (`.pipeline/milestones/m01/spec-v1.md`), Phase 2, Deliverable #2:

> `board.model.ts` — project (ObjectId ref → Project, unique index for 1:1), columns as embedded subdocument array (each with `_id`, `name`, `position`), timestamps

And from the **Master Plan** Sections 4.3 and 4.4:

> **Board**: _id (ObjectId, auto), project (ObjectId, Ref → Project, unique 1:1), columns (Column[], embedded subdocuments, ordered array), createdAt (Date, auto), updatedAt (Date, auto)
>
> **Column** (embedded in Board): _id (ObjectId, auto subdoc id), name (string), position (number, sort order 0-based)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/models/board.model.ts` | **Create** | Mongoose Board schema/model with 1:1 project reference (unique index), embedded Column subdocuments, and timestamps |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically the `@taskboard/shared` package (provides `DEFAULT_COLUMNS` constant) and the server package scaffold
- **t01 must be complete** — Mongoose is installed as a dependency of `@taskboard/server`
- **t03 must be complete** — `ProjectModel` exists (the `project` field references Project documents)
- A running MongoDB instance is NOT required for this task (model definition only; tests are in t08)

### Packages to Install
None — all dependencies (`mongoose`, `@taskboard/shared`) are already installed.

### Existing Code Used
- `mongoose` already installed in `packages/server` (from t01)
- `DEFAULT_COLUMNS` from `@taskboard/shared` (`packages/shared/src/constants/index.ts`) — provides the default column names `["To Do", "In Progress", "In Review", "Done"]`

### Design References
- The `Board` interface in `@taskboard/shared` (`packages/shared/src/types/index.ts`) defines the API/transport-level entity shape (`_id`, `project`, `columns`, `createdAt`, `updatedAt`). The `Column` interface defines the subdocument shape (`_id`, `name`, `position`). The `BoardDocument` and `ColumnDocument` interfaces in this task mirror those fields at the Mongoose document level but do **not** import from `@taskboard/shared`. The shared types are design references only — the Mongoose model is self-contained.

## 3. Implementation Details

### `packages/server/src/models/board.model.ts`

**Purpose**: Defines the Mongoose schema and model for the Board entity with embedded Column subdocuments. Each Board has a 1:1 relationship with a Project (enforced by a unique index on the `project` field). Columns are embedded subdocuments within the Board, not a separate collection, allowing atomic updates to column order and properties. The `DEFAULT_COLUMNS` constant from `@taskboard/shared` is used by callers (seed script, project creation route) when creating boards — it is not embedded in the schema as a default value.

**Exports**:
- `ColumnDocument` — TypeScript interface for typed access to Column subdocuments
- `BoardDocument` — TypeScript interface for typed access to Board documents
- `BoardModel` — Mongoose model for the `boards` collection

**Implementation**:

```typescript
import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ColumnDocument {
  _id: Types.ObjectId;
  name: string;
  position: number;
}

export interface BoardDocument extends Document {
  project: string;
  columns: Types.DocumentArray<ColumnDocument>;
  createdAt: Date;
  updatedAt: Date;
}

const columnSchema = new Schema<ColumnDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
  },
  {
    _id: true,
  }
);

const boardSchema = new Schema<BoardDocument>(
  {
    project: {
      type: String,
      ref: "Project",
      required: true,
      unique: true,
    },
    columns: [columnSchema],
  },
  {
    timestamps: true,
  }
);

export const BoardModel = mongoose.model<BoardDocument>("Board", boardSchema);
```

**Key decisions**:
- **`project` typed as `string`**: Follows the established codebase convention in `project.model.ts` where `owner` is typed as `string` (not `Types.ObjectId`) for ref fields. The `type: String` in the schema with `ref: "Project"` enables `.populate("project")` in queries
- **`unique: true` on `project`**: Enforces the 1:1 relationship between Board and Project at the database level. Creating a second board for the same project will be rejected by MongoDB's unique index
- **Separate `columnSchema`**: Defined as its own schema (not inline) to ensure subdocuments get auto-generated `_id` fields and proper Mongoose subdocument behavior (push, pull, id lookup). The `_id: true` option is explicit for clarity, though it is the default for subdocument schemas
- **`columns` as `Types.DocumentArray<ColumnDocument>`**: Provides typed access to Mongoose subdocument array methods (`push`, `pull`, `id()`) while maintaining the column document shape
- **No `DEFAULT_COLUMNS` in the schema default**: The task spec says to "use `DEFAULT_COLUMNS` from `packages/shared/src/constants/index.ts`" — this constant is imported and used by callers (seed script in t07, project creation routes in Milestone 2) when creating boards, not baked into the schema. This keeps the model generic and allows boards to be created with custom columns if needed
- **`position` is `required`**: Each column must have an explicit position for sort ordering. Callers must set positions when creating or reordering columns
- **Timestamps enabled**: Mongoose auto-manages `createdAt` and `updatedAt` fields on the Board document (not on individual column subdocuments)

## 4. Contracts

### `BoardModel`

**Board schema fields**:

| Field | Type | Required | Unique | Transforms | Default |
|-------|------|----------|--------|------------|---------|
| `project` | String (ref → Project) | Yes | Yes | — | — |
| `columns` | ColumnDocument[] | No | No | — | `[]` |
| `createdAt` | Date | Auto | No | — | Auto |
| `updatedAt` | Date | Auto | No | — | Auto |

**Column subdocument fields**:

| Field | Type | Required | Unique | Transforms | Default |
|-------|------|----------|--------|------------|---------|
| `_id` | ObjectId | Auto | No | — | Auto |
| `name` | String | Yes | No | — | — |
| `position` | Number | Yes | No | — | — |

**Usage example** (for reference by downstream tasks):
```typescript
import { BoardModel } from "./models/board.model.js";
import { DEFAULT_COLUMNS } from "@taskboard/shared";

// Create a board with default columns
const board = await BoardModel.create({
  project: projectId,
  columns: DEFAULT_COLUMNS.map((name, index) => ({
    name,
    position: index,
  })),
});
// board.project === projectId
// board.columns.length === 4
// board.columns[0].name === "To Do"
// board.columns[0].position === 0
// board.columns[0]._id is auto-generated

// Access a specific column by _id
const column = board.columns.id(columnId);
// column.name === "In Progress"

// Add a new column
board.columns.push({ name: "QA", position: 4 });
await board.save();

// Remove a column
board.columns.pull({ _id: columnId });
await board.save();

// Reorder columns (update positions)
board.columns.forEach((col, i) => { col.position = i; });
await board.save();
```

### `ColumnDocument`

TypeScript interface with the following shape:
```typescript
interface ColumnDocument {
  _id: Types.ObjectId;
  name: string;
  position: number;
}
```

### `BoardDocument`

TypeScript interface with the following shape:
```typescript
interface BoardDocument extends Document {
  project: string;
  columns: Types.DocumentArray<ColumnDocument>;
  createdAt: Date;
  updatedAt: Date;
}
```

## 5. Test Plan

No dedicated test file is required for this task. Comprehensive model tests are defined in t08 (`packages/server/test/models/board.model.test.ts`). The t08 test cases for the Board model should include:

1. Create a board with a project reference and embedded columns — succeeds
2. Create a board without `project` — rejected (required field validation)
3. Create a second board for the same project — rejected (unique constraint on `project`)
4. Columns have auto-generated `_id`, `name`, and `position` fields
5. Columns can be added to the embedded array (push)
6. Columns can be removed from the embedded array (pull)
7. Column positions can be updated (reorder)
8. Column without `name` is rejected (required field validation)
9. Column without `position` is rejected (required field validation)
10. `DEFAULT_COLUMNS` from `@taskboard/shared` can be used to seed board columns

**Verification approach for this task**: Confirm the module compiles, the model can be imported, and the schema structure is correct. Full automated coverage comes in t08.

## 6. Implementation Order

1. **Create `packages/server/src/models/board.model.ts`** — Implement the Column subdocument schema, Board schema, and Board model as specified above
2. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm the module compiles without errors
3. **Run existing tests** — Run `npm run test -w @taskboard/server` to confirm no regressions

Note: No packages need to be installed (Mongoose and `@taskboard/shared` are already present). The model file does NOT need to be re-exported from `packages/server/src/index.ts` — models are internal to the server package and imported directly by routes, middleware, seed script, and other models within the same package. The public API of `@taskboard/server` (exposed via `index.ts`) only exports `buildApp`, `config`, `connectDb`, and `disconnectDb`.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 2. Verify the model can be imported (quick smoke test)
cd packages/server && npx tsx -e "
import { BoardModel } from './src/models/board.model.js';
console.log('BoardModel:', typeof BoardModel);
console.log('Collection name:', BoardModel.collection.collectionName);
console.log('Schema paths:', Object.keys(BoardModel.schema.paths).join(', '));
console.log('All imports ok');
"

# 3. Verify DEFAULT_COLUMNS integration
cd packages/server && npx tsx -e "
import { BoardModel } from './src/models/board.model.js';
import { DEFAULT_COLUMNS } from '@taskboard/shared';
const columns = DEFAULT_COLUMNS.map((name, index) => ({ name, position: index }));
console.log('DEFAULT_COLUMNS mapped:', JSON.stringify(columns));
console.log('Integration ok');
"

# 4. Verify schema validation rules (requires running MongoDB)
cd packages/server && npx tsx -e "
import mongoose from 'mongoose';
import { BoardModel } from './src/models/board.model.js';
import { config } from './src/config.js';
import { DEFAULT_COLUMNS } from '@taskboard/shared';
await mongoose.connect(config.mongodbUri);

// Test required field validation (no project)
try {
  await new BoardModel({ columns: [] }).validate();
  console.log('FAIL: should have rejected missing project');
} catch (e) {
  console.log('PASS: missing project rejected');
}

// Test valid document with columns
const doc = new BoardModel({
  project: new mongoose.Types.ObjectId().toString(),
  columns: DEFAULT_COLUMNS.map((name, i) => ({ name, position: i })),
});
await doc.validate();
console.log('PASS: valid document accepted');
console.log('Columns count:', doc.columns.length);
console.log('First column _id:', doc.columns[0]._id);
console.log('First column name:', doc.columns[0].name);
console.log('First column position:', doc.columns[0].position);

await mongoose.disconnect();
"

# 5. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```