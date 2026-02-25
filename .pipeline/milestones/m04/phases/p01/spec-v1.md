Now I have all the context I need. Let me produce the comprehensive phase specification.

# Phase 1: Board & Columns — Specification

## Goal

Deliver the foundational board view and column management UI that replaces the current `BoardPage` placeholder with a fully functional board. This phase introduces API client functions for boards, columns, and task listing; a `BoardView` component that fetches and renders the project's board with columns and task counts; complete column lifecycle management (add, rename, delete with guard, reorder via drag-and-drop using `@dnd-kit`); and renders task cards as minimal placeholders within their columns to validate the data pipeline end-to-end. Phase 2 will replace these placeholder cards with full `TaskCard` components and add task drag-and-drop.

---

## Design Decisions

### 1. Board state lives in a dedicated context (`BoardContext`)

**Rationale**: The board view involves deeply nested, frequently mutating state (board → columns, tasks grouped by column). Following the established pattern from `ProjectsContext`, a dedicated `BoardContext` provides `board`, `tasks`, `isLoading`, and `error` state plus mutation methods. This keeps the board state co-located, avoids prop drilling, and gives Phase 2–4 a stable state layer to build on. The context is scoped to the `BoardPage` subtree so it mounts/unmounts with navigation.

### 2. Install `@dnd-kit/core` and `@dnd-kit/sortable` now; use a column-only `DndContext` with a drag handle strategy

**Rationale**: Phase 2 will add task drag-and-drop in the same view. To avoid a painful refactor, column drag uses a dedicated drag handle (a grip icon in the column header) rather than making the entire column draggable. This ensures that when task `SortableContext` is added inside columns in Phase 2, the two drag scopes do not conflict. Columns use `SortableContext` with `verticalListSortingStrategy` rotated to horizontal via CSS (columns are laid out in a horizontal flex row, but the sortable list treats them as a flat sequence).

### 3. API client functions go in `packages/client/src/api/boards.ts`

**Rationale**: Following the existing pattern (`auth.ts`, `projects.ts`), board-related API calls (fetch board, column CRUD, reorder, fetch tasks) are grouped in a single module. Task mutation endpoints will be added in a separate `tasks.ts` in Phase 2 to keep modules focused.

### 4. Column delete shows the server-side error message in an `ErrorMessage` toast rather than pre-checking task count

**Rationale**: The server already returns a 400 with `{ error: "Cannot delete column that contains tasks" }`. Re-checking client-side would require extra logic and could race with concurrent task creation. Instead, attempt the delete and surface the error. This keeps the client simpler and the server as the single source of truth.

### 5. Column rename uses an inline editable text field (double-click to edit)

**Rationale**: A popover or modal for renaming a single text field is heavy. Inline editing (double-click the column name → text input → Enter to save, Escape to cancel) is a standard UX pattern for renaming and keeps the board clean. This avoids introducing a new modal type for a single-field edit.

### 6. Task cards rendered as minimal stubs in this phase

**Rationale**: To validate the full data pipeline (API → context → columns → cards), tasks are fetched and rendered as simple `<div>` elements showing only the title. The full `TaskCard` component (priority badge, label dots, due date, drag-and-drop) is Phase 2's responsibility. This keeps Phase 1 focused on board structure and column management.

---

## Tasks

### Task 1: Install `@dnd-kit` dependencies

**Deliverables**:
- Install `@dnd-kit/core` and `@dnd-kit/sortable` as production dependencies in `packages/client`
- Verify the packages resolve correctly and the client still compiles and starts

### Task 2: Board & task API client functions

**Deliverables**:
- New file `packages/client/src/api/boards.ts` with the following exported functions:
  - `fetchBoard(projectId: string): Promise<Board>` — calls `GET /api/projects/:projectId/board`, unwraps `{ data }` envelope
  - `fetchBoardTasks(boardId: string): Promise<Task[]>` — calls `GET /api/boards/:boardId/tasks`, unwraps `{ data }` envelope
  - `addColumn(boardId: string, name: string): Promise<Column>` — calls `POST /api/boards/:boardId/columns` with `{ name }`
  - `renameColumn(boardId: string, columnId: string, name: string): Promise<Column>` — calls `PUT /api/boards/:boardId/columns/:columnId` with `{ name }`
  - `deleteColumn(boardId: string, columnId: string): Promise<void>` — calls `DELETE /api/boards/:boardId/columns/:columnId`
  - `reorderColumns(boardId: string, columnIds: string[]): Promise<Board>` — calls `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds }`
- All functions use the existing `apiClient` from `client.ts` with its automatic Bearer token injection
- Types imported from `@taskboard/shared`

### Task 3: `BoardContext` — board state management

**Deliverables**:
- New file `packages/client/src/context/board-context.tsx` exporting `BoardProvider` and `useBoard` hook
- **State**: `board: Board | null`, `tasks: Task[]`, `isLoading: boolean`, `error: string | null`
- **Methods**:
  - `loadBoard(projectId: string)` — fetches board, then fetches tasks for that board; sets state
  - `addColumn(name: string)` — calls API, appends new column to `board.columns`
  - `renameColumn(columnId: string, name: string)` — calls API, updates column name in state
  - `removeColumn(columnId: string)` — calls API, removes column from state; re-throws on error so UI can display it
  - `reorderColumns(columnIds: string[])` — optimistic update (reorders columns immediately), calls API; reverts on failure
- `BoardProvider` wraps the board page subtree; accepts no props (reads `projectId` from route params internally, or via a prop — design TBD based on wiring)
- Unit tests for the context in `packages/client/src/context/__tests__/board-context.test.tsx`

### Task 4: `Column` component

**Deliverables**:
- New file `packages/client/src/components/column.tsx`
- Displays column name as an inline-editable text field (double-click to edit, Enter to save, Escape to cancel)
- Shows task count badge next to the column name
- Renders a drag handle icon (grip/dots icon) for column reordering
- Renders children (task card stubs) inside a scrollable container
- Includes a delete button (trash icon) that triggers `ConfirmDialog`; on confirm calls `removeColumn`; on API error displays `ErrorMessage`
- Accepts props: `column: Column`, `tasks: Task[]`, `onRename`, `onDelete`, plus `children` or render prop for task cards
- Styled with Tailwind: vertical card with rounded corners, subtle background, min-width for kanban column feel

### Task 5: `BoardView` component with column drag-and-drop

**Deliverables**:
- New file `packages/client/src/components/board-view.tsx`
- Consumes `useBoard()` context to read `board`, `tasks`, `isLoading`, `error`
- Shows `LoadingSpinner` while loading; shows `ErrorMessage` on error
- Renders columns in a horizontal flex/scroll container
- Groups tasks by `status` (matching column `name`) and passes them to each `Column`
- Wraps columns in `@dnd-kit` `DndContext` + `SortableContext` for column reordering
  - Each column is a `SortableItem` identified by `column._id`
  - On `onDragEnd`, computes new column order and calls `reorderColumns`
- Includes an "Add Column" button (at the end of the column row) that shows a small inline form (text input + confirm) and calls `addColumn`
- Task stubs inside each column render as simple `<div>` elements showing the task title (placeholder for Phase 2's `TaskCard`)

### Task 6: Wire `BoardPage` to render `BoardView`

**Deliverables**:
- Update `packages/client/src/pages/board-page.tsx`:
  - Wrap content in `BoardProvider`
  - Replace the placeholder `<div>` with `<BoardView />`
  - Keep the project name heading (or move it into the board header area)
  - Handle the case where the project is not found (retain existing guard)
- Update the board page test file (`packages/client/src/pages/__tests__/board-page.test.tsx`) to reflect the new structure
- Verify the full flow: navigate to `/projects/:id/board` → board loads → columns render with task counts → column CRUD works → column reorder works via drag-and-drop

---

## Exit Criteria

1. `@dnd-kit/core` and `@dnd-kit/sortable` are installed and listed in `packages/client/package.json`
2. `packages/client/src/api/boards.ts` exports functions for `fetchBoard`, `fetchBoardTasks`, `addColumn`, `renameColumn`, `deleteColumn`, and `reorderColumns` — all using the existing API client with JWT auth
3. `BoardContext` provides `board`, `tasks`, `isLoading`, `error` state and mutation methods; unit tests pass
4. Navigating to `/projects/:id/board` fetches the board from the API and renders columns with correct names and task counts
5. A new column can be added via the "Add Column" UI, persists to the server, and appears on the board
6. A column can be renamed via double-click inline editing, persists to the server, and updates on the board
7. A column can be deleted via the delete button + confirmation dialog; deletion is blocked with a visible error message when tasks exist in the column
8. Columns can be reordered via drag-and-drop using the drag handle; the new order persists to the server and survives a page refresh
9. Tasks belonging to each column are displayed as title-only stubs inside their respective columns
10. Existing functionality (login, dashboard, project CRUD, sidebar navigation) is not broken

---

## Dependencies

1. **Milestone 3 complete** — App shell, React Router, auth context, API client base (`client.ts`), sidebar, header, dashboard, project CRUD UI, `BoardPage` route at `/projects/:id/board`, reusable UI components (`Modal`, `ConfirmDialog`, `LoadingSpinner`, `ErrorMessage`) must all be in place
2. **Milestone 2 complete** — Server endpoints for `GET /api/projects/:projectId/board`, `POST/PUT/DELETE /api/boards/:boardId/columns/*`, `PUT /api/boards/:boardId/columns/reorder`, and `GET /api/boards/:boardId/tasks` must be implemented and functional
3. **Shared types** — `Board`, `Column`, `Task`, and `Priority` types must be exported from `@taskboard/shared`
4. **npm packages** — `@dnd-kit/core` and `@dnd-kit/sortable` will be installed as Task 1 of this phase

---

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/client/package.json` | Modified | Add `@dnd-kit/core` and `@dnd-kit/sortable` dependencies |
| `packages/client/src/api/boards.ts` | Created | API client functions for boards, columns, and task listing |
| `packages/client/src/context/board-context.tsx` | Created | Board state context provider and `useBoard` hook |
| `packages/client/src/context/__tests__/board-context.test.tsx` | Created | Unit tests for `BoardContext` |
| `packages/client/src/components/column.tsx` | Created | Column component with header, task count, inline rename, delete, drag handle |
| `packages/client/src/components/board-view.tsx` | Created | Board view with column rendering, dnd-kit column reorder, add column, task stubs |
| `packages/client/src/pages/board-page.tsx` | Modified | Replace placeholder with `BoardProvider` + `BoardView` |
| `packages/client/src/pages/__tests__/board-page.test.tsx` | Modified | Updated tests for new board page structure |