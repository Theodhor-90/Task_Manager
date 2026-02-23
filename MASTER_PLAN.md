# Master Plan — TaskBoard MVP

## 1. Product Overview

TaskBoard is a single-user, Jira-like task management application with a kanban board interface. The MVP delivers a fully functional local application where a user can create projects, organize tasks on a drag-and-drop kanban board, and manage work through customizable workflow stages.

This is the foundation for a larger product that will natively support code-related functionality (like GitHub/Bitbucket) and AI-native automation — enabling users to fully automate feature implementations or bug fixes from well-defined tickets. The MVP does not include these capabilities but the data model and architecture should not preclude them.

### Target User

Single user, local deployment. No multi-tenancy, no teams, no sharing.

### Core Experience

A user logs in, sees their projects, opens a project board, and manages tasks by dragging them between columns. Tasks carry enough structured detail (description, priority, labels, due dates, comments) that they could later serve as input to AI agents.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18+ with Vite | SPA, client-side routing |
| Styling | Tailwind CSS | Utility-first, minimal custom CSS |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | Modern, accessible, well-maintained |
| Markdown | react-markdown | Display only; editing via plain textarea |
| Backend | Fastify | Fast, schema-based, plugin architecture |
| Auth | @fastify/jwt + @fastify/cors | JWT bearer tokens |
| Database | MongoDB with Mongoose | Document store, flexible schemas |
| Testing | Vitest + Supertest + React Testing Library | Unit and integration |
| Monorepo | npm workspaces | packages/client, packages/server, packages/shared |

---

## 3. Architecture

### 3.1 Monorepo Structure

```
taskboard/
├── packages/
│   ├── shared/            # TypeScript types, constants, validation
│   │   ├── src/
│   │   │   ├── types/     # Entity interfaces, API contracts
│   │   │   └── constants/ # Priorities, default columns, etc.
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── server/            # Fastify REST API
│   │   ├── src/
│   │   │   ├── app.ts           # Fastify app factory
│   │   │   ├── server.ts        # Entry point (listen)
│   │   │   ├── config.ts        # Environment config
│   │   │   ├── db.ts            # MongoDB connection
│   │   │   ├── models/          # Mongoose schemas
│   │   │   ├── routes/          # Route handlers grouped by resource
│   │   │   ├── middleware/      # Auth middleware
│   │   │   ├── plugins/         # Fastify plugins (jwt, cors)
│   │   │   └── seed.ts          # Seed user creation
│   │   ├── test/
│   │   │   ├── helpers/         # Test setup, fixtures, utilities
│   │   │   └── routes/          # Integration tests per route group
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/            # React SPA
│       ├── src/
│       │   ├── main.tsx         # Entry point
│       │   ├── App.tsx          # Root component with router
│       │   ├── api/             # API client functions
│       │   ├── components/      # Reusable UI components
│       │   ├── pages/           # Page-level components
│       │   ├── context/         # React contexts (auth, etc.)
│       │   ├── hooks/           # Custom hooks
│       │   └── types/           # Client-specific types (if any)
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       └── vite.config.ts
├── package.json               # Root workspace config
├── tsconfig.base.json         # Shared TS config
└── MASTER_PLAN.md
```

### 3.2 API Design Principles

- RESTful JSON API under `/api` prefix
- All routes except `POST /api/auth/login` require JWT bearer token
- Consistent response envelope: `{ data: T }` for success, `{ error: string }` for failure
- HTTP status codes: 200 (ok), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- Pagination not required for MVP (single user, limited data volume)

### 3.3 Auth Flow

1. On first server start, a seed user is created if no users exist: `{ email: "admin@taskboard.local", password: "admin123", name: "Admin" }`
2. User logs in via `POST /api/auth/login` with email + password
3. Server returns a JWT token (24h expiry)
4. Client stores token in localStorage and sends it as `Authorization: Bearer <token>` on all subsequent requests
5. Server middleware validates the token and attaches user to request

---

## 4. Data Model

### 4.1 User

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated |
| email | string | Unique, required |
| passwordHash | string | bcrypt hash |
| name | string | Display name |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### 4.2 Project

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated |
| name | string | Required |
| description | string | Optional |
| owner | ObjectId | Ref → User |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

When a project is created, a Board is automatically created with it.

### 4.3 Board

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated |
| project | ObjectId | Ref → Project, unique (1:1) |
| columns | Column[] | Embedded subdocuments, ordered array |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### 4.4 Column (embedded in Board)

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated subdoc id |
| name | string | e.g., "To Do", "In Progress" |
| position | number | Sort order (0-based) |

Default columns on board creation: `["To Do", "In Progress", "In Review", "Done"]`

### 4.5 Task

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated |
| title | string | Required |
| description | string | Markdown-formatted, optional |
| status | string | Matches a column name on the board |
| priority | string | Enum: "low", "medium", "high", "urgent" |
| position | number | Sort order within column (0-based) |
| dueDate | Date | Optional |
| labels | ObjectId[] | Ref → Label[] |
| board | ObjectId | Ref → Board |
| project | ObjectId | Ref → Project (denormalized for queries) |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### 4.6 Comment

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated |
| body | string | Required, plain text or markdown |
| task | ObjectId | Ref → Task |
| author | ObjectId | Ref → User |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

### 4.7 Label

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Auto-generated |
| name | string | Required |
| color | string | Hex color, e.g., "#ef4444" |
| project | ObjectId | Ref → Project (labels are per-project) |
| createdAt | Date | Auto |

---

## 5. API Endpoints

### 5.1 Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login with email + password, returns JWT |

**Request**: `{ "email": "string", "password": "string" }`
**Response**: `{ "data": { "token": "string", "user": { "id", "email", "name" } } }`

### 5.2 Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List all projects |
| POST | /api/projects | Create project (auto-creates board) |
| GET | /api/projects/:id | Get project by ID |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project (cascades to board, tasks, comments, labels) |

### 5.3 Boards

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/:projectId/board | Get board with columns for a project |

### 5.4 Columns

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/boards/:boardId/columns | Add a column |
| PUT | /api/boards/:boardId/columns/:columnId | Rename a column |
| DELETE | /api/boards/:boardId/columns/:columnId | Delete a column (fails if tasks exist in it) |
| PUT | /api/boards/:boardId/columns/reorder | Reorder columns |

**Reorder request**: `{ "columnIds": ["id1", "id2", "id3", "id4"] }`

### 5.5 Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/boards/:boardId/tasks | List tasks for a board (with query filters) |
| POST | /api/boards/:boardId/tasks | Create a task |
| GET | /api/tasks/:id | Get task by ID (with populated labels) |
| PUT | /api/tasks/:id | Update task fields |
| DELETE | /api/tasks/:id | Delete task (cascades to comments) |
| PUT | /api/tasks/:id/move | Move task to column and/or reorder |

**Move request**: `{ "status": "In Progress", "position": 2 }`

**Query filters on GET**: `?status=To+Do&priority=high&label=labelId&sort=createdAt&order=desc`

### 5.6 Comments

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks/:taskId/comments | List comments for a task |
| POST | /api/tasks/:taskId/comments | Add a comment |
| PUT | /api/comments/:id | Edit a comment |
| DELETE | /api/comments/:id | Delete a comment |

### 5.7 Labels

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/:projectId/labels | List labels for a project |
| POST | /api/projects/:projectId/labels | Create a label |
| PUT | /api/labels/:id | Update a label |
| DELETE | /api/labels/:id | Delete a label (removes from all tasks) |

---

## 6. Frontend Pages & Components

### 6.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | /login | Email + password form, redirects to dashboard on success |
| Dashboard | / | Lists all projects, create project button |
| Board | /projects/:id/board | Kanban board for a project |

### 6.2 Key Components

**Layout**
- `AppLayout` — sidebar with project list + main content area
- `Sidebar` — project navigation, create project button
- `Header` — page title, user info, logout button

**Board**
- `BoardView` — fetches board data, renders columns
- `Column` — renders column header (name, task count) + task cards + add task form
- `TaskCard` — compact card showing title, priority badge, label dots, due date
- `AddTaskForm` — inline form at bottom of column (title + Enter to create)

**Task Detail**
- `TaskDetailPanel` — side panel or modal overlay
- `MarkdownPreview` — renders task description as formatted markdown
- `PrioritySelector` — dropdown for low/medium/high/urgent
- `DueDatePicker` — date input for due date
- `LabelPicker` — multi-select for attaching labels
- `CommentList` — chronological list of comments
- `CommentForm` — textarea + submit button

**Shared**
- `Modal` — reusable modal wrapper
- `ConfirmDialog` — "Are you sure?" dialog for destructive actions
- `LoadingSpinner` — loading indicator
- `ErrorMessage` — error display component

### 6.3 Drag-and-Drop Behavior

- Tasks can be dragged between columns (changes status)
- Tasks can be reordered within a column (changes position)
- Columns can be reordered by dragging column headers
- On drop, an optimistic update is applied immediately, then the API call is made
- On API failure, the UI reverts to the previous state

---

## 7. Milestones

### Milestone 1: Foundation

**Goal**: Establish the monorepo structure, database layer, and authentication — the base everything else builds on.

**Phases**:
1. **Monorepo & Dev Environment** — Initialize npm workspaces, configure TypeScript, scaffold all three packages (shared, server, client) with build and dev scripts, verify everything compiles and runs concurrently.
2. **Database & Models** — Set up MongoDB connection via Mongoose, implement all data models (User, Project, Board, Column, Task, Comment, Label) with proper schemas, indexes, and relationships. Create a seed script that inserts a default user on first run.
3. **Authentication** — Implement login endpoint with JWT generation, auth middleware for protected routes, client-side auth context with login page and route guards.

**Exit Criteria**:
1. `npm install` from root installs all workspace dependencies
2. `npm run dev` starts both server and client concurrently
3. All Mongoose models compile and can perform basic CRUD operations
4. Seed user is created on first server start
5. Login returns a valid JWT; protected routes reject requests without valid token
6. Client login page authenticates and stores token; unauthenticated access redirects to login

### Milestone 2: Core API

**Goal**: Implement the complete REST API with full CRUD for all resources and integration tests.

**Phases**:
1. **Projects API** — CRUD endpoints for projects. Creating a project auto-creates a board with default columns ("To Do", "In Progress", "In Review", "Done"). Deleting a project cascades to its board, tasks, comments, and labels. Integration tests cover all endpoints and edge cases.
2. **Boards & Columns API** — Endpoint to fetch a board with its columns. CRUD endpoints for columns: add, rename, delete (block deletion if tasks exist in column), and reorder. Integration tests for all column operations.
3. **Tasks API** — Full CRUD for tasks with all fields (title, markdown description, priority, status, position, dueDate, labels). Move endpoint to change task column and/or reorder. Query filtering by status, priority, and label. Sorting by createdAt and dueDate. Integration tests for all operations including move logic and filtering.
4. **Comments & Labels API** — CRUD for comments on tasks. CRUD for labels scoped to projects. Attach/detach labels on tasks. Deleting a label removes it from all tasks. Integration tests for all operations.

**Exit Criteria**:
1. All endpoints listed in Section 5 are implemented and return correct responses
2. All integration tests pass
3. Cascade deletes work correctly (project → board → tasks → comments)
4. Task move correctly updates status and reindexes positions
5. Query filters return correct subsets

### Milestone 3: Frontend — Shell & Projects

**Goal**: Build the application shell, routing, auth integration, and project management UI.

**Phases**:
1. **App Shell & Auth UI** — Layout component with sidebar and main content area. React Router setup. API client utility with JWT auth headers. Login page that authenticates against the server. Auth context that persists login state and redirects unauthenticated users. Logout functionality.
2. **Project Dashboard** — Project list view that fetches from API. Create project modal with name and description fields. Edit project inline or via modal. Delete project with confirmation dialog. Click project to navigate to board view.

**Exit Criteria**:
1. Login page authenticates and redirects to dashboard
2. Unauthenticated users are redirected to login
3. Dashboard displays all projects from the API
4. User can create, edit, and delete projects
5. Clicking a project navigates to /projects/:id/board

### Milestone 4: Frontend — Kanban Board

**Goal**: Implement the core kanban board experience with drag-and-drop, task management, comments, and labels.

**Phases**:
1. **Board & Columns** — Board view component that fetches board data and renders columns. Column headers with task count. Add column, rename column, delete column (with guard), and reorder columns via drag-and-drop.
2. **Task Cards & Drag-and-Drop** — Task card component displaying title, priority badge, label color dots, and due date. Drag-and-drop tasks between columns and within columns using @dnd-kit. Optimistic UI updates with rollback on API failure. Quick-add task form at the bottom of each column.
3. **Task Detail Panel** — Side panel that opens when clicking a task card. Edit title, markdown description (textarea with live preview), priority, due date. Delete task with confirmation. Close panel to return to board.
4. **Comments & Labels UI** — Comments section within task detail panel (list + add form). Label management: create labels with name and color, attach/detach labels from tasks. Filter bar above the board to filter tasks by label, priority, and due date.

**Exit Criteria**:
1. Board renders columns and tasks from the API
2. Drag-and-drop moves tasks between columns and reorders within columns
3. Column management (add, rename, delete, reorder) works correctly
4. Task detail panel opens, displays all fields, and saves edits
5. Comments can be added, edited, and deleted
6. Labels can be created, assigned to tasks, and used to filter the board
7. All interactions persist to the server via API calls

---

## 8. Conventions

### 8.1 Code Style
- TypeScript strict mode everywhere
- ES modules (import/export, no require)
- Functional components with hooks (no class components)
- Async/await (no raw promises or callbacks)
- Named exports (avoid default exports)

### 8.2 Naming
- Files: kebab-case (`task-card.tsx`, `auth-middleware.ts`)
- Components: PascalCase (`TaskCard`, `BoardView`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for config
- Routes: kebab-case URLs, camelCase handler names
- Database: camelCase fields (Mongoose handles _id)

### 8.3 Testing
- Unit tests: co-located with source as `*.test.ts` or in a `test/` directory
- Integration tests: in `packages/server/test/routes/`
- Test database: use a separate MongoDB database (e.g., `taskboard_test`)
- Each integration test file sets up and tears down its own data
- Minimum coverage expectation: all API endpoints, all model methods, key UI interactions

### 8.4 Error Handling
- Server: Fastify error handler returns `{ error: "message" }` with appropriate HTTP status
- Client: API client throws on non-2xx responses; components catch and display via ErrorMessage
- No silent failures — all errors surface to the user or the logs
