Implemented Task 5 exactly per the locked plan by replacing the move stub with a full `PUT /:id/move` handler in [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts:309).

What was implemented:
- Added task ID validation and move body validation (`position` required, non-negative integer).
- Added task lookup, board lookup, and ownership verification via project owner.
- Added target status resolution (`status ?? current status`) and board-column status validation.
- Implemented the 4-phase remove-then-insert algorithm:
  - Reindex source column after removing moved task (`_id: { $ne: id }`).
  - Compute destination count and clamp position.
  - Shift destination tasks to make room (cross-column and within-column logic).
  - Update moved task with final `status` and `position`.
- Added all required error responses/messages from the plan.

Verification commands run (all passed):
- `cd packages/server && npx tsc --noEmit`
- `cd packages/server && npm test` (146 tests passed)
- `npm run build --workspace=packages/server`