## Objective

Implement the endpoint to delete a column from a board, with a guard that blocks deletion if any tasks exist with a status matching the column's name.

## Deliverables

### Modify: `packages/server/src/routes/board.routes.ts`

Add to the `columnRoutes` plugin:

- **`DELETE /api/boards/:boardId/columns/:columnId`**
  - Validate both `:boardId` and `:columnId` are valid ObjectIds — return 400 if invalid
  - Fetch the board and verify ownership via associated project — return 404 if not found
  - Find the column subdocument by `_id` — return 404 if column not found
  - Query `TaskModel.countDocuments({ board: boardId, status: column.name })` to check for existing tasks
  - If count > 0, return 400 with `{ error: "Cannot delete column that contains tasks" }`
  - If count === 0, remove the column subdocument from `board.columns`
  - **Reindex remaining column positions**: iterate through remaining columns and set position to 0-based contiguous index
  - Save the board
  - Return `{ data: { message: "Column deleted" } }` with status 200

## Implementation Constraints

- The task guard checks tasks by `status` string matching the column's `name`, not by column ObjectId
- After removing a column, remaining columns must have contiguous positions (0, 1, 2, ...) to avoid gaps
- Import `TaskModel` from `../models/index.js`

## Dependencies

- Tasks t01–t03 must be complete — route file and column routes plugin exist with prior endpoints

## Verification

1. Deleting a column with no tasks succeeds and returns 200
2. Deleting a column that has tasks with matching status returns 400 with appropriate error message
3. After deletion, remaining column positions are reindexed (contiguous 0-based)
4. Returns 404 for non-existent board or column
5. Returns 400 for invalid ObjectId format
6. Returns 401 without a valid JWT