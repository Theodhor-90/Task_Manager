## Objective

Implement the endpoint to rename an existing column on a board. Column rename does NOT cascade to task statuses.

## Deliverables

### Modify: `packages/server/src/routes/board.routes.ts`

Add to the `columnRoutes` plugin:

- **`PUT /api/boards/:boardId/columns/:columnId`**
  - Validate both `:boardId` and `:columnId` are valid ObjectIds — return 400 if either is invalid
  - Validate request body has a `name` field (non-empty string) — return 400 if missing/empty
  - Fetch the board and verify ownership via the associated project — return 404 if board not found
  - Find the column subdocument by `_id` within `board.columns` — return 404 if column not found
  - Update the column's `name` field only
  - Save the board
  - Return `{ data: updatedColumn }` with status 200

## Design Decision: No Status Cascade

Renaming a column updates ONLY the column name in the Board document. It does **not** update the `status` field of existing tasks that matched the old column name. This is a deliberate simplification — tasks retain their original status string after a rename. This behavior must be tested.

## Implementation Constraints

- Reuse the same body validation pattern (can reuse `isValidCreateColumnBody` since the shape is the same — `{ name: string }`)
- Column is found using `.find()` or `.id()` on the Mongoose subdocument array

## Dependencies

- Task t01 and t02 must be complete — route file and column routes plugin exist

## Verification

1. `PUT /api/boards/:boardId/columns/:columnId` with `{ "name": "New Name" }` renames the column and returns 200
2. Returns 400 when `name` is missing or empty
3. Returns 404 for non-existent board or column
4. Returns 400 for invalid ObjectId format
5. Returns 401 without a valid JWT
6. Tasks with the old column name as status are NOT updated (status remains unchanged)