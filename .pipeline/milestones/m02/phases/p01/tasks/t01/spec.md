## Objective

Create the project route handler file and implement `POST /api/projects` (with board auto-creation) and `GET /api/projects` (list all), then register the routes in `app.ts`.

## Deliverables

### 1. Create `packages/server/src/routes/project.routes.ts`

- Export a `FastifyPluginAsync` named `projectRoutes`, following the pattern in `auth.routes.ts`
- Implement `POST /` handler:
  - Validate `request.body` has `name` (string, non-empty); `description` is optional (string, defaults to `""`)
  - Return `400 { error: "..." }` if validation fails
  - Create a `ProjectModel` document: `{ name, description, owner: request.user.id }`
  - Create a `BoardModel` document: `{ project: project._id, columns: DEFAULT_COLUMNS.map((name, i) => ({ name, position: i })) }` — import `DEFAULT_COLUMNS` from `@taskboard/shared`
  - If board creation fails, delete the just-created project and return `500 { error: "Failed to create project" }`
  - On success, return `201 { data: project.toJSON() }`
- Implement `GET /` handler:
  - Query `ProjectModel.find({ owner: request.user.id }).sort({ createdAt: -1 })`
  - Return `200 { data: projects }`

### 2. Modify `packages/server/src/app.ts`

- Import `projectRoutes` from `./routes/project.routes.js`
- Register with `app.register(projectRoutes, { prefix: "/api/projects" })`
- Place registration after auth routes and middleware

## Key Constraints

- Use inline type-guard functions for request validation (matching `auth.routes.ts` pattern)
- All endpoints are protected by JWT auth middleware (the existing `onRequest` hook on the Fastify instance handles this)
- Response envelope: `{ data: T }` for success, `{ error: string }` for errors
- Import models from `../models/index.js`: `ProjectModel`, `BoardModel`
- `DEFAULT_COLUMNS` comes from `@taskboard/shared` — it's `["To Do", "In Progress", "In Review", "Done"]`

## Files

| File | Action |
|------|--------|
| `packages/server/src/routes/project.routes.ts` | **Create** |
| `packages/server/src/app.ts` | **Modify** (add import + register) |

## Dependencies

- None (first task in phase)

## Verification

1. Server compiles without errors (`npm run build` from server package)
2. Health endpoint (`GET /api/health`) still works
3. `POST /api/projects` with a valid JWT and `{ "name": "Test" }` returns 201 with project data
4. `POST /api/projects` also creates a Board document with 4 default columns
5. `GET /api/projects` with a valid JWT returns the created project(s)
6. Requests without a JWT token return 401