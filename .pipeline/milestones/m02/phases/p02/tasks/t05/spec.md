## Objective

Implement the endpoint to reorder columns on a board by accepting an ordered array of column IDs.

## Deliverables

### Modify: `packages/server/src/routes/board.routes.ts`

Add to the `columnRoutes` plugin:

- **`PUT /api/boards/:boardId/columns/reorder`**
  - Validate `:boardId` is a valid ObjectId — return 400 if invalid
  - Validate request body has a `columnIds` field that is an array of strings — return 400 if missing/invalid
  - Fetch the board and verify ownership — return 404 if not found
  - Validate that `columnIds` contains **exactly** the same set of IDs as existing columns:
    - Same length as `board.columns`
    - No duplicates in the array
    - Every ID in `columnIds` matches an existing column `_id`
    - Return 400 with descriptive error if validation fails
  - Update each column's `position` to match its index in the `columnIds` array
  - Save the board
  - Return `{ data: board }` with status 200 (the board with reordered columns)

### Route Registration Order

**Critical**: The `/reorder` route must be registered BEFORE any `/:columnId` routes in the plugin to prevent Fastify from matching "reorder" as a columnId parameter. Ensure this in the route definition order within `board.routes.ts`.

## Implementation Constraints

- Use an inline type guard `isValidReorderBody` to validate `{ columnIds: string[] }`
- Convert column `_id` subdocument IDs to strings for comparison with the input array
- Position assignment: `columnIds[0]` gets position 0, `columnIds[1]` gets position 1, etc.

## Dependencies

- Tasks t01–t04 must be complete — all other column endpoints exist

## Verification

1. Reordering columns with a valid, complete set of column IDs updates all positions correctly and returns 200
2. Returns 400 when `columnIds` is missing or not an array
3. Returns 400 when `columnIds` has extra IDs not on the board
4. Returns 400 when `columnIds` is missing IDs that exist on the board
5. Returns 400 when `columnIds` contains duplicate IDs
6. Returns 404 for a non-existent board
7. Returns 401 without a valid JWT
8. A subsequent `GET /api/projects/:projectId/board` reflects the new column order