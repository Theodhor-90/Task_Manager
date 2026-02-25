## Objective

Create an inline form component at the bottom of each column for quick task creation — a minimal UX where the user clicks a button, types a title, and presses Enter to create a task.

## Deliverables

- New file `packages/client/src/components/add-task-form.tsx`
- Props: `{ columnName: string }` (determines the `status` for the created task)
- UI flow:
  - Initially shows a `+ Add task` button
  - Clicking reveals an input field (auto-focused)
  - **Enter**: calls `createTask(columnName, title)` from board context, clears input, keeps form open for rapid entry
  - **Escape**: hides input, returns to button state
  - **Empty submit**: ignored (no API call)
- Error handling: if creation fails, show a brief inline error message; keep the input text so the user can retry
- Unit tests in `packages/client/src/components/__tests__/add-task-form.test.tsx`

## Key Implementation Details

- Uses `createTask` from `BoardContext` (added in t02)
- The `columnName` prop maps to the `status` field when creating the task
- Auto-focus the input when it appears for immediate typing
- Keep form open after successful creation for rapid sequential task entry

## Files

| File | Action |
|------|--------|
| `packages/client/src/components/add-task-form.tsx` | **Create** |
| `packages/client/src/components/__tests__/add-task-form.test.tsx` | **Create** |

## Dependencies

- **t02** (Board Context extensions) — needs `createTask` method from context

## Verification Criteria

1. Initially renders a `+ Add task` button
2. Clicking the button reveals an auto-focused text input
3. Pressing Enter with text calls `createTask` with the correct column name and title
4. Input clears after successful creation but form stays open
5. Pressing Escape hides the input and shows the button again
6. Empty submissions are ignored
7. API errors display an inline error message and preserve the input text
8. Unit tests pass covering: button rendering, toggle to input, Enter submission, Escape cancellation, empty submit handling