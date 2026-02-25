Now I have a complete picture of the entire codebase. Let me write the implementation plan.

# Task 6 Implementation Plan: Integration Verification and Test Cleanup

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/pages/__tests__/login-page.test.tsx` | Modify | Fix the `act()` warning in the "error message is dismissable" test by wrapping the dismiss click in `act` |
| 2 | (No other file changes) | — | All 133 tests already pass; TypeScript compiles cleanly; no lint script is configured |

## 2. Dependencies

### Prerequisites
- **Tasks 1–5 completed**: All Phase 2 source code and test code is implemented and committed
- **All client tests passing**: 133/133 tests pass across 13 test files
- **TypeScript clean**: `tsc --noEmit` reports zero errors
- **Production build succeeds**: `vite build` completes successfully (51 modules, 231.87 KB JS bundle)

### Current State Assessment

| Check | Current Status |
|-------|---------------|
| Test files | 13 files, all passing |
| Total tests | 133, all passing |
| TypeScript | Zero errors |
| Vite build | Succeeds |
| Lint script | Not configured (`package.json` has no `lint` script) |
| Console warnings | 1 non-fatal `act()` warning in `login-page.test.tsx` |

## 3. Implementation Details

### 3.1 Fix `act()` Warning in `login-page.test.tsx`

**Problem**: The "error message is dismissable" test (line 145) produces a React `act()` warning in stderr:

```
Warning: An update to LoginPage inside a test was not wrapped in act(...)
```

This occurs because the test clicks the "Dismiss" button (line 157) which triggers a state update (`setError("")` in `login-page.tsx` line 51), but this `fireEvent.click` happens outside of an `act()` wrapper and after the async `waitFor` block. The state update from clicking dismiss is synchronous, but because the component has a pending async state update from the resolved `mockLogin` promise (the `finally` block on line 39 calls `setIsSubmitting(false)`), React warns about the uncontrolled state update.

**Fix**: Wrap the dismiss interaction in a `waitFor` to properly handle the state update:

```typescript
// Before (line 157-158):
fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
expect(screen.queryByRole("alert")).not.toBeInTheDocument();

// After:
fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
await waitFor(() => {
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

This ensures React processes all pending state updates before the assertion runs, eliminating the `act()` warning.

### 3.2 Verification Steps (No Code Changes)

These are verification-only steps confirming the Phase 2 implementation is complete and correct:

#### 3.2.1 Automated Verification

1. **Run all client tests** — confirm 133/133 pass with zero failures
2. **Run TypeScript typecheck** — confirm zero errors from `tsc --noEmit`
3. **Run production build** — confirm `vite build` succeeds

#### 3.2.2 Phase 2 Exit Criteria Checklist

Verify each exit criterion against the implemented code:

| # | Exit Criterion | Verified By |
|---|---------------|-------------|
| 1 | "New Project" button on dashboard opens modal with name/description fields; submitting creates project in grid and sidebar | `dashboard-page.test.tsx` tests 12-13; `project-form-modal.test.tsx` test 9; `projects-context.test.tsx` test 3 |
| 2 | "New Project" button in sidebar opens the same create modal | `app-layout.test.tsx` tests 10-12 |
| 3 | Each project card displays name, truncated description, creation date, and navigates to `/projects/:id/board` | `project-card.test.tsx` tests 1-5 |
| 4 | Edit button opens modal pre-filled with current data; saving updates grid and sidebar | `dashboard-page.test.tsx` tests 14-15; `project-form-modal.test.tsx` tests 3, 5, 10; `sidebar.test.tsx` test 12 |
| 5 | Delete button opens confirmation dialog with cascade warning; confirming deletes from grid and sidebar | `dashboard-page.test.tsx` tests 16-17, 22-23; `sidebar.test.tsx` test 13 |
| 6 | Canceling create/edit/delete leaves project list unchanged | `dashboard-page.test.tsx` tests 13, 15, 18 |
| 7 | API errors during CRUD display error message without losing form data or corrupting project list | `project-form-modal.test.tsx` tests 11-12; `dashboard-page.test.tsx` tests 19-20; `projects-context.test.tsx` test 9 |
| 8 | Sidebar project list stays in sync for all operations | `sidebar.test.tsx` tests 11-14 (props-driven synchronization); `projects-context.test.tsx` tests 3, 6, 8 (shared context state) |
| 9 | All client-side unit tests pass | `npm run test -w packages/client` → 133/133 |
| 10 | No TypeScript compilation errors | `npx -w packages/client tsc --noEmit` → 0 errors |

#### 3.2.3 Manual Verification Flow

Against the running dev server (`npm run dev`):

1. Login with seed user credentials (`admin@taskboard.local` / `admin123`)
2. Create a new project via the dashboard "New Project" button → verify it appears in both the dashboard grid and sidebar
3. Create a project via the sidebar "New Project" button → verify same result
4. Edit a project's name and description → verify changes reflected in both dashboard and sidebar
5. Delete a project → confirm in dialog → verify project removed from both dashboard and sidebar
6. Click a project card → verify navigation to `/projects/:id/board`
7. Verify the board page placeholder renders correctly with the project name

## 4. Contracts

This task has no new component contracts. All contracts were established in Tasks 1–5.

### Test Coverage Summary

| Test File | Tests | Coverage Area |
|-----------|-------|--------------|
| `project-form-modal.test.tsx` | 14 | Create/edit modal form, validation, API interaction, error handling |
| `project-card.test.tsx` | 10 | Card rendering, navigation, action button propagation prevention |
| `dashboard-page.test.tsx` | 23 | Full CRUD wiring, modal/dialog state management, error display |
| `app-layout.test.tsx` | 12 | Layout rendering, sidebar create button → modal wiring |
| `sidebar.test.tsx` | 14 | Project list rendering, active highlighting, props-driven sync |
| `login-page.test.tsx` | 12 | Auth flow, form validation, error display, redirect |
| `board-page.test.tsx` | 8 | Placeholder rendering, project lookup, loading state |
| `projects-context.test.tsx` | 11 | Context CRUD operations, optimistic updates, error rollback |
| `header.test.tsx` | 5 | Header rendering, logout button |
| `modal.test.tsx` | varies | Modal overlay, ESC close, backdrop close |
| `confirm-dialog.test.tsx` | varies | Confirm/cancel buttons, message display |
| `error-message.test.tsx` | varies | Alert rendering, dismiss button |
| `loading-spinner.test.tsx` | varies | Spinner rendering, size variants |

**Total: 133 tests across 13 files**

## 5. Test Plan

### 5.1 Fix Verification

After modifying `login-page.test.tsx`:

1. Run the specific test file and verify 12/12 tests pass
2. Verify the `act()` warning no longer appears in stderr
3. Run all client tests to confirm no regressions

### 5.2 Full Suite Regression

Run the complete test suite and verify:
- All 133 tests pass
- No console warnings or errors in stderr (the `act()` warning should be gone after the fix)
- TypeScript compiles cleanly
- Production build succeeds

## 6. Implementation Order

1. **Fix `login-page.test.tsx`** — wrap the dismiss assertion in `waitFor` to eliminate the `act()` warning
2. **Run the login page test file** — verify 12/12 pass and no `act()` warning
3. **Run all client tests** — verify 133/133 pass, zero failures, zero warnings
4. **Run TypeScript typecheck** — verify zero errors
5. **Run production build** — verify build succeeds
6. **Manual verification** — test all CRUD flows against the running dev server (if server is available)

## 7. Verification Commands

```bash
# Run only the fixed test file and check for act() warning
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vitest run src/pages/__tests__/login-page.test.tsx 2>&1

# Run all client tests
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm run test -w packages/client

# TypeScript typecheck
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client tsc --noEmit

# Production build
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vite build

# Run all tests across all workspaces (client + server)
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm test
```