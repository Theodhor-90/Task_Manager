## Task: Shared package scaffold

### Objective

Create the `packages/shared/` package containing TypeScript entity interfaces for all 7 data models, API contract types, and shared constants used by both server and client.

### Deliverables

1. **`packages/shared/package.json`** with:
   - Package name (e.g., `@taskboard/shared`)
   - Build script
   - Correct `main` and `types` exports for cross-package consumption

2. **`packages/shared/tsconfig.json`** extending `tsconfig.base.json`

3. **`packages/shared/src/types/`** — Entity interfaces for all 7 models:
   - `User` — `_id`, `email`, `passwordHash`, `name`, `createdAt`, `updatedAt`
   - `Project` — `_id`, `name`, `description`, `owner` (ref User), `createdAt`, `updatedAt`
   - `Board` — `_id`, `project` (ref Project, unique 1:1), `columns` (Column[]), `createdAt`, `updatedAt`
   - `Column` — `_id`, `name`, `position` (0-based sort order)
   - `Task` — `_id`, `title`, `description` (markdown), `status`, `priority` (enum), `position` (0-based), `dueDate`, `labels` (ref Label[]), `board` (ref Board), `project` (ref Project), `createdAt`, `updatedAt`
   - `Comment` — `_id`, `body`, `task` (ref Task), `author` (ref User), `createdAt`, `updatedAt`
   - `Label` — `_id`, `name`, `color` (hex string), `project` (ref Project), `createdAt`
   - API contract types: `LoginRequest`, `LoginResponse`, `ApiError`
   - Response envelope: `{ data: T }` for success, `{ error: string }` for failure

4. **`packages/shared/src/constants/`** — Shared constants:
   - Priority values: `"low"`, `"medium"`, `"high"`, `"urgent"`
   - Default column names: `"To Do"`, `"In Progress"`, `"In Review"`, `"Done"`

5. **Barrel exports** — index files re-exporting all types and constants for clean imports

### Files to Create

- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/types/index.ts` (or split per entity)
- `packages/shared/src/constants/index.ts`
- `packages/shared/src/index.ts` (barrel export)

### Constraints

- TypeScript strict mode, ES modules only
- Named exports (avoid default exports)
- File naming: kebab-case
- Types must be usable from both server and client packages via npm workspaces resolution

### Dependencies

- **t01** (Root workspace configuration) — requires root `package.json` with workspaces and `tsconfig.base.json`

### Verification Criteria

1. `packages/shared/` compiles without TypeScript errors under strict mode
2. All 7 entity interfaces are defined with correct fields matching the master plan data model
3. API contract types (`LoginRequest`, `LoginResponse`, `ApiError`) are exported
4. Constants for priorities and default columns are exported
5. Barrel exports resolve correctly