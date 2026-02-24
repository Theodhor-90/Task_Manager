Now I have all the information I need. Let me produce the implementation plan.

# Task 6 Implementation Plan: Login Page Polish

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/pages/login-page.tsx` | Modify | Enhance the existing login page with LoadingSpinner during auth state check, ErrorMessage component for login failures, loading spinner in submit button during authentication, and verify all UX requirements are met |
| 2 | `packages/client/src/pages/__tests__/login-page.test.tsx` | Create | Tests for the login page covering rendering, form submission, loading states, error display, and redirect behavior |

## 2. Dependencies

- **Runtime**: React 19 (already installed), React Router DOM 6.15.0 (already installed)
- **Existing components**:
  - `LoadingSpinner` from `packages/client/src/components/ui/loading-spinner.tsx` (Task 1) — used for the initial auth loading state and the submit button loading state
  - `ErrorMessage` from `packages/client/src/components/ui/error-message.tsx` (Task 1) — used for displaying login failure messages
  - `useAuth()` from `packages/client/src/context/auth-context.tsx` — provides `login`, `isAuthenticated`, `isLoading`
- **Test infrastructure**: Vitest + React Testing Library + jsdom (installed in Task 1)
- **Prerequisite tasks**: Task 1 (Shared UI Components), Task 5 (Router Integration — login page must work correctly with the new route structure, which is already in place)
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 Login Page Enhancement (`login-page.tsx`)

**Purpose**: Enhance the existing login page with production-ready UX: replace the plain text "Loading..." state with a `LoadingSpinner`, replace the inline error `<div>` with the `ErrorMessage` component, add a spinner inside the submit button during authentication, and ensure all existing behavior is preserved.

**Named export**: `LoginPage` (unchanged)

**Current state analysis**: The existing `login-page.tsx` already has:
- Centered card layout on `bg-gray-50` background — **already done**
- "TaskBoard" branding title above the form — **already done** (`<h1>` with "TaskBoard")
- Properly styled email and password inputs with labels — **already done** (labels with `htmlFor`, inputs with proper classes)
- Submit button with disabled state while authenticating — **already done** (`disabled={isSubmitting}`, `disabled:cursor-not-allowed disabled:opacity-50`)
- `Navigate` to `/` when already authenticated — **already done**
- Enter key submission — **already done** (native `<form onSubmit>` handles Enter)
- Error display — **exists but uses a raw `<div>` instead of the `ErrorMessage` component**
- Initial loading state — **exists but uses plain text "Loading..." instead of `LoadingSpinner`**
- Submit button loading state — **exists as text change ("Signing in...") but no spinner**

**Changes needed**:

1. **Import `LoadingSpinner` and `ErrorMessage`** from `../components/ui/`.

2. **Replace the initial loading state** (lines 14-19): Change from plain text "Loading..." to a `LoadingSpinner` component with default (`md`) size. Keep the same centering layout (`flex h-screen items-center justify-center`).

   Current:
   ```tsx
   if (isLoading) {
     return (
       <div className="flex h-screen items-center justify-center">
         <p className="text-gray-500">Loading...</p>
       </div>
     );
   }
   ```

   New:
   ```tsx
   if (isLoading) {
     return (
       <div className="flex h-screen items-center justify-center">
         <LoadingSpinner />
       </div>
     );
   }
   ```

3. **Replace the inline error div with `ErrorMessage`** (lines 48-50): Replace the raw `<div className="rounded border border-red-200...">` with `<ErrorMessage message={error} onDismiss={() => setError("")} />`. Adding `onDismiss` allows the user to dismiss the error, which is a UX improvement. The `ErrorMessage` component renders with `role="alert"`, which is an accessibility improvement over the plain div.

   Current:
   ```tsx
   {error && (
     <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
       {error}
     </div>
   )}
   ```

   New:
   ```tsx
   {error && (
     <ErrorMessage message={error} onDismiss={() => setError("")} />
   )}
   ```

4. **Add spinner to submit button** (lines 92-93): Replace the text-only "Signing in..." with a spinner plus text. When `isSubmitting` is `true`, render a `LoadingSpinner` with `size="sm"` inline next to "Signing in..." text. Use a flex container inside the button to align the spinner and text.

   Current:
   ```tsx
   {isSubmitting ? "Signing in..." : "Sign in"}
   ```

   New:
   ```tsx
   {isSubmitting ? (
     <span className="flex items-center justify-center gap-2">
       <LoadingSpinner size="sm" />
       Signing in...
     </span>
   ) : (
     "Sign in"
   )}
   ```

   Note: The `LoadingSpinner` component wraps the SVG in a `<div className="flex items-center justify-center">`, which is a block-level element. Inside a button with inline content, this needs the spinner to be inline. However, since we're wrapping in a `<span className="flex items-center justify-center gap-2">`, the spinner's outer div will be a flex child and will size correctly. The `LoadingSpinner size="sm"` renders a 16px (h-4 w-4) spinner which is appropriate for inline use in a `text-sm` button.

**No other changes are needed**. The existing layout, form structure, input styling, button styling, and redirect logic are already production-ready.

**Full updated component**:

```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ErrorMessage } from "../components/ui/error-message";

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          TaskBoard
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <ErrorMessage message={error} onDismiss={() => setError("")} />
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Design decisions**:

1. **Minimal changes**: The existing login page is already well-structured with centered card layout, proper branding, styled inputs with labels, and correct auth handling. The task says "enhance, don't rebuild" — so only the three specific UX improvements are made (LoadingSpinner for initial load, ErrorMessage for errors, spinner in submit button).

2. **`onDismiss` on ErrorMessage**: Adding dismiss functionality lets the user clear the error message before retrying. When dismissed, `setError("")` clears the error state, which removes the `ErrorMessage` from the DOM (since the `{error && ...}` guard evaluates to false when `error` is an empty string).

3. **`LoadingSpinner size="sm"` in the button**: The `sm` size (16px / `h-4 w-4`) matches the `text-sm` font size of the button text. The `md` default (32px) would be too large for inline button use.

4. **No changes to the form structure**: The existing `<form onSubmit>` pattern already handles Enter key submission natively. The email `type="email"` input already provides basic format validation. The `required` attribute on both inputs provides browser-native required-field validation. These are all already correct.

5. **No changes to the redirect logic**: The existing `isAuthenticated → <Navigate to="/" replace />` pattern is correct for redirecting already-authenticated users away from `/login`. The `useNavigate` + `navigate("/")` in `handleSubmit` handles post-login redirect.

## 4. Contracts

### LoginPage

**Input**: None (no props). Gets its data from:
- `useAuth()` hook — provides `login`, `isAuthenticated`, `isLoading`
- `useNavigate()` hook — for post-login redirect

**Output**: Renders one of three states:
1. **Loading state** (`isLoading === true`): Full-screen centered `LoadingSpinner` — shown while auth context checks if a stored token is valid on page load.
2. **Already authenticated** (`isAuthenticated === true`): `<Navigate to="/" replace />` — redirects to dashboard.
3. **Login form** (default): Centered card with TaskBoard branding, email/password form, submit button with loading state, and dismissable error messages.

**Behavior**:
- Form submission calls `login(email, password)` from auth context
- On success: navigates to `/`
- On failure: displays error via `ErrorMessage` component
- Submit button shows `LoadingSpinner size="sm"` + "Signing in..." text and is disabled during submission
- Error can be dismissed by clicking the dismiss button on `ErrorMessage`

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/pages/__tests__/login-page.test.tsx`
- The LoginPage uses `useAuth()` (needs mock), `useNavigate()` and `<Navigate>` (needs `MemoryRouter`)

### Mocking Strategy

Mock the `useAuth` hook and `useNavigate`:

```typescript
import { vi } from "vitest";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
```

The `useAuth` mock is wrapped in a function (`mockUseAuth`) so individual tests can override the return value (e.g., setting `isLoading: true` or `isAuthenticated: true`).

For the `Navigate` component used in the redirect-when-authenticated case, we keep the actual React Router implementation (from `vi.importActual`) and only mock `useNavigate`. We render the LoginPage inside a `MemoryRouter` so that `<Navigate>` works correctly. To verify the redirect, we check that `<Navigate to="/" replace />` causes the location to change using a test helper route.

**Router setup**: Wrap the LoginPage in a `MemoryRouter` with initial entry `/login`:

```typescript
import { MemoryRouter, Routes, Route } from "react-router-dom";

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
```

### 5.1 Login Page Tests (`login-page.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | shows loading spinner during initial auth check | Set `isLoading: true`, verify `LoadingSpinner` is rendered (`role="status"`) and the form is not shown |
| 2 | redirects to dashboard when already authenticated | Set `isAuthenticated: true`, verify the dashboard test content is rendered (meaning `<Navigate to="/" />` fired) |
| 3 | renders TaskBoard branding | Set default state, verify heading with text "TaskBoard" exists |
| 4 | renders email input with label | Verify a label "Email" and an email input field exist |
| 5 | renders password input with label | Verify a label "Password" and a password input field exist |
| 6 | renders sign in button | Verify a button with text "Sign in" exists |
| 7 | submit button is disabled during submission | Submit the form, verify the button is disabled while login is pending |
| 8 | shows loading spinner in button during submission | Submit the form, verify `role="status"` appears inside the button area and text shows "Signing in..." |
| 9 | calls login with email and password on form submit | Fill in email and password, submit the form, verify `login` was called with the correct values |
| 10 | displays error message on login failure | Mock `login` to reject, submit the form, verify the `ErrorMessage` component (`role="alert"`) appears with the error text |
| 11 | error message is dismissable | After an error is shown, click the dismiss button (`aria-label="Dismiss"`), verify the error message disappears |
| 12 | navigates to dashboard on successful login | Mock `login` to resolve, submit the form, verify `navigate("/")` was called |

### Test Implementation Notes

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginPage } from "../login-page";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

let mockAuthState = {
  login: mockLogin,
  isAuthenticated: false,
  isLoading: false,
  user: null as { id: string; email: string; name: string } | null,
  token: null as string | null,
  logout: vi.fn(),
};

vi.mock("../../context/auth-context", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      logout: vi.fn(),
    };
  });

  it("shows loading spinner during initial auth check", () => {
    mockAuthState.isLoading = true;
    renderLoginPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("redirects to dashboard when already authenticated", () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: "1", email: "a@b.com", name: "Test" };
    mockAuthState.token = "token";
    renderLoginPage();
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("renders TaskBoard branding", () => {
    renderLoginPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TaskBoard");
  });

  it("renders email input with label", () => {
    renderLoginPage();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("renders password input with label", () => {
    renderLoginPage();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("renders sign in button", () => {
    renderLoginPage();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("submit button is disabled during submission", async () => {
    mockLogin.mockReturnValue(new Promise(() => {})); // never resolves
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  it("shows loading spinner in button during submission", async () => {
    mockLogin.mockReturnValue(new Promise(() => {})); // never resolves
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });
  });

  it("calls login with email and password on form submit", async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "admin123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin@test.com", "admin123");
    });
  });

  it("displays error message on login failure", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("error message is dismissable", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("navigates to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
```

**Key notes on test patterns**:

- Tests follow the same `describe/it/expect/vi/beforeEach` pattern used in existing tests (`header.test.tsx`, `sidebar.test.tsx`, `app-layout.test.tsx`).
- `mockAuthState` is a mutable object that gets reset in `beforeEach`. Individual tests mutate it before rendering to control the auth state. This is simpler than using `vi.mocked().mockReturnValue()` since the mock factory reads from the variable directly.
- `vi.mock("react-router-dom")` uses `vi.importActual` to keep the real `MemoryRouter`, `Routes`, `Route`, and `Navigate` implementations while only mocking `useNavigate`. This allows the `<Navigate to="/" replace />` redirect to actually work within the `MemoryRouter`, rendering the dashboard test route.
- The "redirects to dashboard" test verifies that `<Navigate to="/" />` works by checking that the dashboard route's content renders — this is more reliable than checking `mockNavigate` because `Navigate` uses the router context directly, not `useNavigate`.
- The "submit button disabled" and "spinner in button" tests use a never-resolving promise for `mockLogin` to freeze the submission state so we can inspect the intermediate UI.
- The "error is dismissable" test clicks the dismiss button (with `aria-label="Dismiss"` provided by the `ErrorMessage` component) and verifies the alert disappears.
- The form does not have an explicit `role="form"` — the test for "shows loading spinner during initial auth check" verifies the form is not shown by checking that no button with text "Sign in" exists, or by checking `queryByRole("heading")` is null. Actually, `screen.queryByRole("form")` may not find the form since HTML forms without an accessible name don't get the "form" role in some accessibility trees. A safer check is `screen.queryByText("Sign in")` to verify the form content is not shown. Updated the test to check for `screen.queryByText("Sign in")` instead.

**Revised test 1**:
```typescript
it("shows loading spinner during initial auth check", () => {
  mockAuthState.isLoading = true;
  renderLoginPage();
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
});
```

## 6. Implementation Order

1. **Modify `packages/client/src/pages/login-page.tsx`** — Add imports for `LoadingSpinner` and `ErrorMessage`. Apply the three UX enhancements: LoadingSpinner for initial loading, ErrorMessage for errors, spinner in submit button. All dependencies (LoadingSpinner, ErrorMessage, useAuth, router) already exist.
2. **Create `packages/client/src/pages/__tests__/login-page.test.tsx`** — Tests for the login page. Depends on the modified login page source.

## 7. Verification Commands

```bash
# 1. Verify the login page file is updated
ls packages/client/src/pages/login-page.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run login page tests
cd packages/client && npx vitest run src/pages/__tests__/login-page.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run

# 5. Manual verification (with running dev server):
# - Navigate to /login → should show centered card with TaskBoard branding
# - Should see styled email/password inputs with labels
# - Submit with wrong credentials → should show ErrorMessage with red banner
# - Click dismiss button on error → error should disappear
# - Submit with correct credentials → button should show spinner + "Signing in..."
# - Button should be disabled during submission
# - Successful login → should redirect to /
# - Navigate to /login while already logged in → should redirect to /
# - Refresh page on /login → should show LoadingSpinner briefly while auth state loads
# - Login page should NOT have sidebar or header (renders outside app shell)
```