## Objective

Create a compact, presentation-focused `TaskCard` component that displays key task information at a glance — title, priority badge, label color dots, and due date.

## Deliverables

- New file `packages/client/src/components/task-card.tsx`
- Props: `{ task: Task; onClick?: (taskId: string) => void }`
- Renders:
  - **Task title**: truncated if long
  - **Priority badge**: small colored pill with priority text using this color map:
    - `low` → gray (`bg-gray-200 text-gray-700`)
    - `medium` → blue (`bg-blue-100 text-blue-700`)
    - `high` → orange (`bg-orange-100 text-orange-700`)
    - `urgent` → red (`bg-red-100 text-red-700`)
  - **Label color dots**: small colored circles if `task.labels.length > 0` (placeholder dots in this phase — full label colors come in Phase 4)
  - **Due date**: formatted as "MMM D" (e.g., "Feb 25") if present; styled red if overdue
- Clicking the card calls `onClick` (used by Phase 3 for opening detail panel; safe to be undefined now)
- Styling: white background, rounded, shadow-sm, padding — consistent with existing UI
- Unit tests in `packages/client/src/components/__tests__/task-card.test.tsx`

## Key Implementation Details

- The priority color map can be defined as a constant within the component file — no separate constants file needed
- The `Task` type is imported from `@taskboard/shared`
- Label dots are visual placeholders for now; full label color rendering will come in Phase 4 when label data is fetched

## Files

| File | Action |
|------|--------|
| `packages/client/src/components/task-card.tsx` | **Create** |
| `packages/client/src/components/__tests__/task-card.test.tsx` | **Create** |

## Dependencies

- None within this phase (can be developed in parallel with t01 and t02, only needs shared types)

## Verification Criteria

1. Component renders task title, priority badge with correct color, and due date
2. Due date displays in "MMM D" format and turns red when overdue
3. Label dots render when `task.labels` is non-empty
4. `onClick` fires with the task ID when the card is clicked
5. Component handles missing optional fields gracefully (no due date, no labels, no onClick)
6. Unit tests pass covering: title rendering, priority badge colors, due date formatting, overdue styling, click handler, label dots