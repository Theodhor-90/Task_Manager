The plan file can't be written to the `.pipeline` directory due to permissions. Here is the complete implementation plan:

---

# Implementation Plan — t02: Shared package scaffold

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/shared/package.json` | Create | Package manifest with name, build script, ESM entry/types exports |
| 2 | `packages/shared/tsconfig.json` | Create | TypeScript config extending `../../tsconfig.base.json` |
| 3 | `packages/shared/src/types/index.ts` | Create | All 7 entity interfaces + API contract types |
| 4 | `packages/shared/src/constants/index.ts` | Create | Priority enum values and default column names |
| 5 | `packages/shared/src/index.ts` | Create | Barrel export re-exporting everything from types and constants |

---

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed. Provides:
  - Root `package.json` with `"workspaces": ["packages/*"]` and `"type": "module"`
  - `tsconfig.base.json` with strict mode, `"module": "Node16"`, `"target": "ES2022"`, `"verbatimModuleSyntax": true`
  - TypeScript `^5.7.0` in root devDependencies

### External

- **Node.js** >= 18
- **npm** >= 9 (workspaces support)
- No runtime dependencies — this package exports only TypeScript types and constants

---

## 3. Implementation Details

### 3.1 `packages/shared/package.json`

```json
{
  "name": "@taskboard/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch"
  }
}
```

**Key decisions:**

- `"type": "module"` — matches root config, required for ES module output
- `exports` field — Node.js subpath exports for proper ESM resolution via workspaces; provides both `import` and `types` conditions
- `main` + `types` — fallback for tools that don't support the `exports` field
- No runtime dependencies — package contains only TypeScript types and compile-time constants
- `"private": true` — not published to npm, consumed only within the monorepo
- `build` uses `tsc` directly — the root `tsconfig.base.json` already configures `declaration: true` and `declarationMap: true`, so `tsc` will emit `.js`, `.d.ts`, and `.d.ts.map` files
- `dev` uses `tsc --watch` for incremental rebuilds during development

### 3.2 `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Key decisions:**

- Extends `../../tsconfig.base.json` — inherits `strict: true`, `module: "Node16"`, `target: "ES2022"`, `verbatimModuleSyntax: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`
- `outDir: "./dist"` — compiled output goes to `dist/`, which is gitignored
- `rootDir: "./src"` — ensures `dist/` mirrors the `src/` directory structure (no extra nested `src/` folder inside `dist/`)
- `include: ["src"]` — only compile source files

### 3.3 `packages/shared/src/types/index.ts`

This file defines all 7 entity interfaces from the master plan data model (Section 4) plus API contract types from Section 5.

#### Entity Interfaces

Each entity interface represents the document shape as stored/returned. Reference fields (`ObjectId` refs) are typed as `string` since they'll be serialized as strings in JSON API responses and consumed by both server (where Mongoose handles ObjectId) and client (where they're always strings).

```typescript
// --- Entity Interfaces ---

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  _id: string;
  project: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  _id: string;
  name: string;
  position: number;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: Priority;
  position: number;
  dueDate?: string;
  labels: string[];
  board: string;
  project: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  body: string;
  task: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  _id: string;
  name: string;
  color: string;
  project: string;
  createdAt: string;
}
```

**Design decisions:**

- **`_id` as `string`** — MongoDB ObjectIds serialize to strings in JSON. Both server and client consume them as strings. Mongoose typing on the server side will handle the ObjectId ↔ string conversion internally; these shared interfaces represent the API/transport shape.
- **Date fields as `string`** — JSON serializes dates as ISO 8601 strings. The server's Mongoose models will use `Date` internally, but the shared types represent the serialized API contract.
- **`description` is optional** (`?`) — master plan says "Optional" for both Project and Task descriptions.
- **`dueDate` is optional** — master plan says "Optional".
- **`priority` uses the `Priority` type** — references the `Priority` type union defined below, not a raw string, providing compile-time validation.
- **`labels` is `string[]`** — array of Label `_id` references, matching the master plan's `ObjectId[]`.
- **`Column` has no timestamps** — it's an embedded subdocument within Board; the master plan does not specify timestamps for Column.
- **`Label.createdAt` only** — the master plan specifies only `createdAt` for Label, no `updatedAt`.

#### Priority Type

```typescript
export type Priority = "low" | "medium" | "high" | "urgent";
```

Defined here alongside entity interfaces since `Task` references it directly.

#### API Contract Types

```typescript
// --- API Contracts ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
}
```

**Design decisions:**

- **`LoginRequest`** — mirrors master plan Section 5.1 request body: `{ email, password }`.
- **`LoginResponse`** — mirrors master plan Section 5.1 response: `{ data: { token, user: { id, email, name } } }`. Note: uses `id` (not `_id`) in the response per the master plan example.
- **`ApiSuccessResponse<T>`** — generic envelope `{ data: T }` per Section 3.2 design principles.
- **`ApiErrorResponse`** — error envelope `{ error: string }` per Section 3.2 design principles. Named `ApiErrorResponse` to avoid conflict with the built-in `Error` class (the spec calls it `ApiError` but that could be confused with an Error subclass).

### 3.4 `packages/shared/src/constants/index.ts`

```typescript
import type { Priority } from "../types/index.js";

export const PRIORITIES: readonly Priority[] = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const DEFAULT_COLUMNS: readonly string[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
] as const;
```

**Design decisions:**

- **`as const` + `readonly`** — arrays are immutable constants, not meant to be modified at runtime. `as const` ensures the narrowest type inference; `readonly` on the type prevents accidental mutation.
- **`PRIORITIES` typed as `readonly Priority[]`** — links the constant values to the `Priority` type union, ensuring they stay in sync.
- **`DEFAULT_COLUMNS` typed as `readonly string[]`** — column names are strings, not a dedicated type union, since users can create custom columns.
- **Import uses `.js` extension** — required by Node16 module resolution with `verbatimModuleSyntax: true`. TypeScript resolves `.js` imports to `.ts` source files during compilation.
- **UPPER_SNAKE_CASE** — follows the master plan convention (Section 8.2): "Constants: UPPER_SNAKE_CASE for true constants."

### 3.5 `packages/shared/src/index.ts`

```typescript
export type {
  User,
  Project,
  Board,
  Column,
  Task,
  Comment,
  Label,
  Priority,
  LoginRequest,
  LoginResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "./types/index.js";

export { PRIORITIES, DEFAULT_COLUMNS } from "./constants/index.js";
```

**Design decisions:**

- **Explicit re-exports** — avoids `export *` which can cause ambiguous name collisions and makes it unclear what the package's public API is.
- **`export type` for interfaces** — uses TypeScript's `export type` syntax required by `verbatimModuleSyntax: true`. Type-only exports are erased at runtime, keeping the compiled output minimal.
- **`.js` extensions** — same reason as constants: Node16 module resolution requirement.

---

## 4. Contracts

### Package Public API

Consumers import from `@taskboard/shared`:

```typescript
// Types
import type {
  User, Project, Board, Column, Task, Comment, Label,
  Priority, LoginRequest, LoginResponse,
  ApiSuccessResponse, ApiErrorResponse,
} from "@taskboard/shared";

// Runtime values
import { PRIORITIES, DEFAULT_COLUMNS } from "@taskboard/shared";
```

### Entity Interface Shapes (examples)

```typescript
// User
const user: User = {
  _id: "507f1f77bcf86cd799439011",
  email: "admin@taskboard.local",
  passwordHash: "$2b$10$...",
  name: "Admin",
  createdAt: "2026-02-23T00:00:00.000Z",
  updatedAt: "2026-02-23T00:00:00.000Z",
};

// Task
const task: Task = {
  _id: "507f1f77bcf86cd799439012",
  title: "Implement login page",
  description: "## Requirements\n- Email field\n- Password field",
  status: "In Progress",
  priority: "high",
  position: 0,
  dueDate: "2026-03-01T00:00:00.000Z",
  labels: ["507f1f77bcf86cd799439013"],
  board: "507f1f77bcf86cd799439014",
  project: "507f1f77bcf86cd799439015",
  createdAt: "2026-02-23T00:00:00.000Z",
  updatedAt: "2026-02-23T00:00:00.000Z",
};

// API success response
const response: ApiSuccessResponse<Project[]> = {
  data: [{
    _id: "507f1f77bcf86cd799439015",
    name: "TaskBoard MVP",
    owner: "507f1f77bcf86cd799439011",
    createdAt: "2026-02-23T00:00:00.000Z",
    updatedAt: "2026-02-23T00:00:00.000Z",
  }],
};

// API error response
const error: ApiErrorResponse = { error: "Project not found" };
```

### Constant Values

```typescript
PRIORITIES      // → ["low", "medium", "high", "urgent"]
DEFAULT_COLUMNS // → ["To Do", "In Progress", "In Review", "Done"]
```

---

## 5. Test Plan

This package contains only TypeScript interfaces (erased at compile time) and constant arrays. There is no runtime logic to unit-test. Verification is structural — the TypeScript compiler is the test.

| # | Check | Method | Expected Result |
|---|-------|--------|-----------------|
| 1 | Package compiles without errors | `npx tsc -p packages/shared/tsconfig.json --noEmit` | Exit code 0, no errors |
| 2 | All 7 entity interfaces are exported | Inspect `packages/shared/src/types/index.ts` | `User`, `Project`, `Board`, `Column`, `Task`, `Comment`, `Label` all present |
| 3 | `Priority` type is exported | Inspect source | Union type with 4 values |
| 4 | API contract types are exported | Inspect source | `LoginRequest`, `LoginResponse`, `ApiSuccessResponse`, `ApiErrorResponse` |
| 5 | `PRIORITIES` constant has 4 values | Inspect source | `["low", "medium", "high", "urgent"]` |
| 6 | `DEFAULT_COLUMNS` constant has 4 values | Inspect source | `["To Do", "In Progress", "In Review", "Done"]` |
| 7 | Barrel export re-exports everything | Inspect `packages/shared/src/index.ts` | All types and constants re-exported |
| 8 | Build produces `dist/` output | `npm run build -w @taskboard/shared` | `dist/index.js`, `dist/index.d.ts`, `dist/types/index.js`, `dist/types/index.d.ts`, `dist/constants/index.js`, `dist/constants/index.d.ts` all exist |
| 9 | npm workspace resolves package | `npm ls @taskboard/shared` | Package listed, no errors |
| 10 | Entity fields match master plan data model | Manual comparison | Every field from Section 4 of MASTER_PLAN.md is present in the corresponding interface |

---

## 6. Implementation Order

1. **Create `packages/shared/package.json`** — establishes the package identity and scripts so npm workspaces can discover it
2. **Create `packages/shared/tsconfig.json`** — configures TypeScript compilation before writing any `.ts` files
3. **Create `packages/shared/src/types/index.ts`** — all entity interfaces and API contract types (the core deliverable)
4. **Create `packages/shared/src/constants/index.ts`** — priority and column constants (depends on `Priority` type from step 3)
5. **Create `packages/shared/src/index.ts`** — barrel export (depends on steps 3 and 4)
6. **Run `npm install`** — link the new workspace package into the monorepo's `node_modules`
7. **Run `npm run build -w @taskboard/shared`** — compile and verify `dist/` output
8. **Verify** — run verification commands (Section 7)

---

## 7. Verification Commands

All commands are ESM-compatible (project uses `"type": "module"`).

```bash
# 1. Install workspace dependencies (links @taskboard/shared)
npm install

# 2. Compile the shared package (produces dist/)
npm run build -w @taskboard/shared

# 3. Verify compilation succeeds with no errors (dry run)
npx tsc -p packages/shared/tsconfig.json --noEmit

# 4. Verify dist output files exist
ls packages/shared/dist/index.js \
   packages/shared/dist/index.d.ts \
   packages/shared/dist/types/index.js \
   packages/shared/dist/types/index.d.ts \
   packages/shared/dist/constants/index.js \
   packages/shared/dist/constants/index.d.ts

# 5. Verify package is resolvable within the monorepo
npm ls @taskboard/shared

# 6. Verify all entity interfaces are exported
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/shared/src/types/index.ts', 'utf8');
  const entities = ['User', 'Project', 'Board', 'Column', 'Task', 'Comment', 'Label'];
  for (const e of entities) {
    console.assert(src.includes('export interface ' + e), e + ' interface missing');
  }
  console.assert(src.includes('export type Priority'), 'Priority type missing');
  console.assert(src.includes('export interface LoginRequest'), 'LoginRequest missing');
  console.assert(src.includes('export interface LoginResponse'), 'LoginResponse missing');
  console.assert(src.includes('export interface ApiSuccessResponse'), 'ApiSuccessResponse missing');
  console.assert(src.includes('export interface ApiErrorResponse'), 'ApiErrorResponse missing');
  console.log('OK: All types exported');
"

# 7. Verify constants are correct
node --input-type=module -e "
  import { PRIORITIES, DEFAULT_COLUMNS } from './packages/shared/dist/index.js';
  console.assert(PRIORITIES.length === 4, 'Expected 4 priorities');
  console.assert(PRIORITIES[0] === 'low', 'First priority should be low');
  console.assert(PRIORITIES[3] === 'urgent', 'Last priority should be urgent');
  console.assert(DEFAULT_COLUMNS.length === 4, 'Expected 4 default columns');
  console.assert(DEFAULT_COLUMNS[0] === 'To Do', 'First column should be To Do');
  console.assert(DEFAULT_COLUMNS[3] === 'Done', 'Last column should be Done');
  console.log('OK: Constants verified');
"

# 8. Verify barrel exports re-export both types and constants
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const barrel = readFileSync('./packages/shared/src/index.ts', 'utf8');
  console.assert(barrel.includes('from \"./types/index.js\"'), 'Missing types re-export');
  console.assert(barrel.includes('from \"./constants/index.js\"'), 'Missing constants re-export');
  console.log('OK: Barrel exports verified');
"
```

All commands should exit with code 0 and produce no errors.