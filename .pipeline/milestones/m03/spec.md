## Milestone 3: Frontend — Shell & Projects

### Goal

Build the application shell, routing, auth integration, and project management UI. This milestone delivers the foundational frontend: a layout with sidebar navigation, React Router setup, an API client with JWT auth headers, a login page, auth state management, and a dashboard where users can create, edit, delete, and navigate to projects.

### Phases

1. **App Shell & Auth UI** — Layout component with sidebar and main content area. React Router setup. API client utility with JWT auth headers. Login page that authenticates against the server. Auth context that persists login state and redirects unauthenticated users. Logout functionality.
2. **Project Dashboard** — Project list view that fetches from API. Create project modal with name and description fields. Edit project inline or via modal. Delete project with confirmation dialog. Click project to navigate to board view.

### Exit Criteria

1. Login page authenticates and redirects to dashboard
2. Unauthenticated users are redirected to login
3. Dashboard displays all projects from the API
4. User can create, edit, and delete projects
5. Clicking a project navigates to /projects/:id/board