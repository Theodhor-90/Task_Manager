## Milestone 2: Core API

### Goal

Implement the complete REST API with full CRUD for all resources and integration tests. This milestone builds out every endpoint defined in the API specification — projects with auto-created boards, board and column management, full task lifecycle including move/reorder, comments, and labels — all backed by comprehensive integration tests.

### Phases

1. **Projects API** — CRUD endpoints for projects. Creating a project auto-creates a board with default columns ("To Do", "In Progress", "In Review", "Done"). Deleting a project cascades to its board, tasks, comments, and labels. Integration tests cover all endpoints and edge cases.
2. **Boards & Columns API** — Endpoint to fetch a board with its columns. CRUD endpoints for columns: add, rename, delete (block deletion if tasks exist in column), and reorder. Integration tests for all column operations.
3. **Tasks API** — Full CRUD for tasks with all fields (title, markdown description, priority, status, position, dueDate, labels). Move endpoint to change task column and/or reorder. Query filtering by status, priority, and label. Sorting by createdAt and dueDate. Integration tests for all operations including move logic and filtering.
4. **Comments & Labels API** — CRUD for comments on tasks. CRUD for labels scoped to projects. Attach/detach labels on tasks. Deleting a label removes it from all tasks. Integration tests for all operations.

### Exit Criteria

1. All endpoints listed in the master plan Section 5 are implemented and return correct responses
2. All integration tests pass
3. Cascade deletes work correctly (project → board → tasks → comments)
4. Task move correctly updates status and reindexes positions
5. Query filters return correct subsets