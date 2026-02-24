Now I have all the information I need. Let me produce the implementation plan.

# Task 7 Implementation Plan: Dashboard Page Skeleton

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/pages/dashboard-page.tsx` | Modify | Remove standalone header/logout, render a clean project-oriented dashboard inside the AppLayout shell with project count, "New Project" button, and an intentional layout ready for Phase 2's project list |
| 2 | `packages/client/src/pages/__tests__/dashboard-page.test.tsx` | Create | Tests for the dashboard page covering all rendering states: loading, error, empty, and populated |

## 2. Dependencies

- **Runtime**: React 19 (already installed)
- **Existing components**:
  - `LoadingSpinner` from `packages/client/src/components/ui/loading-spinner.tsx` (Task 1) — used for the loading state while projects are being fetched
  - `ErrorMessage` from `packages/client/src/components/ui/error-message.tsx` (Task 1) — used for displaying fetch errors
  - `useProjects()` from `packages/client/src/context/projects-context.tsx` (Task 4) — provides `projects`, `isLoading`, `error`
- **Layout**: The dashboard renders inside `AppLayout` via `<Outlet />` (Task 5). The Header with logout button and Sidebar with "New Project" button are already present in the layout shell. The dashboard must not duplicate these elements.
- **Test infrastructure**: Vitest + React Testing Library + jsdom (installed in Task 1)
- **Prerequisite tasks**: Task 1 (UI components), Task 4 (ProjectsContext), Task 5 (AppLayout + router integration), Task 6 (Login page polish)
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 Dashboard Page Update (`dashboard-page.tsx`)

**Purpose**: Render the main content area for the `/` route. Displays project information from `ProjectsContext` with proper loading, error, and empty states. Provides a "New Project" button and a project grid/list layout that Phase 2 will populate with full project cards (create/edit/delete flows).

**Named export**: `DashboardPage` (unchanged)

**Current state analysis**: The existing `dashboard-page.tsx` has:
- A standalone `<header>` with "TaskBoard" branding, user name display, and a logout button — **must be removed** (now handled by the `Header` component in `AppLayout`)
- A `<main>` wrapper with `min-h-screen bg-gray-50` — **must be removed** (the `AppLayout`'s `<main>` already provides `bg-gray-50 p-6` and fills the remaining viewport space)
- A "Welcome, {user?.name}" heading — **needs to be replaced** with a "Projects" heading and project-oriented content
- Uses `useAuth()` for `user` and `logout` — **`logout` is no longer needed** (handled by Header), but `useAuth` import can be removed entirely since the dashboard doesn't need user info anymore

**Changes needed**:

1. **Remove `useAuth` import and usage** — The dashboard no longer needs `user` or `logout`. All auth-related UI is in the Header component.

2. **Add `useProjects` import** — The dashboard consumes `projects`, `isLoading`, and `error` from `ProjectsContext` to display project count and state-appropriate content.

3. **Add `LoadingSpinner` and `ErrorMessage` imports** — For loading and error states.

4. **Remove the standalone header** — The entire `<header>` block (lines 8-20) is removed. The `AppLayout` Header handles branding, user name, and logout.

5. **Remove the `<div className="min-h-screen bg-gray-50">` wrapper** — The page renders inside `AppLayout`'s `<main className="flex-1 overflow-y-auto bg-gray-50 p-6">`, so the page should not set its own background or min-height. The page renders directly as content within the `<Outlet />`.

6. **Add a page heading section** — A `<div>` at the top with a flex row containing:
   - An `<h2>` with `text-2xl font-semibold text-gray-900` displaying `"Projects"`. Uses `<h2>` because the `<h1>` is in the Header (page title "Projects"). However, since the Header already shows "Projects" as an `<h1>`, the dashboard heading creates a visual anchor for the main content area. Actually, to avoid duplicate headings (the Header already shows "Projects" as `<h1>`), the dashboard should use a different heading level or a different approach. Looking at the task spec: "Add a page title ('Projects' or 'Dashboard')". Since the Header already displays "Projects", having a second "Projects" heading in the content area would be redundant. Instead, the dashboard content area should have a brief summary line and action button, not a duplicate heading.

   Revised approach: The dashboard renders a top bar with a project count summary on the left and a "New Project" button on the right. No duplicate "Projects" heading since the Header already shows it.

   - Left side: A `<p>` with `text-sm text-gray-600` showing `"{count} project(s)"` or `"No projects yet"` based on the projects array length.
   - Right side: A `<button>` with `rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700` displaying `"New Project"`. This button is a no-op for now — Phase 2 will wire it to the create project modal. Note: The sidebar also has a "New Project" button, but the task spec explicitly says "Show a 'New Project' button that will be connected in Phase 2" for the dashboard page itself.

   Wait — re-reading the task spec: "Add a page title ('Projects' or 'Dashboard')". This explicitly asks for a page title. Even though the Header shows "Projects", having a content-area heading is a standard pattern (many apps have both a header bar title and a page-level heading). Let me check the sibling task plans for precedent — the board page placeholder (Task 8) says "Show the project name in a heading", so page-level headings within the content area are expected even when the Header has a title.

   Final approach: Render an `<h2>` with `text-2xl font-semibold text-gray-900` displaying `"Projects"` as the content-area heading. The Header's `<h1>` serves as the app-level page label; the `<h2>` serves as the content-area heading. This follows semantic HTML heading hierarchy (h1 in header, h2 in content).

7. **Render state-dependent content below the heading bar**:

   - **Loading state** (`isLoading === true`): Render a `<div>` with `py-12` containing `<LoadingSpinner />` (default `md` size). This is a full-section spinner while the project list is loading.

   - **Error state** (`isLoading === false` and `error !== null`): Render `<ErrorMessage message={error} />` without `onDismiss` since the error comes from the context's initial fetch and dismissing it wouldn't help — the user should refresh or check their connection.

   - **Empty state** (`isLoading === false`, `error === null`, `projects.length === 0`): Render an intentional empty-state card. A `<div>` with `rounded-lg border-2 border-dashed border-gray-300 p-12 text-center` containing:
     - A `<p>` with `text-sm text-gray-500` displaying `"No projects yet. Create your first project to get started."`.
     This dashed-border empty-state pattern is a common UI convention that signals "content goes here" without looking broken.

   - **Populated state** (`isLoading === false`, `error === null`, `projects.length > 0`): Render a grid of project cards. Use a `<div>` with `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` containing a card for each project. Each card is a `<div>` with `rounded-lg border border-gray-200 bg-white p-4 shadow-sm` containing:
     - An `<h3>` with `font-medium text-gray-900` displaying `project.name`.
     - If `project.description` exists, a `<p>` with `mt-1 text-sm text-gray-500 line-clamp-2` displaying the description (truncated to 2 lines via Tailwind's `line-clamp-2`). Note: `line-clamp-2` requires `@tailwindcss/line-clamp` plugin or Tailwind 3.3+ which includes it natively. Since the project uses Tailwind 3.4, `line-clamp` is built-in.
     - A `<p>` with `mt-2 text-xs text-gray-400` displaying the creation date formatted as a readable string using `new Date(project.createdAt).toLocaleDateString()`.

     This gives Phase 2 a solid foundation: each card already shows the key project info, and Phase 2 will add click-to-navigate, edit, and delete interactions.

**Imports**:
```typescript
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ErrorMessage } from "../components/ui/error-message";
```

**Full component**:

```tsx
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ErrorMessage } from "../components/ui/error-message";

export function DashboardPage() {
  const { projects, isLoading, error } = useProjects();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Projects</h2>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <h3 className="font-medium text-gray-900">{project.name}</h3>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {project.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Design decisions**:

1. **Removed all standalone layout elements**: The `<header>`, `min-h-screen`, `bg-gray-50`, and `mx-auto max-w-7xl` wrappers are all removed. The page renders as bare content inside `AppLayout`'s `<main className="flex-1 overflow-y-auto bg-gray-50 p-6">`, which already provides background color and padding.

2. **Removed `useAuth` dependency**: The dashboard no longer needs `user` or `logout`. All auth-related UI is in the Header component within `AppLayout`. This simplifies the component and its test setup.

3. **"New Project" button is a no-op**: The button has no `onClick` handler. Phase 2 will add the create project modal and wire the button. The task spec says "Show a 'New Project' button that will be connected in Phase 2". Having the button visible makes the page look intentional rather than bare.

4. **Project cards are read-only**: The cards display project name, description, and creation date but have no click handlers, edit buttons, or delete buttons. Phase 2 will add interactivity. The cards provide a visual scaffold that Phase 2 builds on.

5. **`<h2>` heading level**: Uses `<h2>` because the `<h1>` is in the Header component. This maintains proper semantic heading hierarchy for accessibility.

6. **No `useNavigate` or routing**: The cards don't link to board pages yet. Phase 2 will add click-to-navigate. The task spec says this is a skeleton, not the full dashboard.

7. **Error state without dismiss**: The `ErrorMessage` is rendered without `onDismiss` because the error comes from `ProjectsContext`'s initial fetch. Dismissing the error banner wouldn't clear the context's error state, and the user should address the underlying issue (server down, network error) rather than dismiss the message.

## 4. Contracts

### DashboardPage

**Input**: None (no props). Gets its data from:
- `useProjects()` hook — provides `projects`, `isLoading`, `error`

**Output**: Renders one of four states based on `ProjectsContext` data:

| State | Condition | Rendering |
|-------|-----------|-----------|
| Loading | `isLoading === true` | Centered `LoadingSpinner` below the heading bar |
| Error | `isLoading === false`, `error !== null` | `ErrorMessage` with the error text |
| Empty | `isLoading === false`, `error === null`, `projects.length === 0` | Dashed-border empty-state card with prompt text |
| Populated | `isLoading === false`, `error === null`, `projects.length > 0` | Responsive grid of project cards showing name, description, and date |

**Always visible**: A heading bar with `<h2>Projects</h2>` and a "New Project" button.

**Example usage** (inside `AppLayout`'s `<Outlet />`):
```tsx
<Route path="/" element={<DashboardPage />} />
```

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/pages/__tests__/dashboard-page.test.tsx`
- The DashboardPage uses `useProjects()`, which needs to be mocked.
- No router context is needed because the dashboard doesn't use any React Router hooks (`useNavigate`, `useParams`, `NavLink`, etc.).

### Mocking Strategy

Mock the `useProjects` hook to control the projects, loading, and error states:

```typescript
import { vi } from "vitest";

const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));
```

The mock is a `vi.fn()` so individual tests can override its return value via `mockReturnValue()`.

### Test Data

```typescript
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project description",
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

Note that `mockProjects[0]` has a `description` and `mockProjects[1]` does not. This lets tests verify both cases (description shown vs. not shown).

### 5.1 Dashboard Page Tests (`dashboard-page.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders the "Projects" heading | Verify an `<h2>` with text "Projects" exists |
| 2 | renders the "New Project" button | Verify a button with text "New Project" exists |
| 3 | shows loading spinner when projects are loading | Set `isLoading: true`, verify `LoadingSpinner` is rendered (`role="status"`) |
| 4 | does not show project cards when loading | Set `isLoading: true` with projects, verify project names are not rendered |
| 5 | shows error message when fetch fails | Set `error: "Network error"`, verify `ErrorMessage` (`role="alert"`) with text "Network error" appears |
| 6 | shows empty state when no projects | Set `projects: []`, `isLoading: false`, `error: null`, verify the text "No projects yet" is displayed |
| 7 | renders project cards when projects exist | Set `projects: mockProjects`, verify both project names ("Project Alpha", "Project Beta") are rendered |
| 8 | renders project description when present | With `mockProjects`, verify the text "First project description" appears for Project Alpha |
| 9 | does not render description paragraph when absent | With `mockProjects`, verify Project Beta's card does not have an extra description paragraph (check that "Project Beta" card doesn't contain unexpected text) |
| 10 | renders project creation dates | With `mockProjects`, verify that the formatted date strings appear (using `new Date("2025-01-15T00:00:00Z").toLocaleDateString()` to match the expected output) |
| 11 | does not render standalone logout button | In populated state, verify no button with text "Logout" exists (logout is in the Header, not the dashboard) |

### Test Implementation Notes

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardPage } from "../dashboard-page";
import type { Project } from "@taskboard/shared";

const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project description",
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

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue(defaultProjectsState());
  });

  it('renders the "Projects" heading', () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Projects");
  });

  it('renders the "New Project" button', () => {
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("shows loading spinner when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      isLoading: true,
    });
    render(<DashboardPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project cards when loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: mockProjects,
      isLoading: true,
    });
    render(<DashboardPage />);
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it("shows error message when fetch fails", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      error: "Network error",
    });
    render(<DashboardPage />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no projects", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
    });
    render(<DashboardPage />);
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("renders project cards when projects exist", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("renders project description when present", () => {
    render(<DashboardPage />);
    expect(screen.getByText("First project description")).toBeInTheDocument();
  });

  it("does not render description paragraph when absent", () => {
    // Project Beta has no description — verify no extra text besides name and date
    render(<DashboardPage />);
    const betaHeading = screen.getByText("Project Beta");
    const card = betaHeading.closest("div");
    // The card should contain the name, the date, but not a description paragraph
    expect(card?.querySelector("p.text-gray-500")).toBeNull();
  });

  it("renders project creation dates", () => {
    render(<DashboardPage />);
    const formattedDate = new Date("2025-01-15T00:00:00Z").toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it("does not render standalone logout button", () => {
    render(<DashboardPage />);
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });
});
```

**Key notes on test patterns**:

- Tests follow the same `describe/it/expect/vi/beforeEach` pattern used in all existing test files (`login-page.test.tsx`, `app-layout.test.tsx`, `header.test.tsx`, etc.).
- `mockUseProjects` is a `vi.fn()` that individual tests override via `mockReturnValue()`. The `beforeEach` sets a default "populated" state so most tests don't need explicit setup.
- `defaultProjectsState()` is a helper function (not a constant) to avoid shared mutable state between tests — each call returns a fresh object.
- No `MemoryRouter` wrapper is needed because `DashboardPage` doesn't use any React Router hooks or components.
- The "does not render description paragraph when absent" test checks that Project Beta's card (which has no `description`) doesn't have a `<p className="... text-gray-500">` child. This validates the conditional rendering of the description.
- The date test uses `new Date("2025-01-15T00:00:00Z").toLocaleDateString()` to compute the expected string, which adapts to the test runner's locale.
- The "does not render standalone logout button" test verifies the key behavioral change: removing the old standalone logout button (now handled by Header in AppLayout).

## 6. Implementation Order

1. **Modify `packages/client/src/pages/dashboard-page.tsx`** — Remove the standalone header/logout, replace with project-oriented content using `useProjects()`. All dependencies (LoadingSpinner, ErrorMessage, ProjectsContext) already exist from prior tasks.
2. **Create `packages/client/src/pages/__tests__/dashboard-page.test.tsx`** — Tests for the dashboard page. Depends on the modified source file.

## 7. Verification Commands

```bash
# 1. Verify the dashboard page file is updated
ls packages/client/src/pages/dashboard-page.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run dashboard page tests
cd packages/client && npx vitest run src/pages/__tests__/dashboard-page.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run

# 5. Manual verification (with running dev server):
# - Navigate to / after login → should show Projects heading and New Project button within the app shell
# - Sidebar and header should be visible (sidebar with project list, header with "Projects" title and logout)
# - No duplicate logout button in the main content area
# - If no projects exist → dashed-border empty state with "No projects yet" message
# - If projects exist → responsive grid of project cards with name, description (if present), and date
# - Loading state → spinner shown while projects are being fetched
# - Page should scroll independently from the sidebar when content overflows
```