Now I have all the information I need. Let me produce the implementation plan.

# Task 3 Implementation Plan: Sidebar Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/sidebar.tsx` | Create | Fixed-width left sidebar with app branding, "New Project" button, and scrollable project navigation list with active-project highlighting |
| 2 | `packages/client/src/components/__tests__/sidebar.test.tsx` | Create | Tests for the Sidebar component covering all rendering states and interactions |

## 2. Dependencies

- **Runtime**: React 19 (already installed), React Router DOM 6.15.0 (already installed — provides `NavLink`)
- **Existing components**: `LoadingSpinner` from `packages/client/src/components/ui/loading-spinner.tsx` (created in Task 1)
- **Shared types**: `Project` interface from `@taskboard/shared` — provides `_id`, `name`, `description`, etc.
- **Prerequisite tasks**: Task 1 (Shared UI Components) — the `LoadingSpinner` component is imported by the Sidebar
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 Sidebar Component (`sidebar.tsx`)

**Purpose**: Render a fixed-width vertical sidebar panel on the left side of the authenticated layout. Displays app branding, a "New Project" action button, and a scrollable list of project links with active-state highlighting.

**Named export**: `Sidebar`

**Interface**:
```typescript
import type { Project } from "@taskboard/shared";

interface SidebarProps {
  projects: Project[];
  isLoading: boolean;
  onCreateProject: () => void;
}
```

The Sidebar is a **presentational component** — it does not fetch data. It receives `projects`, `isLoading`, and `onCreateProject` as props from its parent (`AppLayout`, built in Task 5). This keeps data-fetching concerns out of the sidebar and makes it straightforward to test.

**Implementation**:

- Outer `<aside>` element with styling: `flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50`.
  - `w-64` — 256px fixed width, as specified in the phase spec and consistent with the `AppLayout` design decision (Task 5 will place this in a flex row where the sidebar has fixed width and main content fills remaining space).
  - `h-full` — fills the full height of its parent container (the layout row).
  - `flex flex-col` — vertical layout for branding, button, and project list sections.
  - `border-r border-gray-200` — right border to visually separate from the main content area. Uses the same `border-gray-200` color as the Header's `border-b`, establishing a consistent border treatment across the shell.
  - `bg-gray-50` — light gray background to visually distinguish the sidebar from the white main content area. This is a standard sidebar pattern that provides subtle contrast.

- **Branding section**: A `<div>` with `px-4 py-5` containing:
  - An `<h2>` with `text-lg font-bold text-gray-900` displaying `"TaskBoard"`.
  - `font-bold` (one step heavier than the Header's `font-semibold` page titles) because this is the app identity, not a page label.

- **New Project button**: A `<div>` with `px-3 pb-4` containing:
  - A `<button>` with `w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700`.
  - Button text: `"New Project"`.
  - `onClick` calls the `onCreateProject` prop.
  - `w-full` makes the button span the sidebar width minus padding.
  - `bg-blue-600 hover:bg-blue-700` uses the same blue accent as the `LoadingSpinner`'s `text-blue-600` and is the standard primary action color in the codebase.

- **Project list section**: A `<nav>` with `flex-1 overflow-y-auto px-3` containing the project links.
  - `flex-1` — takes all remaining vertical space after branding and button.
  - `overflow-y-auto` — scrolls vertically if the project list overflows.
  - `px-3` — horizontal padding for the links.

  **Three rendering states** inside the `<nav>`:

  1. **Loading state** (`isLoading` is `true`): Render a `<div>` with `py-4` containing `<LoadingSpinner size="sm" />`. Uses `sm` size since the sidebar is narrow and a large spinner would look disproportionate.

  2. **Empty state** (`isLoading` is `false` and `projects.length === 0`): Render a `<p>` with `py-4 text-center text-sm text-gray-500` displaying `"No projects yet"`.

  3. **Project list** (`isLoading` is `false` and `projects.length > 0`): Render a `<ul>` with `space-y-1` containing a `<li>` for each project. Each `<li>` contains a React Router `<NavLink>` element:
     - `to={`/projects/${project._id}/board`}`
     - Uses the `NavLink` `className` function form to apply active styling:
       ```tsx
       className={({ isActive }) =>
         `block rounded-md px-3 py-2 text-sm ${
           isActive
             ? "bg-blue-50 font-medium text-blue-700"
             : "text-gray-700 hover:bg-gray-100"
         }`
       }
       ```
     - **Active state**: `bg-blue-50 font-medium text-blue-700` — light blue background with blue text. This provides clear visual feedback for the currently active project without being overpowering. Uses the blue accent color family consistent with the primary action button.
     - **Inactive state**: `text-gray-700 hover:bg-gray-100` — standard gray text with a subtle hover background, consistent with the Header's logout button hover pattern.
     - `block` ensures the full link area is clickable, not just the text.
     - `rounded-md` matches the button and link rounding used throughout the codebase.
     - The link displays `project.name`.

**Imports**:
```typescript
import { NavLink } from "react-router-dom";
import type { Project } from "@taskboard/shared";
import { LoadingSpinner } from "./ui/loading-spinner";
```

**Full component structure**:
```tsx
export function Sidebar({ projects, isLoading, onCreateProject }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50">
      <div className="px-4 py-5">
        <h2 className="text-lg font-bold text-gray-900">TaskBoard</h2>
      </div>
      <div className="px-3 pb-4">
        <button
          onClick={onCreateProject}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        {isLoading ? (
          <div className="py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No projects yet</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project._id}>
                <NavLink
                  to={`/projects/${project._id}/board`}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  {project.name}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
```

**Design decisions**:
- The component is purely presentational — it receives all data via props and calls a callback for the "New Project" action. This follows the task spec explicitly: "Data fetching is NOT done inside the sidebar — it receives data from its parent."
- Uses `NavLink` from React Router rather than plain `Link` because `NavLink` provides the `isActive` prop in its `className` function, which is the idiomatic way to highlight the active route in React Router 6.
- The `Project` type is imported from `@taskboard/shared` (the same types package used elsewhere, e.g., `PRIORITIES` imported in `board-page.tsx`), not a locally defined interface. This ensures consistency with the server's response shape.
- No `shrink-0` or `flex-shrink-0` is added — the `w-64` fixed width combined with `flex-col` will be handled by the parent `AppLayout` flex container.

## 4. Contracts

### Sidebar

**Input**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projects` | `Project[]` | Yes | Array of projects to display in the navigation list |
| `isLoading` | `boolean` | Yes | Whether the project list is currently loading |
| `onCreateProject` | `() => void` | Yes | Callback fired when the "New Project" button is clicked |

Where `Project` is the `@taskboard/shared` interface:
```typescript
interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}
```

**Output**: Renders a fixed-width sidebar with branding, action button, and project navigation. Rendering varies by state:
- `isLoading === true` → shows `LoadingSpinner`
- `isLoading === false && projects.length === 0` → shows "No projects yet"
- `isLoading === false && projects.length > 0` → shows clickable project list with active highlighting

**Example usage**:
```tsx
<Sidebar
  projects={[
    { _id: "1", name: "My Project", owner: "u1", createdAt: "...", updatedAt: "..." },
    { _id: "2", name: "Another Project", owner: "u1", createdAt: "...", updatedAt: "..." },
  ]}
  isLoading={false}
  onCreateProject={() => setShowCreateModal(true)}
/>
```

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/components/__tests__/sidebar.test.tsx`
- The Sidebar uses React Router's `NavLink`, which requires a router context. Tests must wrap the component in a `MemoryRouter`.
- The Sidebar imports `LoadingSpinner`, which is a simple presentational component — no need to mock it. Let it render normally so we can verify the loading state renders correctly.

### Mocking Strategy

Unlike the Header tests which mock `useAuth`, the Sidebar is fully presentational with no context dependencies. However, it requires a `MemoryRouter` wrapper because `NavLink` must be rendered within a router context.

**Helper wrapper**:
```typescript
import { MemoryRouter } from "react-router-dom";

function renderSidebar(props: Partial<SidebarProps> = {}) {
  const defaultProps: SidebarProps = {
    projects: [],
    isLoading: false,
    onCreateProject: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <Sidebar {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}
```

### 5.1 Sidebar Tests (`sidebar.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders TaskBoard branding | Verify a heading with text "TaskBoard" is in the document |
| 2 | renders "New Project" button | Verify a button with text "New Project" exists in the document |
| 3 | calls onCreateProject when "New Project" button is clicked | Click the "New Project" button, verify the `onCreateProject` callback was called exactly once |
| 4 | shows loading spinner when isLoading is true | Pass `isLoading={true}`, verify the `LoadingSpinner` is rendered (check for `role="status"` element) |
| 5 | does not show project list when loading | Pass `isLoading={true}` with projects, verify project names are not rendered |
| 6 | shows empty state message when no projects | Pass `isLoading={false}` and `projects=[]`, verify the text "No projects yet" is displayed |
| 7 | renders project names as links | Pass `projects` array with two items, verify both project names are rendered as links |
| 8 | links point to correct board routes | Pass a project with `_id: "abc123"`, verify the link has `href="/projects/abc123/board"` |
| 9 | highlights active project link | Use `MemoryRouter` with `initialEntries={["/projects/abc123/board"]}`, verify the matching link has the active styling classes (`bg-blue-50`, `text-blue-700`) |
| 10 | does not highlight inactive project link | With two projects, verify the non-active project link has the inactive styling (`text-gray-700`) |

### Test Implementation Notes

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "../sidebar";
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    owner: "user1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  },
];

function renderSidebar(
  props: {
    projects?: Project[];
    isLoading?: boolean;
    onCreateProject?: () => void;
  } = {},
  initialEntries: string[] = ["/"],
) {
  const defaultProps = {
    projects: [],
    isLoading: false,
    onCreateProject: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Sidebar {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("renders TaskBoard branding", () => {
    renderSidebar();
    expect(screen.getByText("TaskBoard")).toBeInTheDocument();
  });

  it('renders "New Project" button', () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("calls onCreateProject when button is clicked", () => {
    const onCreateProject = vi.fn();
    renderSidebar({ onCreateProject });
    fireEvent.click(screen.getByRole("button", { name: "New Project" }));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner when isLoading is true", () => {
    renderSidebar({ isLoading: true });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project list when loading", () => {
    renderSidebar({ isLoading: true, projects: mockProjects });
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it("shows empty state message when no projects", () => {
    renderSidebar({ projects: [], isLoading: false });
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("renders project names as links", () => {
    renderSidebar({ projects: mockProjects });
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("links point to correct board routes", () => {
    renderSidebar({ projects: mockProjects });
    const link = screen.getByText("Project Alpha");
    expect(link.closest("a")).toHaveAttribute("href", "/projects/proj1/board");
  });

  it("highlights active project link", () => {
    renderSidebar({ projects: mockProjects }, ["/projects/proj1/board"]);
    const link = screen.getByText("Project Alpha");
    expect(link).toHaveClass("bg-blue-50", "text-blue-700");
  });

  it("does not highlight inactive project link", () => {
    renderSidebar({ projects: mockProjects }, ["/projects/proj1/board"]);
    const link = screen.getByText("Project Beta");
    expect(link).toHaveClass("text-gray-700");
  });
});
```

**Key notes on the test patterns**:
- Tests use the same `describe/it/expect/vi` imports from Vitest as the existing `header.test.tsx` and `modal.test.tsx`.
- `MemoryRouter` wraps the Sidebar in all tests because `NavLink` requires router context. The `initialEntries` parameter controls the simulated URL for active-state tests.
- The `renderSidebar` helper follows a similar pattern to how `header.test.tsx` renders the `Header` component with default props.
- Active-state tests (tests 9 and 10) verify the Tailwind classes applied by the `NavLink` className function. This works because React Router's `NavLink` evaluates `isActive` based on the current URL in the `MemoryRouter`.
- No mocking of `LoadingSpinner` — it renders naturally, and we verify its presence via `role="status"` (which `LoadingSpinner` applies to its SVG element).

## 6. Implementation Order

1. **Create `packages/client/src/components/sidebar.tsx`** — the primary deliverable. Depends on `LoadingSpinner` from Task 1 (already completed) and `@taskboard/shared` types (already available). No dependencies on other new files.
2. **Create `packages/client/src/components/__tests__/sidebar.test.tsx`** — tests for the Sidebar component. Depends on the Sidebar source file existing and on the test infrastructure set up in Task 1.

## 7. Verification Commands

```bash
# 1. Verify file exists
ls packages/client/src/components/sidebar.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run Sidebar tests
cd packages/client && npx vitest run src/components/__tests__/sidebar.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run
```