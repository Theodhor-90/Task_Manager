There's no `fetchProject` (singular) API function. The board page needs the project name. I can either use `useProjects()` to find the project from the already-fetched list, or add a new API call. The task spec says "Can use `useProjects()` from ProjectsContext to find project name, or fetch directly." Using `useProjects()` is simpler since the data is already available.

Now I have everything I need. Let me produce the implementation plan.

# Task 8 Implementation Plan: Board Page Placeholder

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/pages/board-page.tsx` | Modify | Remove PRIORITIES debug display, show the project name in a heading (resolved from route param via `useProjects()`), display a "Board coming in Milestone 4" placeholder message, and ensure the page works within the `AppLayout` shell |
| 2 | `packages/client/src/pages/__tests__/board-page.test.tsx` | Create | Tests for the board page covering all rendering states: project found, project not found, and loading |

## 2. Dependencies

- **Runtime**: React 19 (already installed), React Router DOM 6.15.0 (already installed)
- **Existing code**:
  - `useProjects()` from `packages/client/src/context/projects-context.tsx` (Task 4) — provides `projects` array and `isLoading` state. The board page will look up the project by ID from the route param to display the project name.
  - `LoadingSpinner` from `packages/client/src/components/ui/loading-spinner.tsx` (Task 1) — used for loading state while projects are being fetched.
  - `useParams` from `react-router-dom` — provides the `:id` route param to identify which project is being viewed.
- **Layout**: The board page renders inside `AppLayout` via `<Outlet />` (Task 5). The Header with "Board" title and Sidebar with active-project highlighting are already handled by `AppLayout` and `Sidebar` respectively.
- **Sidebar active highlighting**: The Sidebar uses `NavLink` with `to={/projects/${project._id}/board}`, and React Router's `NavLink` automatically applies the `isActive` className when the current URL matches. This works without any changes to the board page — simply navigating to `/projects/:id/board` triggers the highlight.
- **Test infrastructure**: Vitest + React Testing Library + jsdom (installed in Task 1)
- **Prerequisite tasks**: Task 1 (UI components), Task 4 (ProjectsContext), Task 5 (AppLayout + router integration)
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 Board Page Update (`board-page.tsx`)

**Purpose**: Replace the debug `PRIORITIES` display with a meaningful board page that shows the project name and a placeholder message for the upcoming kanban board. The page uses the route param `:id` to look up the project from `ProjectsContext`.

**Named export**: `BoardPage` (unchanged)

**Current state**: The existing `board-page.tsx` is a minimal debug page:
```tsx
import { PRIORITIES } from "@taskboard/shared";

export function BoardPage() {
  return (
    <div>
      <h1>Board</h1>
      <p>Priority levels: {PRIORITIES.join(", ")}</p>
    </div>
  );
}
```

This must be completely replaced.

**New imports**:
```typescript
import { useParams } from "react-router-dom";
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";
```

- `useParams` — retrieves the `id` route param from `/projects/:id/board`.
- `useProjects` — provides the `projects` array (already fetched by `ProjectsProvider` on mount) and `isLoading` state. The project is found by matching `_id` against the route param.
- `LoadingSpinner` — shown when the projects are still loading.

**Implementation**:

The component reads the route `id` param, looks up the matching project from the `useProjects()` context, and renders one of three states:

1. **Loading state** (`isLoading === true`): Render a centered `LoadingSpinner` (default `md` size). This state occurs when the user navigates directly to `/projects/:id/board` (e.g., via bookmark or page refresh) and the `ProjectsProvider` hasn't finished fetching the project list yet.

2. **Project not found** (`isLoading === false` and no matching project in the array): Render a simple "Project not found" message. This can happen if the user navigates to a board URL with an invalid project ID, or if the project was deleted.

3. **Project found** (`isLoading === false` and a matching project is found): Render:
   - An `<h2>` with the project name — uses `text-2xl font-semibold text-gray-900` to match the dashboard page's heading style.
   - A placeholder card — a `<div>` with `mt-6 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center` (matching the dashboard's empty-state card pattern) containing:
     - A `<p>` with `text-sm text-gray-500` displaying `"Board coming in Milestone 4"`.
   - This placeholder communicates that the board is intentionally empty for now, not broken.

**Full component**:

```tsx
import { useParams } from "react-router-dom";
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const project = projects.find((p) => p._id === id);

  if (!project) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">{project.name}</h2>
      <div className="mt-6 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">Board coming in Milestone 4</p>
      </div>
    </div>
  );
}
```

**Design decisions**:

1. **Uses `useProjects()` rather than a direct API call**: The task spec says "Can use `useProjects()` from ProjectsContext to find project name, or fetch directly." Using `useProjects()` is simpler — the data is already fetched and available from `ProjectsProvider` (which wraps `AppLayout`). A direct API call would require additional state management (`useState` + `useEffect`) for a single lookup that the context already provides. The project list is guaranteed to be loaded (or loading) by the time this page renders because `ProjectsProvider` fetches on mount.

2. **`<h2>` heading level**: Uses `<h2>` because the `<h1>` is in the Header component (showing "Board"). This maintains proper semantic heading hierarchy, consistent with the dashboard page which also uses `<h2>` for its content heading.

3. **Loading state shows `LoadingSpinner`**: While `ProjectsProvider` is fetching the project list, the board page can't resolve the project name. A spinner is shown during this brief loading period. The `py-12` padding matches the dashboard page's loading state.

4. **"Project not found" is a simple message**: No error styling or retry button — this is an edge case (invalid URL or deleted project). A simple text message is sufficient for a placeholder page. Phase 2 or Milestone 4 can enhance this if needed.

5. **Placeholder card uses the same dashed-border pattern as the dashboard**: The `rounded-lg border-2 border-dashed border-gray-300 p-12 text-center` styling is identical to the dashboard page's empty state, establishing a consistent visual pattern for "coming soon" content.

6. **No `PRIORITIES` import**: The `@taskboard/shared` import is removed entirely. The debug display is deleted per the task spec.

7. **Sidebar highlighting works automatically**: The Sidebar's `NavLink` components use `to={/projects/${project._id}/board}`, and React Router's `NavLink` automatically detects when the current URL matches and applies the active className (`bg-blue-50 font-medium text-blue-700`). No changes to the Sidebar or board page are needed for this — it works by virtue of the URL matching.

## 4. Contracts

### BoardPage

**Input**: None (no props). Gets its data from:
- `useParams()` hook — provides the `id` route param
- `useProjects()` hook — provides `projects` array and `isLoading` state

**Output**: Renders one of three states:

| State | Condition | Rendering |
|-------|-----------|-----------|
| Loading | `isLoading === true` | Centered `LoadingSpinner` with `py-12` padding |
| Not found | `isLoading === false`, no project with matching `_id` | Centered "Project not found" text |
| Found | `isLoading === false`, project found | `<h2>` with project name + dashed-border placeholder card with "Board coming in Milestone 4" message |

**Example usage** (in route config — already in `App.tsx`):
```tsx
<Route path="/projects/:id/board" element={<BoardPage />} />
```

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/pages/__tests__/board-page.test.tsx`
- The BoardPage uses `useParams()` (needs `MemoryRouter` with route definition) and `useProjects()` (needs mock).

### Mocking Strategy

Mock the `useProjects` hook to control the projects array and loading state:

```typescript
import { vi } from "vitest";

const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));
```

The `useParams` hook is not mocked — instead, the component is rendered inside a `MemoryRouter` with a `Route` that has the `:id` param, and `initialEntries` sets the URL to include the actual project ID. This is the same pattern used in `app-layout.test.tsx` and `login-page.test.tsx`.

### Router Setup

```typescript
import { MemoryRouter, Routes, Route } from "react-router-dom";

function renderBoardPage(projectId: string = "proj1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/board`]}>
      <Routes>
        <Route path="/projects/:id/board" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
```

### Test Data

```typescript
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project",
    owner: "user1",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-10T00:00:00Z",
  },
];
```

### 5.1 Board Page Tests (`board-page.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders the project name as a heading | Set `projects: mockProjects`, navigate to `/projects/proj1/board`, verify an `<h2>` with text "Project Alpha" exists |
| 2 | renders the placeholder message | Set `projects: mockProjects`, navigate to `/projects/proj1/board`, verify the text "Board coming in Milestone 4" is displayed |
| 3 | shows loading spinner when projects are loading | Set `isLoading: true`, verify `LoadingSpinner` is rendered (`role="status"`) |
| 4 | does not show project name when loading | Set `isLoading: true`, verify "Project Alpha" text is not in the document |
| 5 | shows "Project not found" for invalid project ID | Set `projects: mockProjects`, navigate to `/projects/nonexistent/board`, verify the text "Project not found" is displayed |
| 6 | shows "Project not found" when projects list is empty | Set `projects: []`, navigate to `/projects/proj1/board`, verify the text "Project not found" is displayed |
| 7 | renders correct project name for different project IDs | Set `projects: mockProjects`, navigate to `/projects/proj2/board`, verify an `<h2>` with text "Project Beta" exists |
| 8 | does not render PRIORITIES debug content | Set `projects: mockProjects`, verify the text "Priority levels:" does not appear in the document |

### Test Implementation

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardPage } from "../board-page";
import type { Project } from "@taskboard/shared";

const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project",
    owner: "user1",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-10T00:00:00Z",
  },
];

function defaultProjectsState() {
  return {
    projects: mockProjects,
    isLoading: false,
    error: null,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    removeProject: vi.fn(),
  };
}

function renderBoardPage(projectId: string = "proj1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/board`]}>
      <Routes>
        <Route path="/projects/:id/board" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BoardPage", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue(defaultProjectsState());
  });

  it("renders the project name as a heading", () => {
    renderBoardPage("proj1");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Project Alpha");
  });

  it("renders the placeholder message", () => {
    renderBoardPage("proj1");
    expect(screen.getByText("Board coming in Milestone 4")).toBeInTheDocument();
  });

  it("shows loading spinner when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      isLoading: true,
    });
    renderBoardPage("proj1");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project name when loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: mockProjects,
      isLoading: true,
    });
    renderBoardPage("proj1");
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it('shows "Project not found" for invalid project ID', () => {
    renderBoardPage("nonexistent");
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });

  it('shows "Project not found" when projects list is empty', () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
    });
    renderBoardPage("proj1");
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });

  it("renders correct project name for different project IDs", () => {
    renderBoardPage("proj2");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Project Beta");
  });

  it("does not render PRIORITIES debug content", () => {
    renderBoardPage("proj1");
    expect(screen.queryByText(/priority levels/i)).not.toBeInTheDocument();
  });
});
```

**Key notes on test patterns**:

- Tests follow the same `describe/it/expect/vi/beforeEach` pattern used in all existing test files (`dashboard-page.test.tsx`, `login-page.test.tsx`, `app-layout.test.tsx`).
- `mockUseProjects` is a `vi.fn()` that individual tests override via `mockReturnValue()`. The `beforeEach` sets a default populated state so most tests don't need explicit setup. This is the exact same pattern used in `dashboard-page.test.tsx`.
- `defaultProjectsState()` is a helper function (not a constant) to avoid shared mutable state between tests — each call returns a fresh object. Same pattern as `dashboard-page.test.tsx`.
- `MemoryRouter` wraps the BoardPage with a `Route` that includes the `:id` param so `useParams()` works correctly. The `initialEntries` parameter controls the simulated URL. This is the same approach used in `app-layout.test.tsx` for testing route-dependent rendering.
- No mocking of `useParams` — the real React Router `useParams` hook works naturally within the `MemoryRouter` + `Route` setup.
- No mocking of `LoadingSpinner` — it renders naturally, and its presence is verified via `role="status"`.
- The "does not render PRIORITIES debug content" test ensures the old debug display has been fully removed.

## 6. Implementation Order

1. **Modify `packages/client/src/pages/board-page.tsx`** — Replace the PRIORITIES debug display with the project name heading and placeholder message. All dependencies (`useProjects`, `LoadingSpinner`, `useParams`) are already available from prior tasks.
2. **Create `packages/client/src/pages/__tests__/board-page.test.tsx`** — Tests for the board page. Depends on the modified source file.

## 7. Verification Commands

```bash
# 1. Verify the board page file is updated
ls packages/client/src/pages/board-page.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run board page tests
cd packages/client && npx vitest run src/pages/__tests__/board-page.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run

# 5. Manual verification (with running dev server):
# - Log in and navigate to a project from the sidebar → should show project name as <h2> heading
# - The Header should display "Board" as the <h1> page title
# - Below the heading, a dashed-border card should show "Board coming in Milestone 4"
# - The sidebar should highlight the active project (blue background, blue text)
# - No "Priority levels:" debug text should appear anywhere
# - Navigate to /projects/invalid-id/board → should show "Project not found"
# - Refresh the page on a board route → should briefly show loading spinner, then the project name
# - Navigate back to / → should show the dashboard with project list
```