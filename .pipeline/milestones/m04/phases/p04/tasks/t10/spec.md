# Task 10: End-to-End Verification and Polish

## Objective

Verify that all Phase 4 features work together correctly, the board page is regression-free, and edge cases are handled.

## Deliverables

1. **Comment CRUD verification**:
   - Add a comment, verify it appears with author name and relative timestamp.
   - Edit a comment inline, verify the change persists.
   - Delete a comment with confirmation, verify it's removed.

2. **Label CRUD verification**:
   - Create a label with a name and color, verify it appears in LabelManager and LabelPicker.
   - Edit a label's name and color, verify the change reflects in TaskCard dots, LabelPicker, and FilterBar.
   - Delete a label, verify it's removed from all tasks and all UI components.

3. **Label attach/detach verification**:
   - Toggle labels in LabelPicker, verify the task's labels update.
   - Verify colored dots appear/disappear on TaskCard.

4. **Filter verification**:
   - Test each filter type independently (label, priority, due date).
   - Test filters in combination (AND logic across types).
   - Clear filters, verify full board is restored.
   - Verify drag-and-drop guard activates when filters are active and deactivates when cleared.

5. **Regression verification**:
   - Login flow works.
   - Dashboard displays projects, project CRUD works.
   - Column management (add, rename, delete, reorder) works.
   - Task drag-and-drop (without filters) works — both cross-column and intra-column.
   - Task detail panel fields (title, description with markdown preview, priority, due date, delete) all work.

6. **Polish**:
   - Fix any TypeScript compilation errors.
   - Fix visual inconsistencies or broken interactions discovered during verification.
   - Ensure consistent styling with the rest of the application.

## Dependencies

- **Tasks 1–9** — all prior tasks in this phase must be complete.

## Verification

- All Phase 4 exit criteria (from the phase spec) are met:
  1. CommentList renders comments in chronological order with author name and relative timestamp.
  2. New comments can be added and appear immediately.
  3. Comments can be edited inline and deleted with confirmation.
  4. Labels can be created with name and hex color.
  5. Labels can be edited and deleted; deleting removes from all tasks.
  6. LabelPicker shows all labels with checkboxes; toggling attaches/detaches.
  7. TaskCard renders label dots in actual colors.
  8. FilterBar renders with label, priority, and due date controls.
  9. Label filter shows only tasks with selected labels.
  10. Priority filter shows only tasks with selected priorities.
  11. Due date filter shows only tasks within the date range.
  12. Filters combine with AND logic; clearing restores full board.
  13. Intra-column reordering disabled when filtering; cross-column moves still work.
  14. All interactions persist to the server via REST API.
  15. No regressions in existing functionality.
- TypeScript compiles without errors.
- Application runs without console errors.