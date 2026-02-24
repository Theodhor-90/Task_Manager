Now I have all the information needed. Let me produce the implementation plan.

# Task 5 Implementation Plan: AppLayout and Router Integration

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/app-layout.tsx` | Create | Layout component combining Header, Sidebar, and `<Outlet />` into a cohesive app shell with fixed sidebar and scrollable main content |
| 2 | `packages/client/src/App.tsx` | Modify | Restructure routes: `/login` standalone, all authenticated routes nested inside `ProtectedRoute` → `ProjectsProvider` → `AppLayout` |
| 3 | `packages/client/src/components/__tests__/app-layout.test.tsx` | Create | Tests for the AppLayout component covering layout rendering, sidebar data wiring, and scroll independence |

## 2. Dependencies

- **Runtime**: React 19 (already installed), React Router DOM 6.15.0 (already installed)
- **Existing components**:
  - `Header` from `packages/client/src/components/header.tsx` (Task 2) — rendered in the top bar
  - `Sidebar` from `packages/client/src/components/sidebar.tsx` (Task 3) — rendered in the left panel
  - `ProtectedRoute` from `packages/client/src/components/protected-route.tsx` — wraps authenticated routes
  - `ProjectsProvider` / `useProjects` from `packages/client/src/context/projects-context.tsx` (Task 4) — provides project data to Sidebar
  - `AuthProvider` from `packages/client/src/context/auth-context.tsx` — wraps the entire app
- **Pages**: `LoginPage`, `DashboardPage`, `BoardPage` — existing page components routed as children
- **Test infrastructure**: Vitest + React Testing Library + jsdom (installed in Task 1)
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 AppLayout Component (`app-layout.tsx`)

**Purpose**: Render the persistent app shell — Header at the top, Sidebar on the left, and `<Outlet />` as the scrollable main content area. This is a React Router layout route component.

**Named export**: `AppLayout`

**Imports**:
```typescript
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useProjects } from "../context/projects-context";
```

**Implementation**:

The component wires together the Header, Sidebar, and main content area using Flexbox.

#### Layout Structure

The overall page layout uses a full-viewport `<div>` with `flex flex-col h-screen`. The Header sits at the top with fixed height (`h-14`). Below the header, a row container holds the Sidebar (fixed width `w-64`) and the main content area (fills remaining space, scrolls independently).

```
┌──────────────────────────────────────────┐
│  Header (h-14, full width)               │
├──────────┬───────────────────────────────┤
│  Sidebar │  Main Content                 │
│  (w-64)  │  (<Outlet />, overflow-y-auto)│
│          │                               │
│          │                               │
└──────────┴───────────────────────────────┘
```

#### Page Title Derivation

The Header requires a `title` prop. Rather than hardcoding titles or passing them through context, the AppLayout derives the title from the current route using `useLocation()`:

- `/` → `"Projects"`
- `/projects/:id/board` → `"Board"`

This is a simple mapping using `location.pathname`:

```typescript
function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Projects";
  if (pathname.match(/^\/projects\/[^/]+\/board$/)) return "Board";
  return "Projects";
}
```

The title stays simple for now — later milestones may enhance the board title to include the project name, but that requires fetching the individual project which is outside this task's scope. The task spec says `title` can be "derived from route", and "Board" is a reasonable default for the board route.

#### `onCreateProject` Callback

The Sidebar's `onCreateProject` prop needs a callback. Since the Create Project modal is built in Phase 2, the AppLayout wires this as a no-op placeholder for now. However, to make it forward-compatible, the AppLayout uses a `useState` for a `showCreateModal` boolean. When the Sidebar's "New Project" button is clicked, it sets `showCreateModal` to `true`. For now, no modal is rendered — the state variable exists so Phase 2 can add the modal without modifying the AppLayout's callback wiring.

Actually, looking at the task spec more carefully: "The sidebar's `onCreateProject` callback should be wired (can open a placeholder or be a no-op that Phase 2 completes)". Since over-engineering is to be avoided, the simplest approach is a no-op function. Phase 2 will replace this with actual modal logic. Using `useState` for a flag that nothing reads is unnecessary complexity.

Revised approach: Pass a no-op `onCreateProject` to the Sidebar. This is explicit and clear:

```typescript
const handleCreateProject = () => {
  // TODO: Phase 2 will add create project modal
};
```

#### Full Component

```typescript
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useProjects } from "../context/projects-context";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Projects";
  if (/^\/projects\/[^/]+\/board$/.test(pathname)) return "Board";
  return "Projects";
}

export function AppLayout() {
  const location = useLocation();
  const { projects, isLoading } = useProjects();

  const handleCreateProject = () => {
    // Phase 2 will add create project modal
  };

  return (
    <div className="flex h-screen flex-col">
      <Header title={getPageTitle(location.pathname)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects}
          isLoading={isLoading}
          onCreateProject={handleCreateProject}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**Key styling decisions**:

- `h-screen` on the outer container — fills the full viewport height. This prevents the sidebar and main content from depending on content height.
- `flex flex-col` on the outer container — stacks Header and the body row vertically.
- `flex flex-1 overflow-hidden` on the body row — fills remaining space after the header. `overflow-hidden` prevents the row itself from scrolling; scrolling is delegated to the main content area.
- `flex-1 overflow-y-auto` on `<main>` — fills remaining width after the sidebar (since the sidebar has a fixed `w-64`) and scrolls vertically when content overflows.
- `bg-gray-50` on `<main>` — matches the existing `DashboardPage`'s background color, providing visual consistency.
- `p-6` on `<main>` — provides padding for page content. This replaces the `mx-auto max-w-7xl px-4 py-8` that was previously on the DashboardPage's `<main>`, since the layout now constrains the content area naturally.
- The Sidebar already has `h-full` in its own implementation, which will work within the `flex-1` row container.
- No `shrink-0` is needed on the Sidebar's container because the Sidebar component itself has `w-64` (fixed width) and Flexbox won't shrink elements below their explicit width by default when combined with the `flex-col` child layout.

**Design decisions**:

1. **Flexbox over CSS Grid**: The layout uses Flexbox (`flex` on both the column and row containers). This is simpler than CSS Grid for a two-zone layout (sidebar + content) and is the more common pattern in the existing codebase (all existing layout uses `flex`).

2. **`useLocation` for page title**: Deriving the title from the pathname is the simplest approach that satisfies the requirement. It avoids adding route metadata, context, or prop threading. The regex pattern `/^\/projects\/[^/]+\/board$/` matches any board route regardless of project ID.

3. **`useProjects()` for sidebar data**: The AppLayout calls `useProjects()` to get `projects` and `isLoading`, then passes them as props to the Sidebar. This is the intended data flow described in the phase spec: `ProjectsProvider` wraps `AppLayout`, and `AppLayout` feeds data to the Sidebar.

4. **No-op `handleCreateProject`**: The simplest placeholder. Phase 2's Task (Create Project Modal) will replace this with actual modal state management.

### 3.2 Router Restructuring (`App.tsx`)

**Purpose**: Restructure the route hierarchy so `/login` is standalone and all authenticated routes are nested inside `ProtectedRoute` → `ProjectsProvider` → `AppLayout`.

**Current structure** (from `App.tsx`):
```
BrowserRouter
  AuthProvider
    Routes
      /login → LoginPage
      ProtectedRoute (layout)
        / → DashboardPage
        /projects/:id/board → BoardPage
```

**New structure**:
```
BrowserRouter
  AuthProvider
    Routes
      /login → LoginPage
      ProtectedRoute (layout)
        ProjectsProvider → AppLayout (layout)
          / → DashboardPage
          /projects/:id/board → BoardPage
```

The key change is inserting `ProjectsProvider` and `AppLayout` between `ProtectedRoute` and the child routes. React Router 6 supports wrapping layout routes in providers by using a wrapper component.

However, React Router's `<Route element={...}>` only accepts a single React element. To insert `ProjectsProvider` between `ProtectedRoute` and `AppLayout`, we need a wrapper that renders `ProjectsProvider` around `AppLayout` content. The cleanest approach is to create a wrapper element that nests them:

**Option A** — Wrap `AppLayout` inside `ProjectsProvider` directly in the route config:
```tsx
<Route element={<ProtectedRoute />}>
  <Route element={<ProjectsProvider><AppLayout /></ProjectsProvider>}>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/projects/:id/board" element={<BoardPage />} />
  </Route>
</Route>
```

Wait — this won't work because `AppLayout` renders `<Outlet />`, but if `AppLayout` is the element of a route, then `<Outlet />` inside `AppLayout` will render the child routes. But `ProjectsProvider` wrapping `AppLayout` as an element means the `<Outlet />` in `AppLayout` should correctly render the child routes, because React Router resolves `<Outlet />` based on the route hierarchy, not the component tree.

Actually, looking at `ProtectedRoute` — it renders `<Outlet />` directly. So the route hierarchy is:

1. `ProtectedRoute` (renders `<Outlet />` → which renders the next matched child route)
2. Next child: `ProjectsProvider > AppLayout` element (AppLayout renders `<Outlet />` → which renders the next matched child route)
3. Next child: `DashboardPage` or `BoardPage`

This should work because React Router resolves `<Outlet />` at each nesting level independently.

But there's a subtlety: when `<Route element={<ProjectsProvider><AppLayout /></ProjectsProvider>}>` is used, the `AppLayout` component is rendered as a child of `ProjectsProvider`, not as a direct route element. React Router's `<Outlet />` works by context — it renders the matched child route element at the current route nesting level. Since `AppLayout` is rendered inside the route element (even though it's wrapped in `ProjectsProvider`), its `<Outlet />` should correctly reference the child routes.

Let me verify: in React Router 6, `<Outlet />` uses `useOutlet()` which reads from the route context. The route context is set by the `<Route>` component, not by the element rendered. So as long as `AppLayout` is rendered within the route's element tree, its `<Outlet />` will work correctly.

**Updated `App.tsx`**:

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";
import { ProjectsProvider } from "./context/projects-context";
import { ProtectedRoute } from "./components/protected-route";
import { AppLayout } from "./components/app-layout";
import { LoginPage } from "./pages/login-page";
import { DashboardPage } from "./pages/dashboard-page";
import { BoardPage } from "./pages/board-page";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <ProjectsProvider>
                  <AppLayout />
                </ProjectsProvider>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects/:id/board" element={<BoardPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Key changes**:
1. Added imports for `ProjectsProvider` and `AppLayout`.
2. Inserted a new `<Route>` nesting level between `ProtectedRoute` and the child routes, with element `<ProjectsProvider><AppLayout /></ProjectsProvider>`.
3. No other changes to existing routes.

**What this achieves**:
- `/login` renders `LoginPage` standalone — no sidebar, no header.
- Accessing `/` or `/projects/:id/board` without authentication: `ProtectedRoute` redirects to `/login`.
- Accessing `/` authenticated: `ProtectedRoute` → `ProjectsProvider` → `AppLayout` (Header + Sidebar + main) → `DashboardPage` in `<Outlet />`.
- Accessing `/projects/:id/board` authenticated: same chain → `BoardPage` in `<Outlet />`.
- `ProjectsProvider` mounts after authentication is confirmed (inside `ProtectedRoute`), so its `fetchProjects()` call in `useEffect` runs only when the user is authenticated.

## 4. Contracts

### AppLayout

**Input**: None (no props). Gets its data from:
- `useProjects()` hook (projects, isLoading) for the Sidebar
- `useLocation()` hook for the page title

**Output**: Renders a full-viewport layout with:
- Header at top (56px / `h-14`)
- Sidebar on the left (256px / `w-64`)
- Main content area filling remaining space, scrollable, rendering `<Outlet />`

**Example usage** (in route config):
```tsx
<Route element={<ProjectsProvider><AppLayout /></ProjectsProvider>}>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/projects/:id/board" element={<BoardPage />} />
</Route>
```

### Router Configuration

**Route hierarchy**:

| Path | Auth Required | Layout | Component |
|------|--------------|--------|-----------|
| `/login` | No | None | `LoginPage` |
| `/` | Yes | `AppLayout` (inside `ProjectsProvider`) | `DashboardPage` |
| `/projects/:id/board` | Yes | `AppLayout` (inside `ProjectsProvider`) | `BoardPage` |

**Provider nesting order** (outermost to innermost):
1. `BrowserRouter` — routing context
2. `AuthProvider` — auth state + token
3. `ProtectedRoute` — auth check, redirect to `/login`
4. `ProjectsProvider` — project list state
5. `AppLayout` — visual layout shell
6. Page component via `<Outlet />`

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/components/__tests__/app-layout.test.tsx`
- The AppLayout uses `useProjects()` (needs `ProjectsProvider` or mock), `useAuth()` (used by Header — needs mock), `useLocation()` and `<Outlet />` (needs `MemoryRouter` + route setup).

### Mocking Strategy

Mock both `useAuth` (for the Header) and `useProjects` (for the Sidebar data):

```typescript
import { vi } from "vitest";

const mockLogout = vi.fn();

vi.mock("../../context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@test.com", name: "Admin User" },
    token: "mock-token",
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

vi.mock("../../context/projects-context", () => ({
  useProjects: () => ({
    projects: mockProjects,
    isLoading: false,
    error: null,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    removeProject: vi.fn(),
  }),
}));
```

The `useProjects` mock can be overridden per-test by using `vi.mocked()` and `.mockReturnValue()`.

**Router setup**: Wrap the AppLayout in a `MemoryRouter` with `Routes` and child routes so that `<Outlet />` renders correctly:

```typescript
import { MemoryRouter, Routes, Route } from "react-router-dom";

function renderAppLayout(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div data-testid="dashboard">Dashboard Content</div>} />
          <Route path="/projects/:id/board" element={<div data-testid="board">Board Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
```

### 5.1 AppLayout Tests (`app-layout.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders the Header with page title "Projects" on root route | Navigate to `/`, verify an `<h1>` with text "Projects" exists (from Header) |
| 2 | renders the Header with page title "Board" on board route | Navigate to `/projects/abc/board`, verify an `<h1>` with text "Board" exists |
| 3 | renders the Sidebar with branding | Verify the text "TaskBoard" is in the document (from Sidebar) |
| 4 | renders the Sidebar with project list | Verify the mocked project names appear as links in the document |
| 5 | renders the Sidebar "New Project" button | Verify a button with text "New Project" exists |
| 6 | renders child route content via Outlet | Navigate to `/`, verify `data-testid="dashboard"` content is rendered |
| 7 | renders board page content via Outlet | Navigate to `/projects/abc/board`, verify `data-testid="board"` content is rendered |
| 8 | renders user name in the Header | Verify the text "Admin User" appears (from Header's `useAuth` mock) |
| 9 | shows loading spinner in Sidebar when projects are loading | Override `useProjects` mock to return `isLoading: true`, verify the loading spinner (`role="status"`) is rendered |

### Test Implementation Notes

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { AppLayout } from "../app-layout";
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    owner: "user1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const mockLogout = vi.fn();

vi.mock("../../context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@test.com", name: "Admin User" },
    token: "mock-token",
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

const mockUseProjects = vi.fn();
vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

function renderAppLayout(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div data-testid="dashboard">Dashboard Content</div>} />
          <Route path="/projects/:id/board" element={<div data-testid="board">Board Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue({
      projects: mockProjects,
      isLoading: false,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
    });
  });

  it('renders the Header with page title "Projects" on root route', () => {
    renderAppLayout(["/"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projects");
  });

  it('renders the Header with page title "Board" on board route', () => {
    renderAppLayout(["/projects/abc/board"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Board");
  });

  it("renders the Sidebar with branding", () => {
    renderAppLayout();
    expect(screen.getByText("TaskBoard")).toBeInTheDocument();
  });

  it("renders the Sidebar with project list", () => {
    renderAppLayout();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  });

  it('renders the Sidebar "New Project" button', () => {
    renderAppLayout();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("renders child route content via Outlet", () => {
    renderAppLayout(["/"]);
    expect(screen.getByTestId("dashboard")).toHaveTextContent("Dashboard Content");
  });

  it("renders board page content via Outlet", () => {
    renderAppLayout(["/projects/abc/board"]);
    expect(screen.getByTestId("board")).toHaveTextContent("Board Content");
  });

  it("renders user name in the Header", () => {
    renderAppLayout();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("shows loading spinner in Sidebar when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      projects: [],
      isLoading: true,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
    });
    renderAppLayout();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

**Key notes on test patterns**:
- Tests follow the same `describe/it/expect/vi` pattern from Vitest used in existing tests (`header.test.tsx`, `sidebar.test.tsx`).
- `MemoryRouter` wraps the AppLayout with child `Route` elements so that `<Outlet />` can render the appropriate test content.
- Both `useAuth` and `useProjects` are mocked to isolate the AppLayout from its dependencies.
- `mockUseProjects` is a `vi.fn()` so individual tests can override its return value (e.g., the loading spinner test).
- No need to test Sidebar or Header behavior in detail — those have their own dedicated test files. The AppLayout tests focus on verifying that the layout renders all three zones (Header, Sidebar, content) and that the title derivation and data wiring work correctly.

## 6. Implementation Order

1. **Create `packages/client/src/components/app-layout.tsx`** — the AppLayout component. Depends on Header (Task 2), Sidebar (Task 3), and `useProjects` (Task 4), all of which are already implemented.
2. **Modify `packages/client/src/App.tsx`** — restructure the router to use AppLayout as a layout route, wrapping authenticated routes in `ProjectsProvider` → `AppLayout`. Depends on step 1.
3. **Create `packages/client/src/components/__tests__/app-layout.test.tsx`** — tests for the AppLayout component. Depends on steps 1 and 2.

## 7. Verification Commands

```bash
# 1. Verify new file exists
ls packages/client/src/components/app-layout.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run AppLayout tests
cd packages/client && npx vitest run src/components/__tests__/app-layout.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run

# 5. Verify the dev server starts without errors (manual check)
# npm run dev
# - Navigate to /login → should render login page without sidebar/header
# - Log in → should redirect to / with sidebar, header, and main content area
# - Navigate to /projects/some-id/board → header title should show "Board"
# - Sidebar should show project list (or empty state / loading)
# - Main content should scroll independently from sidebar
```