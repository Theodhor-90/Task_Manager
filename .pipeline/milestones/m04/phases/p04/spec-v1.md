I now have comprehensive knowledge of the entire codebase. Let me produce the specification.

# Phase 4 — Comments & Labels UI

## Goal

Complete the kanban board milestone by adding a comments section within the task detail panel (list, add, edit, delete), full label management (create labels with name and color, edit, delete, assign/unassign from tasks), real label colors on task cards (replacing placeholder dots), and a filter bar above the board to filter visible tasks by label, priority, and due date — delivering the final interactive layer of the TaskBoard MVP's core experience.

---

## Design Decisions

### 1. Comments Managed Locally in TaskDetailPanel, Not in BoardContext

**Rationale**: Comments belong to a single task and are only visible inside the task detail panel. Adding comment state to `BoardContext` would bloat a context that already manages board, columns, and tasks. Instead, the `TaskDetailPanel` will fetch comments when it opens (alongside the existing task fetch) and manage them in local component state. This keeps the board context focused and avoids unnecessary re-renders of the board when comments change.

### 2. Comment Author Display via Populated Response

**Rationale**: The server's `GET /api/tasks/:taskId/comments` endpoint already populates the `author` field with `{ _id, name, email }` (via Mongoose `.populate("author", "name email")`). The client will use a `PopulatedComment` interface where `author` is an object `{ _id: string; name: string; email: string }` rather than a plain string ID. This avoids the need for a separate user lookup or cache. For newly created comments (where the `POST` response returns an unpopulated author ID), the client will use the current user's name from `useAuth()` to display the author inline, since the logged-in user is always the comment author in a single-user app.

### 3. Labels Stored in BoardContext as Shared State

**Rationale**: Labels are project-scoped and referenced by multiple components: `TaskCard` needs label colors for dot rendering, `LabelPicker` in the detail panel needs the full label list, the `FilterBar` needs labels for filter options, and `LabelManager` mutates the list. Storing labels in `BoardContext` — fetched alongside the board and tasks during `loadBoard` — gives all components access through the existing context pattern. The context will expose `labels`, `addLabel`, `updateLabel`, and `removeLabel` methods.

### 4. Label Picker as Checkbox-Based Dropdown Inside TaskDetailPanel

**Rationale**: The `LabelPicker` is a dropdown that displays all project labels as colored chips with checkboxes. Toggling a checkbox immediately adds or removes the label from the task via `PUT /api/tasks/:id` with the updated `labels` array. This is simpler than a drag-drop or separate modal approach and follows the pattern already established for priority (immediate save on change). The picker will include a link/button to open the `LabelManager` for creating new labels without leaving the context.

### 5. Label Manager as an Inline Section Accessible from LabelPicker or Board Header

**Rationale**: A dedicated modal or separate page for label management is heavy for what amounts to a simple CRUD list. Instead, the `LabelManager` will be a popover/dropdown panel with a list of existing labels (each with inline edit and delete), plus a form to create new labels with a name text input and a native `<input type="color">` picker. This keeps label management lightweight and contextually accessible. It can be triggered from a "Manage labels" link at the bottom of the `LabelPicker` or from a button in the board header area.

### 6. Client-Side Filtering with Drag-and-Drop Guard

**Rationale**: The filter bar will maintain filter state (selected labels, selected priorities, due-date range) and filter tasks client-side over the already-fetched `tasks` array from `BoardContext`. This avoids unnecessary network requests for what is a presentation-only concern. However, filtering creates a mismatch between visible tasks and the full position index used by drag-and-drop. To avoid incorrect position values being sent to the API, **drag-and-drop reordering within a column will be disabled while any filter is active** — a banner or visual cue will inform the user. Cross-column moves (changing status) will remain allowed since they don't depend on intra-column position relative to hidden tasks.

### 7. Filter State Managed via a Dedicated Hook, Not in BoardContext

**Rationale**: Filter state is a UI concern (which tasks to show/hide) and does not need to persist or be shared beyond the board view. A `useFilteredTasks` hook (or inline state in `BoardView`) will hold the active filters and derive the filtered task list. This avoids adding UI-only state to the data-focused `BoardContext` and keeps the filtering logic co-located with the rendering logic that consumes it.

---

## Tasks

### Task 1: Comments API Client

Create `packages/client/src/api/comments.ts` with functions for all comment endpoints, following the established `apiClient` pattern in `api/client.ts`.

**Deliverables**:
- `fetchComments(taskId: string): Promise<ApiSuccessResponse<PopulatedComment[]>>` — calls `GET /api/tasks/:taskId/comments`
- `createComment(taskId: string, body: string): Promise<ApiSuccessResponse<Comment>>` — calls `POST /api/tasks/:taskId/comments` with `{ body }`
- `updateComment(commentId: string, body: string): Promise<ApiSuccessResponse<Comment>>` — calls `PUT /api/comments/:commentId` with `{ body }`
- `deleteComment(commentId: string): Promise<ApiSuccessResponse<{ message: string }>>` — calls `DELETE /api/comments/:commentId`
- Add a `PopulatedComment` interface to `packages/shared/src/types/index.ts`: identical to `Comment` but with `author: { _id: string; name: string; email: string }` instead of `author: string`

### Task 2: Comment UI Components

Build the comments section inside `TaskDetailPanel`: a chronological list of comments and a form to add new comments, with inline edit and delete on each comment.

**Deliverables**:
- `CommentList` component (`packages/client/src/components/comment-list.tsx`): accepts a `taskId` prop, fetches comments on mount via `fetchComments`, renders each comment showing author name, relative timestamp (e.g., "2 hours ago"), and body text. Includes inline edit (click to toggle a textarea) and delete (with `ConfirmDialog`) per comment.
- `CommentForm` component (`packages/client/src/components/comment-form.tsx`): a textarea with a "Comment" submit button. On submit, calls `createComment`, prepends the new comment to the list, and clears the textarea. Displays a loading state while submitting.
- Integrate `CommentList` and `CommentForm` into `TaskDetailPanel` below the existing metadata section (priority/due date) and above the delete button, separated by a section heading "Comments".

### Task 3: Labels API Client

Create `packages/client/src/api/labels.ts` with functions for all label endpoints.

**Deliverables**:
- `fetchLabels(projectId: string): Promise<ApiSuccessResponse<Label[]>>` — calls `GET /api/projects/:projectId/labels`
- `createLabel(projectId: string, input: { name: string; color: string }): Promise<ApiSuccessResponse<Label>>` — calls `POST /api/projects/:projectId/labels`
- `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<ApiSuccessResponse<Label>>` — calls `PUT /api/labels/:labelId`
- `deleteLabel(labelId: string): Promise<ApiSuccessResponse<{ message: string }>>` — calls `DELETE /api/labels/:labelId`

### Task 4: Labels in BoardContext

Extend `BoardContext` to fetch, store, and manage labels as shared state accessible by `TaskCard`, `LabelPicker`, `LabelManager`, and `FilterBar`.

**Deliverables**:
- Add `labels: Label[]` to `BoardContextValue` state, initialized to `[]`
- Extend `loadBoard` to also call `fetchLabels(projectId)` and store the result in state (the project ID is available from the board response's `project` field)
- Add `addLabel(name: string, color: string): Promise<Label>` — calls `createLabel`, appends to labels state
- Add `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<Label>` — calls API `updateLabel`, patches labels state
- Add `removeLabel(labelId: string): Promise<void>` — calls `deleteLabel`, removes from labels state, and also removes the label ID from any task in `tasks` state that references it (mirroring the server-side cascade)

### Task 5: TaskCard Label Colors

Replace the placeholder gray dots in `TaskCard` with actual label colors by looking up each label ID against the labels stored in `BoardContext`.

**Deliverables**:
- `TaskCard` consumes `labels` from `useBoard()` (or receives them as a prop from the parent)
- For each ID in `task.labels`, find the matching `Label` object and render a colored dot using the label's `color` field as `backgroundColor`
- If a label ID is not found (e.g., stale data), skip rendering it
- Add a `title` attribute to each dot showing the label name on hover

### Task 6: LabelPicker Component

Build a dropdown component for attaching/detaching labels from a task, rendered inside `TaskDetailPanel`.

**Deliverables**:
- `LabelPicker` component (`packages/client/src/components/label-picker.tsx`): accepts `taskId`, the current `labels` array (IDs on the task), and an `onUpdate` callback
- Renders a "Labels" section with a dropdown/popover trigger button
- When open, displays all project labels (from `useBoard().labels`) as rows with a colored circle, name, and a checkbox indicating whether the label is currently attached to the task
- Toggling a checkbox calls `updateTask(taskId, { labels: updatedArray })` via `useBoard().updateTask` and invokes `onUpdate` with the result to sync the panel's local task state
- Include a "Manage labels" link at the bottom that opens the `LabelManager`
- Integrate into `TaskDetailPanel` in the metadata section alongside priority and due date

### Task 7: LabelManager Component

Build an inline management UI for creating, editing, and deleting project labels.

**Deliverables**:
- `LabelManager` component (`packages/client/src/components/label-manager.tsx`): renders as a popover or expandable section
- Displays existing labels as a list, each showing a color swatch, name, an edit button (opens inline edit mode with name text input and `<input type="color">`), and a delete button (with `ConfirmDialog` warning that the label will be removed from all tasks)
- A "New label" form at the top or bottom with a name input, `<input type="color">` defaulting to a random color, and a "Create" button
- Uses `addLabel`, `updateLabel`, and `removeLabel` from `useBoard()`
- Accessible from the `LabelPicker`'s "Manage labels" link and optionally from a button in the board header area

### Task 8: FilterBar Component

Build a filter bar rendered above the board columns, with controls for filtering tasks by label, priority, and due date range.

**Deliverables**:
- `FilterBar` component (`packages/client/src/components/filter-bar.tsx`): renders a horizontal bar with:
  - **Label filter**: a multi-select dropdown showing project labels (from `useBoard().labels`) as colored chips; selecting labels filters to tasks that have at least one of the selected labels
  - **Priority filter**: a multi-select with checkboxes for `low`, `medium`, `high`, `urgent`; filters to tasks matching any selected priority
  - **Due date filter**: two date inputs (from / to) that filter to tasks whose `dueDate` falls within the range; either bound can be left empty for open-ended ranges
  - A "Clear filters" button that resets all filters
- The component exposes its filter state via props or callback (an `onFilterChange` prop that emits the current filter values)
- Renders a count badge or summary (e.g., "Showing 5 of 12 tasks") when filters are active

### Task 9: Filter Integration and Drag-and-Drop Guard

Wire the `FilterBar` into `BoardView`, apply filters to the rendered task list, and disable intra-column reordering when filters are active.

**Deliverables**:
- Add filter state to `BoardView` (or use a `useFilteredTasks` hook): `{ labels: string[]; priorities: Priority[]; dueDateFrom: string | null; dueDateTo: string | null }`
- Render `FilterBar` above the column container in `BoardView`
- Derive a `filteredTasks` list by applying active filters to the full `tasks` array from `BoardContext`. Each column renders only tasks that pass all active filters.
- When any filter is active:
  - Disable `SortableContext` for tasks within columns (disable intra-column reorder) by either removing drag listeners from `SortableTaskItem` or setting the `disabled` prop on the sortable
  - Cross-column task drags (changing status) remain allowed — the move uses the task's current position and lets the server reindex
  - Display a subtle indicator (e.g., a small note or dimmed drag handles) so the user understands reordering is disabled while filtering
- When all filters are cleared, full drag-and-drop functionality is restored
- Ensure the "Add Column" UI and column reordering remain unaffected by task filters

### Task 10: End-to-End Verification and Polish

Verify that all Phase 4 features work together correctly, the board page is regression-free, and edge cases are handled.

**Deliverables**:
- Verify comment CRUD: add, display with author name and timestamp, edit inline, delete with confirmation
- Verify label CRUD: create with name and color, edit, delete (removed from all tasks)
- Verify label attach/detach: toggle in `LabelPicker` updates the task, colored dots appear on `TaskCard`
- Verify filters: each filter type works independently and in combination; clearing filters restores full board; drag-and-drop guard activates/deactivates correctly
- Verify no regressions: login, dashboard, project CRUD, column management, task drag-and-drop (without filters), task detail panel fields (title, description, priority, due date, delete) all still work
- Fix any TypeScript compilation errors, visual inconsistencies, or broken interactions discovered during verification

---

## Exit Criteria

1. `CommentList` renders comments for a task in chronological order, displaying author name and relative timestamp
2. New comments can be added via `CommentForm` and appear immediately in the list
3. Existing comments can be edited inline and deleted with confirmation
4. Labels can be created with a name and hex color via `LabelManager`
5. Labels can be edited (name and color) and deleted via `LabelManager`; deleting a label removes it from all tasks
6. `LabelPicker` shows all project labels with checkboxes and toggling a checkbox attaches/detaches the label from the task
7. `TaskCard` renders label dots in the actual label color (not placeholder gray)
8. `FilterBar` renders above the board with controls for label, priority, and due date range
9. Applying a label filter shows only tasks that have at least one of the selected labels
10. Applying a priority filter shows only tasks matching any selected priority
11. Applying a due date range filter shows only tasks with a due date within the range
12. Filters combine (AND logic across filter types); clearing all filters restores the full board
13. Intra-column task reordering is disabled when any filter is active; cross-column moves still work
14. All comment, label, and filter interactions persist correctly to the server via the existing REST API
15. No regressions in login, dashboard, project CRUD, column management, task drag-and-drop (unfiltered), or task detail panel editing

---

## Dependencies

1. **Phase 3 (Task Detail Panel)** — must be complete. The `TaskDetailPanel` component at `packages/client/src/components/task-detail-panel.tsx` is the integration point for comments and label picker.
2. **Phase 1 (Board & Columns)** — must be complete. `BoardView` at `packages/client/src/components/board-view.tsx` is where the filter bar and filtered task rendering are added.
3. **Phase 2 (Task Cards & Drag-and-Drop)** — must be complete. `TaskCard` at `packages/client/src/components/task-card.tsx` needs the label color update, and the drag-and-drop system needs the filter guard.
4. **BoardContext** at `packages/client/src/context/board-context.tsx` — must expose `board`, `tasks`, `updateTask`, and `setTasks` (all currently in place).
5. **Server API** — all comment and label endpoints must be implemented and operational (confirmed in Milestone 2: `comment.routes.ts`, `label.routes.ts`).
6. **Shared types** — `Comment`, `Label`, `Task`, `Priority`, and `ApiSuccessResponse` must be defined in `packages/shared/src/types/index.ts` (all currently in place).

---

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/shared/src/types/index.ts` | Modified | Add `PopulatedComment` interface |
| `packages/client/src/api/comments.ts` | Created | API client functions for comment CRUD |
| `packages/client/src/api/labels.ts` | Created | API client functions for label CRUD |
| `packages/client/src/context/board-context.tsx` | Modified | Add `labels` state and `addLabel`, `updateLabel`, `removeLabel` methods; extend `loadBoard` to fetch labels |
| `packages/client/src/components/comment-list.tsx` | Created | Chronological comment list with inline edit and delete |
| `packages/client/src/components/comment-form.tsx` | Created | Textarea + submit button for adding comments |
| `packages/client/src/components/label-picker.tsx` | Created | Checkbox dropdown for attaching/detaching labels from a task |
| `packages/client/src/components/label-manager.tsx` | Created | Inline CRUD interface for project labels |
| `packages/client/src/components/filter-bar.tsx` | Created | Filter controls for label, priority, and due date range |
| `packages/client/src/components/task-card.tsx` | Modified | Replace placeholder gray label dots with actual label colors from context |
| `packages/client/src/components/task-detail-panel.tsx` | Modified | Add `CommentList`, `CommentForm`, and `LabelPicker` sections |
| `packages/client/src/components/board-view.tsx` | Modified | Add `FilterBar`, filter state, filtered task rendering, and drag-and-drop guard |