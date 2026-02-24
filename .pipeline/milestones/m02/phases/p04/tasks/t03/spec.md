# Task 3: Register routes in app.ts

## Objective

Wire the new comment and label route plugins into the Fastify application factory so all eight new endpoints are accessible.

## Deliverables

- Modify `packages/server/src/app.ts` to:
  - Import `taskCommentRoutes` and `commentRoutes` from `./routes/comment.routes.js`
  - Import `projectLabelRoutes` and `labelRoutes` from `./routes/label.routes.js`
  - Register the four plugins with correct prefixes:
    - `await app.register(taskCommentRoutes, { prefix: "/api/tasks" })`
    - `await app.register(commentRoutes, { prefix: "/api/comments" })`
    - `await app.register(projectLabelRoutes, { prefix: "/api/projects" })`
    - `await app.register(labelRoutes, { prefix: "/api/labels" })`

## Implementation Details

- Follow the existing registration pattern in `app.ts` where routes are imported and registered with `app.register()` and a prefix option.
- Note the `.js` extension in imports (TypeScript ESM module resolution — the project uses ES modules and the compiled output uses `.js` extensions).
- Place the new registrations after the existing task route registrations, maintaining logical ordering.
- The `projectLabelRoutes` plugin registers under `/api/projects` which is the same prefix as the existing `projectRoutes`. Fastify supports multiple plugins under the same prefix — they will be composed correctly.

## Files

| File | Action |
|------|--------|
| `packages/server/src/app.ts` | Modify |

## Dependencies

- **Task 1** (comment.routes.ts) and **Task 2** (label.routes.ts) must be completed first so the imported modules exist

## Verification

1. TypeScript compiles without errors (`npx tsc --noEmit`)
2. The server starts without errors (`npm run dev` from server package)
3. All eight new endpoints respond (not 404 from Fastify's default handler):
   - `GET /api/tasks/:taskId/comments`
   - `POST /api/tasks/:taskId/comments`
   - `PUT /api/comments/:id`
   - `DELETE /api/comments/:id`
   - `GET /api/projects/:projectId/labels`
   - `POST /api/projects/:projectId/labels`
   - `PUT /api/labels/:id`
   - `DELETE /api/labels/:id`
4. Existing routes continue to work (no regressions from registration changes)