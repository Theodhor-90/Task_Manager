## Objective

Create a shared context for project data that can be consumed by both the sidebar and the dashboard, preventing duplicate API calls and keeping project state synchronized across the UI.

## Deliverables

### 1. Project API Functions
- **File**: `packages/client/src/api/projects.ts` (Create)
- `fetchProjects()` → `GET /api/projects` — returns array of projects
- `createProject(data)` → `POST /api/projects` — creates a new project
- `updateProject(id, data)` → `PUT /api/projects/:id` — updates a project
- `deleteProject(id)` → `DELETE /api/projects/:id` — deletes a project
- All functions use the existing `apiClient` from `packages/client/src/api/client.ts`

### 2. Projects Context
- **File**: `packages/client/src/context/projects-context.tsx` (Create)
- React context + provider (`ProjectsProvider`) that:
  - Fetches the project list on mount (when authenticated)
  - Exposes: `projects`, `isLoading`, `error`
  - Exposes mutation functions: `addProject`, `updateProject`, `removeProject`
  - Mutation functions call the API and then update the local array:
    - `addProject` → calls `POST /api/projects`, appends result to local state
    - `updateProject` → calls `PUT /api/projects/:id`, updates in-place in local state
    - `removeProject` → calls `DELETE /api/projects/:id`, removes from local state (optimistic)
- Named exports: `ProjectsProvider`, `useProjects`

## Constraints

- TypeScript strict mode, named exports
- Uses the existing `apiClient` for HTTP calls
- Project types should come from `@taskboard/shared` or be consistent with the server's response shape
- Context should handle error states gracefully
- Must be wrapped inside `ProtectedRoute` (only fetches when authenticated)

## Dependencies

- Existing `apiClient` from `packages/client/src/api/client.ts`
- Existing auth infrastructure (context provider is placed inside authenticated routes)
- Tasks 1-3 are not strict code dependencies, but this context will be consumed by sidebar (t03) and layout (t05)

## Verification

1. `packages/client/src/api/projects.ts` exists with all four API functions
2. `packages/client/src/context/projects-context.tsx` exists with `ProjectsProvider` and `useProjects` exports
3. `useProjects()` returns `projects`, `isLoading`, `error`, `addProject`, `updateProject`, `removeProject`
4. On mount, the provider fetches projects from `GET /api/projects`
5. `addProject` calls the API and adds the new project to local state
6. `updateProject` calls the API and updates the project in local state
7. `removeProject` calls the API and removes the project from local state
8. All API calls use the shared `apiClient` with JWT headers