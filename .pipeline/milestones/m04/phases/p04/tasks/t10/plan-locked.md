Good. Now I have full context to produce the revised plan. Here it is:

# Task 10 Plan: End-to-End Verification and Polish

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | N/A — TypeScript compilation | Verified | All three packages (`@taskboard/shared`, `@taskboard/server`, `@taskboard/client`) compile without errors |
| 2 | N/A — Server test suite | Verified | All server integration tests pass (14 test files covering models and routes) |
| 3 | N/A — Client test suite | Verified | All client unit tests pass (22 test files covering components, context, pages, and UI) |
| 4 | N/A — Dev server startup | Verified | Both server and client start without errors via `npm run dev` |
| 5 | Various source files | Modified (if needed) | Fix any TypeScript compilation errors, test failures, or broken interactions discovered during verification |

---

## 2. Dependencies

- **Tasks 1–9 (all completed)** — all Phase 4 features must be implemented:
  - Task 1: Comments API client (`packages/client/src/api/comments.ts`, `PopulatedComment` type)
  - Task 2: Comment UI components (`comment-list.tsx`, `comment-form.tsx`, integrated into `task-detail-panel.tsx`)
  - Task 3: Labels API client (`packages/client/src/api/labels.ts`)
  - Task 4: Labels in BoardContext (`board-context.tsx` extended with `labels`, `addLabel`, `updateLabel`, `removeLabel`)
  - Task 5: TaskCard label colors (`task-card.tsx` uses actual label colors from context)
  - Task 6: LabelPicker component (`label-picker.tsx`, integrated into `task-detail-panel.tsx`)
  - Task 7: LabelManager component (`label-manager.tsx`, integrated into `label-picker.tsx`)
  - Task 8: FilterBar component (`filter-bar.tsx`)
  - Task 9: Filter integration in BoardView (`board-view.tsx` with filter state, filtered tasks, drag-and-drop guard)

- **All prior milestones and phases** — M01 (Foundation), M02 (Core API), M03 (Frontend Shell & Projects), M04/P01 (Board & Columns), M04/P02 (Task Cards & DnD), M04/P03 (Task Detail Panel) must be intact and regression-free.

- **MongoDB** — must be running locally for server integration tests.

---

## 3. Implementation Details

This task is a verification and polish task, not a feature implementation task. The work consists of running a series of automated checks, inspecting their output, and fixing any issues discovered. No new files are created unless a fix requires one.

### Step 1: TypeScript Compilation Check — Shared Package

**Command**: `npm run build --workspace=@taskboard/shared`

**What it verifies**:
- The `PopulatedComment` interface (lines 57-64 of `packages/shared/src/types/index.ts`) compiles correctly alongside `Comment`, `Label`, `Task`, `Priority`, `ApiSuccessResponse`, and all other shared types.
- The shared package's `dist/` output is generated correctly, since both `@taskboard/server` and `@taskboard/client` depend on it at build time.

**Potential issues**: None expected — the shared package types have been stable since Task 1 added `PopulatedComment`.

### Step 2: TypeScript Compilation Check — Server Package

**Command**: `cd packages/server && npx tsc --noEmit`

**What it verifies**:
- All server source files (`src/routes/*.ts`, `src/models/*.ts`, `src/middleware/*.ts`, etc.) compile without errors.
- No regressions from changes to `@taskboard/shared` types (e.g., `PopulatedComment` addition didn't break any server imports).

**Potential issues**: None expected — Phase 4 only modified client-side files and the shared types package. The server was not modified.

### Step 3: TypeScript Compilation Check — Client Package

**Command**: `cd packages/client && npx tsc --noEmit`

**What it verifies**:
- All client source files compile without errors, including:
  - New files: `api/comments.ts`, `api/labels.ts`, `components/comment-list.tsx`, `components/comment-form.tsx`, `components/label-picker.tsx`, `components/label-manager.tsx`, `components/filter-bar.tsx`
  - Modified files: `context/board-context.tsx`, `components/task-card.tsx`, `components/task-detail-panel.tsx`, `components/board-view.tsx`
- All imports resolve correctly across the component dependency chain:
  - `board-view.tsx` → `filter-bar.tsx` (imports `FilterBar`, `FilterState`)
  - `board-view.tsx` → `task-detail-panel.tsx` → `label-picker.tsx` → `label-manager.tsx`
  - `board-view.tsx` → `task-detail-panel.tsx` → `comment-list.tsx` → `comment-form.tsx`
  - `task-card.tsx` → `board-context.tsx` (imports `useBoard` for labels)
  - All components → `@taskboard/shared` (type imports)

**Potential issues**:
- Type mismatches between `PopulatedComment` and `Comment` in comment components.
- Missing or incorrect `Label` type imports in new components.
- `FilterState` export/import chain between `filter-bar.tsx` and `board-view.tsx`.

### Step 4: Server Test Suite

**Command**: `npm test --workspace=@taskboard/server`

**What it verifies** (14 test files, covering all server-side functionality):
- **Model tests** (7 files): `user.model.test.ts`, `project.model.test.ts`, `board.model.test.ts`, `task.model.test.ts`, `comment.model.test.ts`, `label.model.test.ts`, `seed.test.ts`
- **Route tests** (6 files): `auth.routes.test.ts`, `project.routes.test.ts`, `board.routes.test.ts`, `task.routes.test.ts`, `comment.routes.test.ts`, `label.routes.test.ts`
- **App test** (1 file): `app.test.ts`

**Why server tests matter for this task**: The server provides the API that all Phase 4 client features depend on. Confirming server tests pass ensures:
- Comment endpoints (`GET/POST/PUT/DELETE /api/tasks/:taskId/comments` and `/api/comments/:id`) work correctly — the comment populate behavior (`author: { _id, name, email }`) is verified.
- Label endpoints (`GET/POST/PUT/DELETE /api/projects/:projectId/labels` and `/api/labels/:id`) work correctly — the cascade delete (`$pull` from tasks) is verified.
- Task endpoint (`PUT /api/tasks/:id`) accepts `labels: string[]` in the update body — required for `LabelPicker` label toggle.
- No regressions in auth, project, board, or column endpoints.

**Potential issues**:
- MongoDB not running locally → test runner will fail to connect. Resolution: start MongoDB.
- Test database not clean from previous runs → potential flaky tests. Resolution: tests should handle their own setup/teardown.

### Step 5: Client Test Suite

**Command**: `npm test --workspace=@taskboard/client`

**What it verifies** (22 test files):

#### Phase 4 component tests (7 files — the focus of this verification):

1. **`components/__tests__/task-card.test.tsx`** — verifies:
   - Label dots render with actual colors from `useBoard().labels` (not placeholder gray)
   - `title` attribute shows label name on hover
   - Missing/stale label IDs are skipped (no rendering)
   - Priority badge, due date, overdue styling still work

2. **`components/__tests__/label-picker.test.tsx`** — verifies:
   - Dropdown opens/closes correctly
   - Checkboxes match task's current labels
   - Toggling a checkbox calls `updateTask` with correct label array
   - `onUpdate` callback receives the updated task
   - Error handling when `updateTask` rejects
   - Click-outside-to-close behavior
   - "Manage labels" link is present

3. **`components/__tests__/label-manager.test.tsx`** — verifies:
   - Create form works (calls `addLabel`, form resets)
   - Enter key submits create form
   - Empty name validation
   - Edit mode: inline inputs populated, Save calls `updateLabel` with changed fields only
   - Cancel edit: discards changes, `updateLabel` not called
   - Escape key cancels edit
   - Delete: confirm dialog appears, Confirm calls `removeLabel`
   - Cancel delete: `removeLabel` not called

4. **`components/__tests__/filter-bar.test.tsx`** — verifies:
   - Label, priority, and due date controls render
   - Clear button hidden when no filters active
   - Dropdown opens and shows options
   - Toggling checkboxes calls `onFilterChange` with correct state
   - Badge count appears on active filter buttons
   - Due date inputs call `onFilterChange`
   - Task count summary shows when filters active
   - Clear filters resets all state
   - Click-outside-to-close for dropdowns
   - Empty project labels handled

5. **`components/__tests__/board-view.test.tsx`** — verifies:
   - FilterBar renders above columns
   - `totalCount` and `filteredCount` passed correctly
   - Label filter hides non-matching tasks
   - Priority filter hides non-matching tasks
   - Due date filter hides out-of-range and no-dueDate tasks
   - Combined filters use AND logic
   - Clearing filters restores full board
   - Intra-column reorder blocked when filters active
   - Column reorder unaffected by task filters
   - Visual "reordering disabled" indicator appears/disappears
   - Column task count shows unfiltered count
   - Add column UI unaffected by filters
   - All pre-existing tests (columns, task cards, drag-and-drop, task detail panel) still pass

6. **`components/__tests__/task-detail-panel.test.tsx`** — verifies:
   - Title editing, description tabs, priority selector, due date picker
   - Delete task with confirmation
   - `LabelPicker` integration (rendered with correct props)
   - All `useBoard` mocks include `labels: []` field
   - **Note**: This file does not contain comment-related tests (see Known Gaps below)

7. **`context/__tests__/board-context.test.tsx`** — verifies:
   - `loadBoard` fetches labels in parallel with tasks
   - `addLabel` calls API and appends to state
   - `updateLabel` calls API and patches state
   - `removeLabel` calls API, removes from labels state, and strips from tasks

#### Regression tests (15 files — must all still pass):

8–22: `column.test.tsx`, `add-task-form.test.tsx`, `header.test.tsx`, `app-layout.test.tsx`, `project-card.test.tsx`, `project-form-modal.test.tsx`, `sidebar.test.tsx`, `confirm-dialog.test.tsx`, `error-message.test.tsx`, `loading-spinner.test.tsx`, `modal.test.tsx`, `projects-context.test.tsx`, `dashboard-page.test.tsx`, `login-page.test.tsx`, `board-page.test.tsx`

### Step 6: Dev Server Startup Check

**Command**: `npm run dev` (starts both server and client concurrently)

**What it verifies**:
- Vite dev server starts without build errors (client).
- Fastify server starts and connects to MongoDB (server).
- No runtime import errors in the browser console.

### Step 7: Fix Any Issues Discovered

If any of Steps 1–6 reveal failures, fix them. Common patterns:
- **TypeScript errors**: Missing type import → add it; property missing on interface → fix reference
- **Test failures**: Mock missing `labels: []` → add to mock; selector mismatch → update query
- **Runtime errors**: Context value undefined → check provider; fetch failure → check API URL

---

## 4. Contracts

This task has no new interfaces or APIs. The contracts verified are:

### Comment CRUD Contract

| Operation | Client Function | API Endpoint | Response Type |
|-----------|----------------|--------------|---------------|
| List | `fetchComments(taskId)` | `GET /api/tasks/:taskId/comments` | `ApiSuccessResponse<PopulatedComment[]>` |
| Create | `createComment(taskId, body)` | `POST /api/tasks/:taskId/comments` | `ApiSuccessResponse<Comment>` |
| Update | `updateComment(commentId, body)` | `PUT /api/comments/:commentId` | `ApiSuccessResponse<Comment>` |
| Delete | `deleteComment(commentId)` | `DELETE /api/comments/:commentId` | `ApiSuccessResponse<{ message: string }>` |

### Label CRUD Contract

| Operation | Client Function | API Endpoint | Response Type |
|-----------|----------------|--------------|---------------|
| List | `fetchLabels(projectId)` | `GET /api/projects/:projectId/labels` | `ApiSuccessResponse<Label[]>` |
| Create | `createLabel(projectId, input)` | `POST /api/projects/:projectId/labels` | `ApiSuccessResponse<Label>` |
| Update | `updateLabel(labelId, input)` | `PUT /api/labels/:labelId` | `ApiSuccessResponse<Label>` |
| Delete | `deleteLabel(labelId)` | `DELETE /api/labels/:labelId` | `ApiSuccessResponse<{ message: string }>` |

### Filter Contract

| Filter Type | Match Logic |
|-------------|-------------|
| Labels | OR — task has at least one selected label |
| Priority | OR — task's priority matches any selected |
| Due date | Inclusive range; tasks without dueDate excluded when date filter active |
| Cross-type | AND — all active filter types must pass |

### Drag-and-Drop Guard Contract

| Scenario | Filters Active | Behavior |
|----------|---------------|----------|
| Intra-column reorder | Yes | Blocked |
| Cross-column move | Yes | Allowed |
| Column reorder | Yes | Allowed |
| Any drag | No | Fully allowed |

---

## 5. Test Plan

This task IS the test plan. No new test files are created. The verification consists of running all existing tests (14 server + 22 client = 36 total test files) and confirming they pass. See Section 3, Step 5 for the complete test file inventory and what each verifies.

### Known Gaps — Comment CRUD Client Tests

There are **no automated client-side tests** for comment CRUD (items 1–3 in the exit criteria checklist below). Specifically:
- No `comment-list.test.tsx` or `comment-form.test.tsx` test files exist in the client test suite.
- `task-detail-panel.test.tsx` contains zero comment-related tests — no imports, assertions, or mentions of "comment".

This is a gap inherited from Tasks 1–2, which did not include dedicated test files for comment components. For this verification task, comment CRUD criteria can only be verified through:
1. **TypeScript compilation** (Step 3) — confirms `comment-list.tsx` and `comment-form.tsx` compile correctly, their types are consistent, and their imports resolve.
2. **Integration wiring spot-checks** (Section 7) — grep commands confirm `CommentList` is imported and rendered in `task-detail-panel.tsx` with the correct `taskId` prop.
3. **Manual dev-server inspection** (Step 6) — open a task detail panel in the browser and verify comment list rendering, add/edit/delete behavior, and author display.

### Phase 4 exit criteria checklist

| # | Criterion | Verified by |
|---|-----------|-------------|
| 1 | CommentList renders comments in chronological order with author name and timestamp | **No automated client test.** Verified by: TypeScript compilation (Step 3 confirms component compiles), integration wiring spot-check (`grep -n "CommentList" packages/client/src/components/task-detail-panel.tsx`), and manual dev-server inspection (Step 6) |
| 2 | New comments can be added and appear immediately | **No automated client test.** Verified by: TypeScript compilation (Step 3 confirms `comment-form.tsx` compiles with correct `createComment` call), and manual dev-server inspection (Step 6) |
| 3 | Comments can be edited inline and deleted with confirmation | **No automated client test.** Verified by: TypeScript compilation (Step 3 confirms edit/delete handlers in `comment-list.tsx` compile with correct `updateComment`/`deleteComment` calls), and manual dev-server inspection (Step 6) |
| 4 | Labels can be created with name and hex color | `label-manager.test.tsx` test 5 ("creates a new label and resets the form") |
| 5 | Labels can be edited and deleted; deleting removes from all tasks | `label-manager.test.tsx` tests 9, 12; `board-context.test.tsx` (`removeLabel` strips from tasks) |
| 6 | LabelPicker shows all labels with checkboxes; toggling attaches/detaches | `label-picker.test.tsx` tests 3-7 |
| 7 | TaskCard renders label dots in actual colors | `task-card.test.tsx` color rendering tests |
| 8 | FilterBar renders with label, priority, and due date controls | `filter-bar.test.tsx` test 1; `board-view.test.tsx` ("renders FilterBar above the board columns") |
| 9 | Label filter shows only tasks with selected labels | `board-view.test.tsx` ("label filter hides tasks without matching labels") |
| 10 | Priority filter shows only tasks with selected priorities | `board-view.test.tsx` ("priority filter hides tasks without matching priority") |
| 11 | Due date filter shows only tasks within range | `board-view.test.tsx` ("due date filter hides tasks outside range and tasks without dueDate") |
| 12 | Filters combine with AND logic; clearing restores full board | `board-view.test.tsx` ("combined filters use AND logic", "clearing all filters restores the full board") |
| 13 | Intra-column reordering disabled when filtering | `board-view.test.tsx` ("intra-column reorder is blocked when filters are active") |
| 14 | All interactions persist to server via REST API | Server route tests (comment, label, task endpoints) + client API call assertions in component tests |
| 15 | No regressions in existing functionality | All 15 regression test files pass |

---

## 6. Implementation Order

1. **Step 1**: Build the shared package — `npm run build --workspace=@taskboard/shared`
2. **Step 2**: TypeScript compile check for server — `cd packages/server && npx tsc --noEmit`
3. **Step 3**: TypeScript compile check for client — `cd packages/client && npx tsc --noEmit`
4. **Step 4**: Run server tests — `npm test --workspace=@taskboard/server`
5. **Step 5**: Run client tests — `npm test --workspace=@taskboard/client`
6. **Step 6**: Start dev server — `npm run dev` (verify both services start cleanly, then stop)
7. **Step 7**: Fix any issues found in Steps 1-6 (if any)
8. **Step 8**: Re-run the full test suite — `npm test` (root-level, runs all workspaces)
9. **Step 9**: Final TypeScript compilation check — build all packages: `npm run build`

---

## 7. Verification Commands

```bash
# 1. Build shared package
npm run build --workspace=@taskboard/shared

# 2. TypeScript compilation — server
cd packages/server && npx tsc --noEmit

# 3. TypeScript compilation — client
cd packages/client && npx tsc --noEmit

# 4. Server tests
npm test --workspace=@taskboard/server

# 5. Client tests
npm test --workspace=@taskboard/client

# 6. Full test suite
npm test

# 7. Full build
npm run build

# 8. Dev server startup (manual)
npm run dev

# 9. Spot-checks — component exports
grep -n "export function CommentList" packages/client/src/components/comment-list.tsx
grep -n "export function CommentForm" packages/client/src/components/comment-form.tsx
grep -n "export function LabelPicker" packages/client/src/components/label-picker.tsx
grep -n "export function LabelManager" packages/client/src/components/label-manager.tsx
grep -n "export function FilterBar" packages/client/src/components/filter-bar.tsx
grep -n "export interface FilterState" packages/client/src/components/filter-bar.tsx

# 10. Spot-checks — integration wiring
grep -n "CommentList" packages/client/src/components/task-detail-panel.tsx
grep -n "LabelPicker" packages/client/src/components/task-detail-panel.tsx
grep -n "LabelManager" packages/client/src/components/label-picker.tsx
grep -n "FilterBar" packages/client/src/components/board-view.tsx

# 11. Spot-checks — Phase 4 features in place
grep -c "bg-gray-400" packages/client/src/components/task-card.tsx  # Expected: 0
grep -n "PopulatedComment" packages/shared/src/types/index.ts
grep -n "addLabel\|updateLabel\|removeLabel" packages/client/src/context/board-context.tsx
grep -n "hasActiveFilters" packages/client/src/components/board-view.tsx
grep -n "Reordering disabled" packages/client/src/components/board-view.tsx

# 12. Spot-checks — comment integration wiring (confirms components are imported and rendered)
grep -n "import.*CommentList" packages/client/src/components/task-detail-panel.tsx
grep -n "CommentList.*taskId" packages/client/src/components/task-detail-panel.tsx
grep -n "import.*CommentForm" packages/client/src/components/comment-list.tsx
```