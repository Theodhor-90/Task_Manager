# Task 5: Implement task move endpoint

## Objective

Implement `PUT /api/tasks/:id/move` to support both cross-column moves (changing status) and within-column reorders (changing position), with full position reindexing in affected columns.

## Deliverables

### Handler: `PUT /:id/move` in `taskRoutes` plugin

Implementation in `packages/server/src/routes/task.routes.ts`:

1. **Validate** task ID is a valid ObjectId (400 if not)
2. **Validate** request body via `isValidMoveTaskBody()` — `position` required as non-negative integer, `status` optional (400 if invalid)
3. **Look up the task** (404 if not found)
4. **Verify project ownership** via board → project
5. **Look up the board** to validate target `status` against column names
6. **Determine move type**:
   - If `status` is omitted or matches the task's current `status` → **within-column reorder**
   - If `status` differs from current → **cross-column move**

### Cross-column move logic:

1. Validate target `status` matches a board column name (400 if not)
2. Remove task from source column:
   - Delete the task from position consideration in source column
   - Reindex remaining tasks in source column (contiguous 0-based positions)
3. Insert into destination column:
   - Count tasks in destination column
   - **Clamp** target position to `[0, destinationCount]` (inclusive, allowing append to end)
   - Shift tasks at `position >= target` up by one
   - Set task's `status` to the new column name and `position` to the target
4. Save the task

### Within-column reorder logic:

1. Conceptually remove the task from its current position
2. Count remaining tasks in the column
3. **Clamp** target position to `[0, remainingCount]`
4. Insert at the new position, shifting other tasks as needed
5. Update the task's `position` and save

### Alternative implementation approach (simpler):

For both move types, a simpler approach that avoids complex shifting:
1. Remove the task from its current column (reindex source)
2. Get all tasks in the destination column, sorted by position
3. Splice the task into the target position in the array
4. Bulk-update positions for all tasks in the destination column based on array index
5. Save the moved task with its new status and position

### Return

- `200` with `{ data: updatedTask }`

### Error responses

- `400` — invalid body (missing position, non-integer position, negative position, invalid status not matching any column)
- `401` — missing/invalid auth
- `404` — task not found

## Key Constraints

- Position must be clamped to valid range — never allow negative or beyond end
- Both source and destination columns must have contiguous 0-based positions after the move
- The move endpoint handles BOTH cross-column and within-column scenarios
- Status validation uses the board's actual column names, not hardcoded strings

## Dependencies

- **Task 1** — route file, validation helpers
- **Task 2** — task creation (for setting up test data)
- **Task 4** — delete/reindex pattern can be referenced
- Existing models: `TaskModel`, `BoardModel`, `ProjectModel`

## Verification

1. Moving a task from "To Do" to "In Progress" updates status and position correctly
2. Source column positions are reindexed (contiguous 0-based) after move out
3. Destination column positions are correct after move in
4. Within-column reorder updates position correctly without changing status
5. Moving to position 0 places the task at the beginning
6. Moving to a position beyond the end clamps to the last position
7. Returns 400 for invalid status (non-existent column name)
8. Returns 400 for missing position
9. Returns 404 for non-existent task