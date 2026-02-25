# Task 8: Wire TaskCard Click to Open Panel in BoardView

## Objective
Connect the task detail panel to the board by wiring up task card click events to open the panel, with a guard to prevent accidental opens after drag-and-drop operations.

## Deliverables
- Update `packages/client/src/components/board-view.tsx`:
  - Add local state `selectedTaskId: string | null` (initially `null`)
  - Define `handleTaskClick(taskId: string)` that sets `selectedTaskId` — but only if a drag did not just finish
  - Implement a drag guard using a ref `hasDragged` set in `onDragEnd` and cleared after a short timeout or in a `requestAnimationFrame`
  - Pass `onClick={handleTaskClick}` to each `TaskCard` component inside the sortable wrapper
  - When `selectedTaskId` is not null, render `<TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />`
- Update `packages/client/src/components/__tests__/board-view.test.tsx`:
  - Clicking a task card sets selected state and renders the panel
  - Panel close resets state
  - Drag-and-drop does not trigger panel open

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/src/components/board-view.tsx` | Modify — add selectedTaskId state, click handler with drag guard, render TaskDetailPanel |
| `packages/client/src/components/__tests__/board-view.test.tsx` | Modify — add tests for click-to-open, drag guard, and panel close |

## Implementation Details
- The drag guard prevents the `onClick` on `TaskCard` from firing after a drag operation completes, since mouse events propagate after `onDragEnd`
- Use a ref (`hasDraggedRef`) set to `true` in the existing `onDragEnd` handler, cleared via `requestAnimationFrame` or `setTimeout(0)` — this ensures the click event that fires immediately after drag end is suppressed
- `handleTaskClick` checks `hasDraggedRef.current` — if true, skip opening the panel
- The `TaskCard` component should already accept an `onClick` prop (or needs to be updated to accept one)
- Import `TaskDetailPanel` from `./task-detail-panel`
- The panel receives the `selectedTaskId` and an `onClose` callback that sets `selectedTaskId` back to `null`

## Dependencies
- Task 4 (`TaskDetailPanel` component)
- Depends on existing `BoardView` and `TaskCard` from Phase 2

## Verification
1. Clicking a task card on the board opens the task detail panel
2. The panel shows the correct task data for the clicked card
3. Closing the panel (backdrop, X button, or Escape) returns to the board with no panel
4. Performing a drag-and-drop operation does NOT accidentally open the panel
5. After the drag guard clears, clicking a task card works normally again
6. Updated board-view tests pass
7. No regressions in existing drag-and-drop functionality
8. All client tests pass: `npm run test -w packages/client`