Now I have all the context I need. Let me produce the implementation plan.

# Task 3: Register Routes in app.ts — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/app.ts` | Modify | Import and register comment and label route plugins with correct prefixes |

## 2. Dependencies

- **Task 1** (`comment.routes.ts`) must be completed — provides `taskCommentRoutes` and `commentRoutes` exports
- **Task 2** (`label.routes.ts`) must be completed — provides `projectLabelRoutes` and `labelRoutes` exports
- Both files are already present in the codebase and verified

## 3. Implementation Details

### 3.1 File: `packages/server/src/app.ts`

#### Current State (lines 1–32)

The file currently imports and registers these route modules:
- `authRoutes` → prefix `/api/auth`
- `projectRoutes` → prefix `/api/projects`
- `boardRoutes` → prefix `/api/projects`
- `columnRoutes` → prefix `/api/boards`
- `boardTaskRoutes` → prefix `/api/boards`
- `taskRoutes` → prefix `/api/tasks`

#### Change 1: Add Import Statements

After the existing import on line 9:
```typescript
import { boardTaskRoutes, taskRoutes } from "./routes/task.routes.js";
```

Add two new import lines:
```typescript
import { taskCommentRoutes, commentRoutes } from "./routes/comment.routes.js";
import { projectLabelRoutes, labelRoutes } from "./routes/label.routes.js";
```

**Notes:**
- The `.js` extension is required — the project uses TypeScript ESM module resolution where compiled output uses `.js` extensions. This matches every other import in the file (e.g., `./routes/task.routes.js`, `./routes/board.routes.js`).
- Named imports match the exact exports from the respective files.

#### Change 2: Register Route Plugins

After the existing registrations on lines 28–29:
```typescript
  await app.register(boardTaskRoutes, { prefix: "/api/boards" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
```

Add four new registration lines:
```typescript
  await app.register(taskCommentRoutes, { prefix: "/api/tasks" });
  await app.register(commentRoutes, { prefix: "/api/comments" });
  await app.register(projectLabelRoutes, { prefix: "/api/projects" });
  await app.register(labelRoutes, { prefix: "/api/labels" });
```

**Notes:**
- `taskCommentRoutes` uses prefix `/api/tasks` — this is the **same prefix** as the existing `taskRoutes`. Fastify supports multiple plugins under the same prefix; each plugin gets its own encapsulated scope, so routes from `taskRoutes` (e.g., `GET /:id`, `PUT /:id`, `DELETE /:id`, `PUT /:id/move`) and `taskCommentRoutes` (e.g., `GET /:taskId/comments`, `POST /:taskId/comments`) won't conflict because their path patterns are different.
- `projectLabelRoutes` uses prefix `/api/projects` — this is the **same prefix** as the existing `projectRoutes` and `boardRoutes`. Again, Fastify handles this correctly — the label routes register `GET /:projectId/labels` and `POST /:projectId/labels`, which don't conflict with existing project or board routes under the same prefix.
- `commentRoutes` gets its own unique prefix `/api/comments`.
- `labelRoutes` gets its own unique prefix `/api/labels`.
- The placement order (comment routes first, then label routes) follows the logical grouping: comment endpoints are related to tasks (registered just after task routes), and label endpoints are related to projects (registered after comments).

#### Final File State

```typescript
import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { boardRoutes, columnRoutes } from "./routes/board.routes.js";
import { projectRoutes } from "./routes/project.routes.js";
import { boardTaskRoutes, taskRoutes } from "./routes/task.routes.js";
import { taskCommentRoutes, commentRoutes } from "./routes/comment.routes.js";
import { projectLabelRoutes, labelRoutes } from "./routes/label.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(jwtPlugin);
  await app.register(corsPlugin);
  await app.register(authMiddleware);

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(boardRoutes, { prefix: "/api/projects" });
  await app.register(columnRoutes, { prefix: "/api/boards" });
  await app.register(boardTaskRoutes, { prefix: "/api/boards" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(taskCommentRoutes, { prefix: "/api/tasks" });
  await app.register(commentRoutes, { prefix: "/api/comments" });
  await app.register(projectLabelRoutes, { prefix: "/api/projects" });
  await app.register(labelRoutes, { prefix: "/api/labels" });

  return app;
}
```

## 4. Contracts

This task does not introduce new API contracts — it only wires existing route handlers into the application. The eight endpoints that become accessible after this change are:

| Method | Full Path | Source Plugin |
|--------|-----------|---------------|
| GET | `/api/tasks/:taskId/comments` | `taskCommentRoutes` |
| POST | `/api/tasks/:taskId/comments` | `taskCommentRoutes` |
| PUT | `/api/comments/:id` | `commentRoutes` |
| DELETE | `/api/comments/:id` | `commentRoutes` |
| GET | `/api/projects/:projectId/labels` | `projectLabelRoutes` |
| POST | `/api/projects/:projectId/labels` | `projectLabelRoutes` |
| PUT | `/api/labels/:id` | `labelRoutes` |
| DELETE | `/api/labels/:id` | `labelRoutes` |

## 5. Test Plan

No new test files are created in this task. The verification relies on:

1. **TypeScript compilation** — confirms the imports resolve correctly and the module signatures match `FastifyPluginAsync`
2. **Existing test suite** — the `app.test.ts` and all existing route tests must continue to pass, confirming no regressions from the new registrations
3. **Endpoint accessibility** — the new endpoints will be fully testable once Task 4 (comment tests) and Task 5 (label tests) are implemented. However, we can verify basic accessibility by confirming the endpoints don't return Fastify's default 404 (which would indicate the routes weren't registered)

## 6. Implementation Order

1. Add the two import statements after line 9 of `app.ts`
2. Add the four `app.register()` calls after line 29 of `app.ts`
3. Run TypeScript compilation to verify
4. Run existing tests to verify no regressions

## 7. Verification Commands

```bash
# Verify TypeScript compiles without errors
cd packages/server && npx tsc --noEmit

# Run existing tests to verify no regressions
cd packages/server && npx vitest run

# Quick structural verification that the app builds and the routes are registered
# (the 401 response confirms the route exists — Fastify's default would be 404)
cd packages/server && npx tsc && node -e "
  import('./dist/app.js').then(async ({ buildApp }) => {
    const app = await buildApp();
    await app.ready();
    const res1 = await app.inject({ method: 'GET', url: '/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments' });
    const res2 = await app.inject({ method: 'GET', url: '/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels' });
    const res3 = await app.inject({ method: 'PUT', url: '/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa' });
    const res4 = await app.inject({ method: 'PUT', url: '/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa' });
    console.log('Comment list:', res1.statusCode, '(expect 401)');
    console.log('Label list:', res2.statusCode, '(expect 401)');
    console.log('Comment update:', res3.statusCode, '(expect 401)');
    console.log('Label update:', res4.statusCode, '(expect 401)');
    await app.close();
    process.exit(0);
  });
"
```

## 8. Key Patterns to Follow

- **Import extension**: Always use `.js` extension for local imports (TypeScript ESM convention used throughout the project)
- **Registration order**: Group routes logically — auth first, then resource routes roughly following the dependency chain (projects → boards → tasks → comments → labels)
- **Prefix sharing**: Multiple plugins can share a prefix (e.g., `/api/tasks` is used by both `taskRoutes` and `taskCommentRoutes`). Fastify isolates each plugin in its own encapsulation context, so route patterns won't clash as long as the path segments differ
- **`await` on register**: Every `app.register()` call is awaited, matching the existing pattern. This ensures plugins are fully loaded before subsequent registrations