## Phase 2: Project Dashboard

### Goal

Build the complete project management UI on the dashboard page, connecting to all project CRUD API endpoints — enabling the user to view, create, edit, and delete projects, and navigate from the dashboard to a project's board view. This phase also delivers the reusable shared UI components (Modal, ConfirmDialog, LoadingSpinner, ErrorMessage) that will be used throughout the rest of the frontend.

### Deliverables

1. **Project list view** — fetches projects from `GET /api/projects` on mount and displays them as cards or rows showing project name, description (truncated), and creation date. Shows a loading spinner while fetching and an empty-state message when no projects exist.
2. **Create project modal** — triggered by a "New Project" button. Modal contains a form with name (required) and description (optional) fields. Submits to `POST /api/projects`. On success, closes the modal and adds the new project to the list without a full refetch.
3. **Edit project** — opens a modal (or inline editing) pre-filled with the project's current name and description. Submits to `PUT /api/projects/:id`. Updates the project in the list on success.
4. **Delete project with confirmation** — clicking delete opens a `ConfirmDialog` warning that all tasks, comments, and labels within the project will be permanently deleted. On confirmation, calls `DELETE /api/projects/:id` and removes the project from the list.
5. **Project navigation** — clicking a project card navigates to `/projects/:id/board`. The sidebar project list also links to this route.
6. **Shared UI components**:
   - `Modal` — overlay with close button, click-outside-to-dismiss
   - `ConfirmDialog` — extends Modal with confirm/cancel buttons and a warning message
   - `LoadingSpinner` — centered spinner for async states
   - `ErrorMessage` — styled error banner that accepts a message string

### Technical Decisions & Constraints

- **API endpoints used**: `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`.
- **Response envelope**: All API responses follow `{ data: T }` for success, `{ error: string }` for failure.
- **Cascade delete**: Deleting a project cascades to its board, tasks, comments, and labels — the confirmation dialog must warn about this.
- **State synchronization**: The sidebar project list and dashboard project list must stay in sync when projects are created, edited, or deleted. A shared data-fetching strategy or lifting state up is needed to prevent stale data.
- **Optimistic updates**: New projects should appear in the list immediately after creation without requiring a full refetch.
- **Styling**: Tailwind CSS, consistent with the clean professional aesthetic established in Phase 1.
- **Code conventions**: TypeScript strict mode, ES modules, functional components with hooks, async/await, named exports, kebab-case files, PascalCase components.
- **Shared types**: Use entity interfaces and API contracts from `@taskboard/shared`.

### Dependencies

- **Phase 1 (App Shell & Auth UI)** — the app layout (sidebar, header, main content area), React Router configuration, API client module with JWT auth, and auth context must all be in place. The login flow must be functional.
- **Milestone 2 (Core API)** — all project CRUD endpoints must be implemented and returning correct responses.
- **MongoDB** — a running MongoDB instance accessible to the server during development.

### Exit Criteria (Phase-specific)

- The dashboard fetches and displays all projects from the API, including a loading state while fetching.
- An empty-state message is shown when no projects exist.
- A user can create a new project via a modal form with name (required) and description (optional), and the project appears in the list after creation.
- A user can edit an existing project's name and description, and the changes are reflected in the list after saving.
- A user can delete a project after confirming in a dialog, and the project is removed from the list.
- Clicking a project navigates to `/projects/:id/board`.
- The sidebar lists all projects and highlights the active project when on a board route.
- All API interactions use the shared API client with JWT headers, and 401 responses trigger automatic logout.
- Shared components (Modal, ConfirmDialog, LoadingSpinner, ErrorMessage) are implemented and reusable.