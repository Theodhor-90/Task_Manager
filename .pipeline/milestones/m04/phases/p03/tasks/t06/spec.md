# Task 6: Priority Selector and Due Date Picker

## Objective
Add priority and due date editing controls to the `TaskDetailPanel` so users can change these fields with changes persisting immediately to the server.

## Deliverables

### PrioritySelector
- Dropdown (`<select>` or custom) showing "Low", "Medium", "High", "Urgent" with color-coded indicators matching the badge colors from `TaskCard`
- Current priority pre-selected
- On change, immediately calls `updateTask({ priority })` from board context

### DueDatePicker
- Native `<input type="date">` showing the current due date (or empty)
- A clear button (X) to remove the due date (sends `dueDate: null`)
- On change, immediately calls `updateTask({ dueDate })` from board context
- Displays the date in a human-readable format alongside or above the input

### Layout
- Both render in a sidebar-style metadata section within the panel (e.g., a right column or a horizontal row beneath the description)

### Tests
- Priority changes trigger `updateTask`
- Date changes trigger `updateTask`
- Clear button sends `null` for due date

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/src/components/task-detail-panel.tsx` | Modify — add PrioritySelector and DueDatePicker sections |
| `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | Modify — add priority and due date tests |

## Implementation Details
- Priority options: `low`, `medium`, `high`, `urgent` — matching the shared `Priority` enum/constants
- Color indicators should match the colors used in `TaskCard` priority badges for visual consistency
- DueDatePicker should format the date for display (e.g., "Feb 25, 2026") while using ISO format for the native input value
- Both components can be inline within `task-detail-panel.tsx` or extracted as small dedicated components in the same file — keep it simple
- Changes are saved immediately on selection/change (no save button needed)
- Use `updateTask` from `BoardContext` (Task 3) which patches the task in local state and persists to API

## Dependencies
- Task 3 (`updateTask` in Board Context)
- Task 4 (`TaskDetailPanel` component exists)

## Verification
1. Priority dropdown shows all four options with correct styling
2. Changing priority immediately persists to the API and updates the task card badge on the board
3. Date picker shows current due date or is empty
4. Changing the date immediately persists to the API and updates the task card on the board
5. Clear button removes the due date (sends null)
6. Unit tests pass