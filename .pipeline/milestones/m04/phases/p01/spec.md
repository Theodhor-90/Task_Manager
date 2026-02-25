## Goal

Build the foundational board view and column management UI that serves as the primary container for the kanban experience. This phase replaces the current `BoardPage` placeholder with a fully functional board that fetches data from the API, renders columns with task counts, and supports full column lifecycle management including drag-and-drop reordering.

## Deliverables

- API client functions for fetching board data (`GET /api/projects/:projectId/board`) and column operations (add via `POST /api/boards/:boardId/columns`, rename via `PUT /api/boards/:boardId/columns/:columnId`, delete via `DELETE /api/boards/:boardId/columns/:columnId`, reorder via `PUT /api/boards/:boardId/columns/reorder`)
- API client function for fetching tasks for a board (`GET /api/boards/:boardId/tasks`)
- `BoardView` component that fetches the board and its tasks, then renders columns
- `Column` component with a header displaying the column name and task count
- Column management UI: add column via a button/form, rename column inline or via popover, delete column with a guard that prevents deletion when tasks exist in the column
- Column reorder via drag-and-drop using `@dnd-kit`
- `BoardPage` updated to render `BoardView` instead of the current placeholder

## Technical Decisions & Constraints

- Use `@dnd-kit/core` and `@dnd-kit/sortable` for column drag-and-drop (already specified in master plan tech stack; must be installed in the client package)
- The reorder API expects `{ "columnIds": ["id1", "id2", ...] }` as the request body
- Column deletion must be blocked server-side when tasks exist in the column — the UI should handle this error gracefully and display feedback to the user
- API client should use the existing JWT auth header pattern established in Milestone 3 (Authorization: Bearer token)
- Response envelope follows `{ data: T }` for success, `{ error: string }` for failure
- No backend/API changes are in scope — the API is complete from Milestone 2
- Risk: combining column reorder with later task reorder (Phase 2) requires careful sensor configuration — consider separate drag contexts or distinct drag handle strategies from the start

## Dependencies

- Milestone 3 must be complete: app shell, routing, auth context, API client base, sidebar, header, dashboard, project CRUD UI, and the placeholder `BoardPage` route must be in place
- Milestone 2 must be complete: all REST API endpoints for boards, columns, and tasks must be implemented
- `@dnd-kit/core` and `@dnd-kit/sortable` must be installed in the client package