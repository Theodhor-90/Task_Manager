# Task 6: LabelPicker Component

## Objective

Build a dropdown component for attaching/detaching labels from a task, rendered inside `TaskDetailPanel`.

## Deliverables

1. **New file: `packages/client/src/components/label-picker.tsx`** — `LabelPicker` component:
   - Accepts `taskId`, the current `labels` array (label IDs on the task), and an `onUpdate` callback.
   - Renders a "Labels" section with a dropdown/popover trigger button.
   - When open, displays all project labels (from `useBoard().labels`) as rows with: a colored circle, the label name, and a checkbox indicating whether the label is currently attached to the task.
   - Toggling a checkbox calls `updateTask(taskId, { labels: updatedArray })` via `useBoard().updateTask` and invokes `onUpdate` with the result to sync the panel's local task state.
   - Includes a "Manage labels" link at the bottom that opens the `LabelManager` (Task 7).

2. **Modified file: `packages/client/src/components/task-detail-panel.tsx`**:
   - Integrate `LabelPicker` in the metadata section alongside priority and due date.

## Implementation Details

- The checkbox toggle should immediately call the API to update the task's labels array (add or remove the toggled label ID).
- The dropdown/popover should close when clicking outside.
- The "Manage labels" link can set a state flag that renders `LabelManager` inline or as a nested popover.

## Dependencies

- **Task 4 (Labels in BoardContext)** — `labels` and `updateTask` must be available via `useBoard()`.
- Existing `TaskDetailPanel` at `packages/client/src/components/task-detail-panel.tsx`.
- **Task 7 (LabelManager)** — referenced by the "Manage labels" link, but the link can be wired later if Task 7 is not yet complete.

## Verification

- The label picker appears in the task detail panel.
- Opening the dropdown shows all project labels with checkboxes.
- Checked labels match those currently assigned to the task.
- Toggling a checkbox updates the task's labels via the API and the change reflects on the task card's colored dots.
- TypeScript compilation passes with no errors.