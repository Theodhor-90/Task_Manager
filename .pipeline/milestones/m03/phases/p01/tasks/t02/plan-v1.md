Now I have all the information I need. Let me produce the implementation plan for Task 2 (Header Component).

# Task 2 Implementation Plan: Header Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/header.tsx` | Create | Top header bar for the authenticated app layout, showing page title, user info, and logout button |

## 2. Dependencies

- **Runtime**: React 19 (already installed), React Router DOM 6.15.0 (already installed)
- **Existing code**: `useAuth()` hook from `packages/client/src/context/auth-context.tsx` — provides `user` (with `name` property) and `logout()` function
- **Prerequisite tasks**: Task 1 (Shared UI Components) must be complete to establish the `components/ui/` directory pattern, though the Header does not directly import any Task 1 components
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 Header Component (`header.tsx`)

**Purpose**: Render a fixed-height horizontal header bar that sits at the top of the authenticated layout. Displays a page title on the left, and the user's display name with a logout button on the right.

**Named export**: `Header`

**Interface**:
```typescript
interface HeaderProps {
  title: string;
}
```

The `title` prop is a string passed by the parent layout component (`AppLayout`, built in Task 5). This keeps the Header simple — it receives the title as a prop rather than deriving it from the route, since the parent layout will have better context for determining the correct page title. This also makes the component easier to test.

**Implementation**:

- Outer `<header>` element with styling: `flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6`.
  - `h-14` — 56px fixed height, providing a consistent header bar.
  - `border-b border-gray-200` — subtle bottom border to visually separate from content area. This matches the existing dashboard header pattern in `dashboard-page.tsx` which uses `shadow-sm` on the header, but a border is cleaner and more consistent with a sidebar layout (shadows can create visual artifacts at sidebar/header junctions).
  - `bg-white` — white background, consistent with the existing dashboard header.
  - `px-6` — horizontal padding, consistent with common layout spacing (the sidebar will use `w-64` / 256px, so `px-6` provides comfortable breathing room in the header).
  - `flex items-center justify-between` — left/right alignment of title and user controls.

- **Left side**: An `<h1>` element with `text-lg font-semibold text-gray-900` displaying the `title` prop.
  - `text-lg` rather than `text-xl` since this header will coexist with the sidebar's branding. The header title is a page-level label, not the app title.
  - `font-semibold` matches the existing `text-2xl font-semibold` pattern used in the dashboard page for page-level headings, scaled down for the header bar.

- **Right side**: A `<div>` with `flex items-center gap-4` containing:
  - A `<span>` with `text-sm text-gray-600` displaying `user?.name`. This matches the exact pattern already used in `dashboard-page.tsx` line 12: `className="text-sm text-gray-600"` for the user name display.
  - A `<button>` for logout with `rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200`. This matches the exact button styling already used in `dashboard-page.tsx` line 14-16 for the existing logout button.
  - The button text is `"Logout"`.
  - The `onClick` handler calls `logout()` obtained from `useAuth()`.

**Imports**:
```typescript
import { useAuth } from "../context/auth-context";
```

**Full component structure**:
```tsx
export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.name}</span>
        <button
          onClick={logout}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
```

**Design decisions**:
- The component uses `useAuth()` directly rather than accepting `user` and `onLogout` as props. This is simpler and avoids unnecessary prop threading — the Header is always used within the authenticated layout where `AuthContext` is available. The auth context is already a project-level pattern (used in `login-page.tsx`, `dashboard-page.tsx`, `protected-route.tsx`).
- The `title` is a prop because different pages will need different titles ("Projects", "Board — Project Name", etc.), and the parent `AppLayout` component will determine the correct title based on the current route.
- No `shrink-0` or `flex-shrink-0` is needed on the header itself — it will be placed in a flex column layout by `AppLayout` where its fixed `h-14` is sufficient.

## 4. Contracts

### Header

**Input**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Page title displayed on the left side of the header |

**Output**: Renders a fixed-height header bar with title on the left, user name and logout button on the right.

**Example usage**:
```tsx
<Header title="Projects" />
<Header title="Board — My Project" />
```

**Context dependency**: Must be rendered within an `AuthProvider` context (which it will be, since it lives inside `AppLayout` which is inside `ProtectedRoute` and `AuthProvider`).

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/components/__tests__/header.test.tsx`
- The Header uses `useAuth()` and is rendered within a router context, so tests must wrap the component in the necessary providers or mock the hooks.

### Mocking Strategy

Mock the `useAuth` hook to avoid needing a full `AuthProvider` and router setup:

```typescript
import { vi } from "vitest";

const mockLogout = vi.fn();

vi.mock("../context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@test.com", name: "Admin User" },
    logout: mockLogout,
  }),
}));
```

Note: The import path in the mock uses `../context/auth-context` because the test file is at `components/__tests__/header.test.tsx` and the auth context is at `context/auth-context.tsx`. However, since vi.mock resolves based on the module specifier used in the source file, the correct path to mock is `"../../context/auth-context"` (matching the relative path from the test file to the module). Alternatively, since the Header imports from `"../context/auth-context"`, and the test sits one directory deeper, the mock path should be `"../../context/auth-context"`.

Actually, `vi.mock` resolves relative to the test file. The Header source imports `"../context/auth-context"` (relative to `components/header.tsx`). The test at `components/__tests__/header.test.tsx` needs to mock the same module. The correct approach is to use the path relative to the test file: `"../../context/auth-context"`.

### 5.1 Header Tests (`header.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | renders the page title | Pass `title="Projects"`, verify an `<h1>` with text "Projects" is in the document |
| 2 | renders the user display name | Verify the text "Admin User" (from mocked `useAuth`) appears in the document |
| 3 | renders the logout button | Verify a button with text "Logout" exists in the document |
| 4 | calls logout when logout button is clicked | Click the "Logout" button, verify the mocked `logout` function was called exactly once |
| 5 | renders with different title | Pass `title="Board — My Project"`, verify the heading shows "Board — My Project" |

### Test Implementation Notes

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "../header";

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

describe("Header", () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it("renders the page title", () => {
    render(<Header title="Projects" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projects");
  });

  it("renders the user display name", () => {
    render(<Header title="Projects" />);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("renders the logout button", () => {
    render(<Header title="Projects" />);
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });

  it("calls logout when logout button is clicked", () => {
    render(<Header title="Projects" />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders with different title", () => {
    render(<Header title="Board — My Project" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Board — My Project");
  });
});
```

## 6. Implementation Order

1. **Create `packages/client/src/components/header.tsx`** — the sole deliverable of this task. No dependencies on other new files.
2. **Create `packages/client/src/components/__tests__/header.test.tsx`** — tests for the Header component. Depends on the Header source file existing and on the test infrastructure set up in Task 1.

## 7. Verification Commands

```bash
# 1. Verify file exists
ls packages/client/src/components/header.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run Header tests
cd packages/client && npx vitest run src/components/__tests__/header.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run
```