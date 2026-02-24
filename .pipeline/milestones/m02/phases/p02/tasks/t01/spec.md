## Objective

Create the board retrieval endpoint that fetches a board (with its columns) for a given project, and register it in the Fastify app.

## Deliverables

### New file: `packages/server/src/routes/board.routes.ts`

Create a new route file exporting a `boardRoutes` FastifyPluginAsync that handles:

- **`GET /api/projects/:projectId/board`**
  - Validate `:projectId` is a valid ObjectId using `mongoose.Types.ObjectId.isValid()` — return 400 if invalid
  - Query `ProjectModel.findOne({ _id: projectId, owner: request.user.id })` to verify existence and ownership — return 404 if not found
  - Fetch the board with `BoardModel.findOne({ project: projectId })`— return 404 if not found
  - Return columns sorted by `position` ascending
  - Response: `{ data: board }` with status 200

### Modify: `packages/server/src/app.ts`

- Import `boardRoutes` from `./routes/board.routes.js`
- Register the plugin. Since this route lives under `/api/projects/:projectId/board`, it needs to be registered so the route resolves correctly under the `/api/projects` prefix (either as a separate registration or nested within)

## Implementation Constraints

- Follow the same code patterns as `project.routes.ts`: inline type guard functions, TypeScript type assertions cast through `unknown`, `FastifyPluginAsync` export
- Use the same validation helper pattern (`isValidObjectId`) — can be extracted or duplicated
- All routes require JWT authentication (enforced by the existing `authMiddleware` registered in `app.ts`)
- Response envelope: `{ data: T }` for success, `{ error: string }` for errors

## Dependencies

- Phase 1 (Projects API) must be complete — project creation auto-creates a board with default columns
- Existing models: `ProjectModel`, `BoardModel` from `../models/index.js`

## Verification

1. `GET /api/projects/:projectId/board` with a valid project returns 200 with the board containing columns sorted by position
2. Returns 404 for a non-existent project
3. Returns 400 for an invalid ObjectId format
4. Returns 401 without a valid JWT
5. Existing project route tests still pass
6. Server starts without errors (`npm run dev`)