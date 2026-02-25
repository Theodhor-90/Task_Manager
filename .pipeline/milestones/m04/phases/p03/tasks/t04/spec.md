# Task 4: `TaskDetailPanel` Component — Layout and Title Editing

## Objective
Create the foundational task detail side panel component that slides in from the right when a task card is clicked, with the ability to view and inline-edit the task title.

## Deliverables
- New file `packages/client/src/components/task-detail-panel.tsx`
- New file `packages/client/src/components/__tests__/task-detail-panel.test.tsx`
- Panel component with props: `{ taskId: string; onClose: () => void }`

### Panel Layout
- Rendered as a fixed overlay via `createPortal` (same pattern as the existing `Modal` component)
- Semi-transparent backdrop (`bg-black/20`) covering the full viewport; clicking it calls `onClose`
- Panel container: fixed, right-aligned, full height, `max-w-2xl`, white background, `shadow-xl`, with a slide-in appearance
- Close button (X icon) in the panel header
- Escape key closes the panel
- Prevents body scroll while open

### Data Loading
- On mount, calls `fetchTask(taskId)` to load the full task
- Shows `LoadingSpinner` while loading
- Shows `ErrorMessage` on failure

### Title Editing
- Displays the task title as an inline-editable `<h2>`
- Click to enter edit mode (text input, pre-filled with current title)
- Enter or blur to save; calls `updateTask` from board context with `{ title }`
- Escape to cancel editing, reverting to the previous value

### Status Display
- Displays the task's current status (column name) as a read-only label beneath the title

## Files to Create/Modify
| File | Action |
|------|--------|
| `packages/client/src/components/task-detail-panel.tsx` | Create |
| `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | Create |

## Implementation Details
- Use `createPortal` to render to `document.body` (follow `Modal` component pattern)
- Use `useEffect` to add/remove Escape key listener and manage body overflow
- Fetch task data via `fetchTask` from `api/tasks.ts` (Task 2)
- Use `updateTask` from `BoardContext` (Task 3) for saving edits
- Reuse existing shared components: `LoadingSpinner`, `ErrorMessage`
- Title editing follows the same inline-edit pattern as column rename in the board

## Dependencies
- Task 2 (`fetchTask` API function)
- Task 3 (`updateTask` in Board Context)

## Verification
1. Panel renders as a right-side slide-over with backdrop
2. Clicking backdrop, close button, or pressing Escape closes the panel
3. Task data loads and title displays
4. Clicking title enables editing; Enter/blur saves; Escape cancels
5. Title changes persist to the API and update on the board
6. Status label displays the current column name
7. Unit tests pass