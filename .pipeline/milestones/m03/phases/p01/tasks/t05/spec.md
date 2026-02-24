## Objective

Wire the app shell together as a React Router layout route, combining Header, Sidebar, and the main content area into a cohesive layout. Update the router configuration so all authenticated routes render inside this layout.

## Deliverables

### 1. AppLayout Component
- **File**: `packages/client/src/components/app-layout.tsx` (Create)
- A layout component that renders:
  - `Header` at the top
  - `Sidebar` on the left, receiving project data from `ProjectsContext` (via `useProjects()`)
  - `<Outlet />` as the main content area on the right
- Uses CSS Grid or Flexbox for the layout
- Sidebar has a fixed width (~256px / `w-64`)
- Main content area fills the remaining space and scrolls independently
- Named export: `AppLayout`

### 2. Router Restructuring
- **File**: `packages/client/src/App.tsx` (Modify)
- Restructure routes so that:
  - `/login` is a standalone route (outside the layout)
  - All authenticated routes (`/`, `/projects/:id/board`) are nested inside an `AppLayout` layout route
  - `AppLayout` is wrapped with `ProtectedRoute` and `ProjectsProvider`
  - The `ProtectedRoute` check happens before `AppLayout` renders
- Route hierarchy: `ProtectedRoute` → `ProjectsProvider` → `AppLayout` → child routes

## Constraints

- TypeScript strict mode, named exports
- Uses React Router 6's nested routing with `<Outlet />`
- The sidebar's `onCreateProject` callback should be wired (can open a placeholder or be a no-op that Phase 2 completes)
- Layout must not break existing route navigation
- Tailwind CSS for layout styling

## Dependencies

- Task 1 (Shared UI Components) — used within layout children
- Task 2 (Header) — rendered in AppLayout
- Task 3 (Sidebar) — rendered in AppLayout
- Task 4 (Projects Context) — `ProjectsProvider` wraps layout, `useProjects()` feeds sidebar
- Existing `ProtectedRoute`, `AuthContext`, React Router setup

## Verification

1. `packages/client/src/components/app-layout.tsx` exists and compiles
2. `packages/client/src/App.tsx` is updated with nested route structure
3. `/login` renders without the app shell (no sidebar, no header)
4. `/` and `/projects/:id/board` render inside the app shell with sidebar + header + content area
5. Unauthenticated access to `/` redirects to `/login`
6. Sidebar displays project list from `ProjectsContext`
7. Main content area scrolls independently from sidebar
8. Layout uses proper CSS Grid/Flexbox with sidebar at ~256px width