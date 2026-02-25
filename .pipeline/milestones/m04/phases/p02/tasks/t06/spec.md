## Objective

Verify the complete drag-and-drop flow end-to-end with mocked API calls, ensure no regressions from Phase 1, and apply visual polish for a smooth user experience.

## Deliverables

- Integration tests verifying the full drag-and-drop flow with mocked API:
  - Drag task within same column → position updated, API called with correct position
  - Drag task to different column → status and position updated, API called with correct status and position
  - API failure on move → board state reverts to snapshot, error message displayed
- Verify `AddTaskForm` creates tasks that appear in the correct column
- Verify column drag-and-drop still works correctly after the unified `DndContext` refactor
- Ensure no regressions in existing board-view and column tests from Phase 1
- Run full client test suite (`npm run test -w packages/client`) and fix any failures
- Visual polish:
  - Drag overlay looks correct (proper sizing, shadow, opacity)
  - Smooth transitions during drag operations
  - No layout shift when dragging starts or ends
  - Task cards have consistent spacing and alignment

## Key Implementation Details

- Mock API calls using the existing test patterns from Phase 1
- Optimistic rollback testing: simulate a rejected API promise and verify state restoration
- Regression testing: all Phase 1 column tests must continue to pass
- The full client test suite should pass with zero failures

## Files

| File | Action |
|------|--------|
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** (add integration test cases) |
| Various component files | **Modify** (visual polish adjustments) |

## Dependencies

- **t01–t05** (all prior tasks in this phase must be complete)

## Verification Criteria

1. Integration tests pass for: same-column reorder, cross-column move, API failure rollback
2. `AddTaskForm` integration test passes: task appears in correct column after creation
3. Column drag-and-drop tests pass (no regression from Phase 1)
4. Full client test suite passes: `npm run test -w packages/client` exits with 0 failures
5. No regressions in login, dashboard, project CRUD, or board/column management
6. Drag overlay renders correctly during drag operations
7. No visible layout shift or jank during drag-and-drop interactions