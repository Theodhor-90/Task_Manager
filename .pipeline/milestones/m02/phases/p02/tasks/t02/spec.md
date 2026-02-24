## Objective

Implement the endpoint to add a new column to a board, appending it at the end of the columns array.

## Deliverables

### Modify: `packages/server/src/routes/board.routes.ts`

Add a `columnRoutes` FastifyPluginAsync export that handles:

- **`POST /api/boards/:boardId/columns`**
  - Validate `:boardId` is a valid ObjectId — return 400 if invalid
  - Validate request body has a `name` field that is a non-empty string — return 400 with `{ error: "Column name is required" }` if missing/empty
  - Fetch the board by `_id` and verify ownership by looking up the associated project (`ProjectModel.findOne({ _id: board.project, owner: request.user.id })`) — return 404 if board not found, 404 if project ownership fails
  - Calculate position as `board.columns.length` (append to end)
  - Push a new column subdocument `{ name, position }` to `board.columns`
  - Save the board
  - Return `{ data: newColumn }` with status 201 (the newly created column subdocument)

### Modify: `packages/server/src/app.ts`

- Import `columnRoutes` from `./routes/board.routes.js`
- Register under `/api/boards` prefix

## Implementation Constraints

- Use an inline type guard `isValidCreateColumnBody` following the pattern from `project.routes.ts`
- Board ownership is verified indirectly: fetch board → lookup project by `board.project` → check `owner === request.user.id`
- The new column subdocument gets an auto-generated `_id` from Mongoose

## Dependencies

- Task t01 must be complete — `board.routes.ts` file and route registration in `app.ts` exist

## Verification

1. `POST /api/boards/:boardId/columns` with `{ "name": "QA" }` creates a column at position 4 (after the 4 defaults) and returns 201
2. Returns 400 when `name` is missing or empty
3. Returns 404 for a non-existent boardId
4. Returns 401 without a valid JWT
5. The new column appears in a subsequent `GET /api/projects/:projectId/board` response