Now I have a thorough understanding of the codebase, the phase specifications pattern, and the current state. Let me produce the Phase 3 specification.

# Phase 3 — Task Detail Panel

## Goal

Deliver a slide-over side panel that opens when a user clicks a task card on the board, providing full view and edit access to all task fields — title (inline editable), markdown description (textarea with live preview toggle via `react-markdown`), priority (dropdown selector), and due date (native date picker) — plus the ability to delete the task with confirmation. All edits persist to the server through `PUT /api/tasks/:id` and immediately reflect on the board behind the panel, so the user sees changes in context without closing the panel or re-fetching the board.

---

## Design Decisions

### 1. Side Panel (Slide-Over) Rather Than Centered Modal

**Rationale**: A modal blocks the view of the board. A side panel that slides in from the right keeps the board partially visible, preserving spatial context. The user can see which column the task belongs to and how changes (e.g., priority badge) update in real time. The panel will render via `createPortal` (same approach as the existing `Modal` component) as a fixed overlay: a semi-transparent backdrop on the left and a panel container anchored to the right edge. Clicking the backdrop or pressing Escape closes the panel.

### 2. Toggle Between Edit and Preview Modes for Markdown (Not Side-by-Side)

**Rationale**: The milestone spec mentions "live preview toggle/tab." Side-by-side rendering splits the available panel width and requires careful layout management. A toggle between "Write" and "Preview" tabs is simpler, uses the full panel width for both editing and previewing, and avoids performance concerns with re-rendering markdown on every keystroke. The preview tab renders the current textarea content via `react-markdown`. The description saves on blur or explicit save, not on every keystroke.

### 3. Debounced Auto-Save for Field Edits (Except Title)

**Rationale**: The spec requires edits to "reflect immediately on the board." Rather than adding a Save button for every field, each field auto-saves after the user finishes editing: title saves on blur/Enter (inline editing pattern established in `Column` rename), priority saves immediately on selection change, due date saves immediately on change, and description saves on blur (switching away from the textarea) or when toggling from Write to Preview. This avoids the need for a form submit flow and keeps the interaction lightweight. A brief saving/saved indicator provides feedback.

### 4. Panel State Managed Locally, Board Sync via Context

**Rationale**: The `TaskDetailPanel` will fetch the full task object from `GET /api/tasks/:id` when it opens (to get the freshest data and populated labels). It holds the editable field values in local component state. On successful `PUT /api/tasks/:id`, the returned updated task is patched into `BoardContext.tasks` via the existing `setTasks` dispatcher. This keeps the board and panel in sync without re-fetching the entire board.

### 5. Use Existing `ConfirmDialog` for Delete Confirmation

**Rationale**: The shared `ConfirmDialog` component is already built and tested. The delete button in the panel opens it with an appropriate message. On confirm, `DELETE /api/tasks/:id` is called, the task is removed from `BoardContext.tasks`, and the panel closes.

### 6. `fetchTask` API Function Returns Task with Populated Labels

**Rationale**: The `GET /api/tasks/:id` endpoint populates the `labels` field with full label objects (name, color) rather than just IDs. While the current `Task` type stores labels as `string[]`, Phase 4 will need the full label data. For this phase, we add a `fetchTask` function that returns the task. The labels array will be used only as IDs for now; Phase 4 will leverage the populated data when adding the `LabelPicker`.

### 7. Prevent Click-Through During Drag

**Rationale**: In Phase 2, task cards are wrapped in sortable drag containers. A click event fires after a completed drag-and-drop, which would erroneously open the detail panel. The `BoardView` must track whether a drag operation is in progress and suppress the `onClick` handler on `TaskCard` when the user just finished dragging. The existing `onDragStart`/`onDragEnd` hooks provide the necessary lifecycle events to set a `isDragging` ref.

### 8. Install `react-markdown` as Part of This Phase

**Rationale**: `react-markdown` is not yet installed in the client package. It is needed for description preview rendering. It will be installed as the first task to unblock development of the markdown preview feature.

---

## Tasks

### Task 1: Install `react-markdown`

**Deliverables**:
- Install `react-markdown` as a production dependency in `packages/client`
- Verify the client still compiles and starts with the new dependency
- Verify `react-markdown` is listed in `packages/client/package.json` dependencies

### Task 2: `fetchTask` API Client Function

**Deliverables**:
- Add a `fetchTask` function to `packages/client/src/api/tasks.ts`:
  - `fetchTask(taskId: string): Promise<ApiSuccessResponse<Task>>` — calls `GET /api/tasks/:taskId`
- Uses the existing `apiClient` from `api/client.ts`
- Type imports from `@taskboard/shared`

### Task 3: Extend Board Context with `updateTask` and `removeTask`

**Deliverables**:
- Add `updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task>` to `BoardContextValue`:
  - Calls `api/tasks.updateTask(taskId, updates)`
  - On success, patches the matching task in the `tasks` state array with the returned updated task
  - Returns the updated task
- Add `removeTask(taskId: string): Promise<void>` to `BoardContextValue`:
  - Calls `api/tasks.deleteTask(taskId)`
  - On success, removes the task from the `tasks` state array
- Update unit tests in `packages/client/src/context/__tests__/board-context.test.tsx` to cover the new methods (mock API calls, verify state updates)

### Task 4: `TaskDetailPanel` Component — Layout and Title Editing

**Deliverables**:
- New file `packages/client/src/components/task-detail-panel.tsx`
- Props: `{ taskId: string; onClose: () => void }`
- Panel renders as a fixed overlay via `createPortal`:
  - Semi-transparent backdrop (`bg-black/20`) covering the full viewport; clicking it calls `onClose`
  - Panel container: fixed, right-aligned, full height, `max-w-2xl`, white background, shadow-xl, with a slide-in appearance
  - Close button (X icon) in the panel header
  - Escape key closes the panel
  - Prevents body scroll while open
- On mount, calls `fetchTask(taskId)` to load the full task; shows `LoadingSpinner` while loading; shows `ErrorMessage` on failure
- Displays the task title as an inline-editable field:
  - Renders as a styled `<h2>` by default
  - Click to enter edit mode (text input, pre-filled with current title)
  - Enter or blur to save; calls `updateTask` from board context with `{ title }`
  - Escape to cancel, reverting to the previous value
- Displays the task's current status (column name) as a read-only label beneath the title

### Task 5: Markdown Description Editor with Preview Toggle

**Deliverables**:
- Within `TaskDetailPanel`, add a description section below the title:
  - Two tabs: "Write" and "Preview"
  - "Write" tab: a `<textarea>` with the current description, auto-resizing or a reasonable min-height
  - "Preview" tab: renders the textarea content via `react-markdown` with appropriate Tailwind prose styling
  - Default to "Write" tab if description is empty, "Preview" tab if description exists
  - Description saves on blur (when focus leaves the textarea) via `updateTask({ description })`
  - If description is empty/whitespace, a placeholder prompt ("Add a description...") is shown in preview mode
- Unit tests: renders textarea in Write mode, renders markdown in Preview mode, tab switching works

### Task 6: Priority Selector and Due Date Picker

**Deliverables**:
- `PrioritySelector` — either an inline component within the panel or a small dedicated component:
  - Dropdown (`<select>` or custom) showing "Low", "Medium", "High", "Urgent" with color-coded indicators matching the badge colors from `TaskCard`
  - Current priority pre-selected
  - On change, immediately calls `updateTask({ priority })` from board context
- `DueDatePicker` — either inline or a small dedicated component:
  - Native `<input type="date">` showing the current due date (or empty)
  - A clear button (X) to remove the due date (sends `dueDate: null`)
  - On change, immediately calls `updateTask({ dueDate })` from board context
  - Displays the date in a human-readable format alongside or above the input
- Both render in a sidebar-style metadata section within the panel (e.g., a right column or a horizontal row beneath the description)
- Unit tests: priority changes trigger update, date changes trigger update, clear button sends null

### Task 7: Delete Task with Confirmation

**Deliverables**:
- A "Delete task" button in the panel (styled as a destructive action — red text or outline)
- Clicking opens the existing `ConfirmDialog` with message "Are you sure you want to delete this task? This action cannot be undone."
- On confirm:
  - Calls `removeTask(taskId)` from board context
  - On success, calls `onClose` to close the panel
  - On failure, displays error in the panel
- Unit tests: delete button opens confirmation, confirm triggers deletion, panel closes on success

### Task 8: Wire TaskCard Click to Open Panel in BoardView

**Deliverables**:
- Update `packages/client/src/components/board-view.tsx`:
  - Add local state `selectedTaskId: string | null` (initially `null`)
  - Define `handleTaskClick(taskId: string)` that sets `selectedTaskId` — but only if a drag did not just finish (use a ref `hasDragged` set in `onDragEnd` and cleared after a short timeout or in a `requestAnimationFrame`)
  - Pass `onClick={handleTaskClick}` to each `TaskCard` component inside the sortable wrapper
  - When `selectedTaskId` is not null, render `<TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />`
- Update existing `BoardView` tests to verify: clicking a task card sets selected state, panel renders when a task is selected, panel close resets state
- Verify that drag-and-drop does not trigger the panel (drag → drop does not open the detail panel)

---

## Exit Criteria

1. `react-markdown` is installed and listed in `packages/client/package.json` dependencies
2. `fetchTask` API function in `api/tasks.ts` calls `GET /api/tasks/:id` and returns the task data
3. `BoardContext` exposes `updateTask` and `removeTask` methods that persist changes to the API and update local state; unit tests pass
4. Clicking a task card on the board opens a side panel sliding in from the right; clicking the backdrop, the close button, or pressing Escape closes it
5. Drag-and-drop operations do not accidentally open the task detail panel
6. The task title is displayed and can be edited inline; changes persist to the server and update the task card on the board
7. The task description can be edited in a textarea ("Write" tab) and previewed as rendered markdown ("Preview" tab) via `react-markdown`; description changes persist to the server on blur
8. The priority can be changed via a dropdown selector; the change persists to the server and the priority badge on the task card updates immediately
9. The due date can be set or cleared via a date input; the change persists to the server and the due date on the task card updates immediately
10. A task can be deleted from the panel via a delete button with confirmation dialog; the task is removed from the board and the panel closes
11. All new and existing client tests pass (`npm run test -w packages/client`)
12. No regressions in login, dashboard, project CRUD, board/column management, or task drag-and-drop

---

## Dependencies

1. **Phase 2 (Task Cards & Drag-and-Drop)** — must be complete. Specifically:
   - `TaskCard` component with `onClick` prop support
   - Task drag-and-drop in `BoardView` with `onDragStart`/`onDragEnd` lifecycle
   - `BoardContext` with `tasks` state, `setTasks` dispatcher, `createTask`, and `moveTask` methods
   - API client functions in `api/tasks.ts` for `createTask`, `updateTask`, `deleteTask`, and `moveTask`
2. **Milestone 2 (Core API)** — task endpoints must be implemented:
   - `GET /api/tasks/:id` — fetch single task with populated labels
   - `PUT /api/tasks/:id` — update task fields
   - `DELETE /api/tasks/:id` — delete task and cascade to comments
3. **Shared UI Components** — `ConfirmDialog`, `LoadingSpinner`, `ErrorMessage`, and `Modal` (for reference patterns) must be in place from Milestone 3
4. **npm packages** — `react-markdown` will be installed as Task 1 of this phase

---

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/client/package.json` | **Modify** | Add `react-markdown` dependency |
| `packages/client/src/api/tasks.ts` | **Modify** | Add `fetchTask` function |
| `packages/client/src/context/board-context.tsx` | **Modify** | Add `updateTask` and `removeTask` methods to context |
| `packages/client/src/context/__tests__/board-context.test.tsx` | **Modify** | Add tests for `updateTask` and `removeTask` |
| `packages/client/src/components/task-detail-panel.tsx` | **Create** | Side panel component with title editing, markdown description, priority selector, due date picker, and delete |
| `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | **Create** | Unit tests for the task detail panel |
| `packages/client/src/components/board-view.tsx` | **Modify** | Add `selectedTaskId` state, `handleTaskClick` with drag guard, render `TaskDetailPanel` |
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** | Add tests for task click → panel open, drag guard, panel close |