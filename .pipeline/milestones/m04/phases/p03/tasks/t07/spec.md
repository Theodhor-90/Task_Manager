# Task 7: Delete Task with Confirmation

## Objective
Add a delete button to the `TaskDetailPanel` that, after confirmation, removes the task from the server and the board.

## Deliverables
- A "Delete task" button in the panel, styled as a destructive action (red text or outline)
- Clicking the button opens the existing `ConfirmDialog` with message: "Are you sure you want to delete this task? This action cannot be undone."
- On confirm:
  - Calls `removeTask(taskId)` from board context
  - On success, calls `onClose` to close the panel
  - On failure, displays error in the panel
- Unit tests: delete button opens confirmation, confirm triggers deletion, panel closes on success

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/src/components/task-detail-panel.tsx` | Modify — add delete button and confirm dialog integration |
| `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | Modify — add delete tests |

## Implementation Details
- Use the existing shared `ConfirmDialog` component (built in Milestone 3)
- The delete button should be visually distinct as a destructive action — red text/outline, positioned at the bottom of the panel or in the panel footer
- Use `removeTask` from `BoardContext` (Task 3) which calls `DELETE /api/tasks/:id` and removes the task from local state
- After successful deletion, call `onClose()` to close the panel
- Handle API errors gracefully — show an error message in the panel if deletion fails
- Manage `showConfirmDialog` boolean state locally in the panel

## Dependencies
- Task 3 (`removeTask` in Board Context)
- Task 4 (`TaskDetailPanel` component exists)

## Verification
1. Delete button is visible in the panel with destructive styling
2. Clicking it opens the `ConfirmDialog` with the correct message
3. Confirming deletion calls the API and removes the task from the board
4. The panel closes after successful deletion
5. Canceling the dialog does not delete the task
6. API errors are displayed in the panel
7. Unit tests pass