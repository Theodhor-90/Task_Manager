I now have all the information needed to produce the plan. Let me write it.

# Task 7 Plan — Delete Task with Confirmation

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/components/task-detail-panel.tsx` | **Modify** | Add a "Delete task" button, `ConfirmDialog` integration, and delete error display |
| 2 | `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | **Modify** | Add unit tests for delete button, confirmation flow, success/close, cancel, and error display |

---

## 2. Dependencies

- **Sibling tasks (completed)**:
  - Task 3: `removeTask(taskId)` method in `BoardContext` — calls `DELETE /api/tasks/:id` and removes the task from local state
  - Task 4: `TaskDetailPanel` component exists with data loading, title editing, and close behavior
- **Existing infrastructure**:
  - `packages/client/src/components/ui/confirm-dialog.tsx` — `ConfirmDialog` component with props: `isOpen`, `message`, `confirmLabel`, `onConfirm`, `onCancel`
  - `packages/client/src/components/ui/error-message.tsx` — `ErrorMessage` component with optional `onDismiss` prop
  - `packages/client/src/context/board-context.tsx` — `useBoard()` provides `removeTask(taskId): Promise<void>`
- **No new npm packages required**

---

## 3. Implementation Details

### 3.1 Modify `packages/client/src/components/task-detail-panel.tsx`

#### 3.1.1 New import

Add `ConfirmDialog` to the imports at the top of the file, after the existing `ErrorMessage` import:

```typescript
import { ConfirmDialog } from "./ui/confirm-dialog";
```

#### 3.1.2 New state variables

Add inside the `TaskDetailPanel` function, after the existing state declarations (`editDescription`):

```typescript
const [showConfirm, setShowConfirm] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);
```

- `showConfirm` — controls the visibility of the `ConfirmDialog`; initially `false`
- `deleteError` — holds an error message if the delete API call fails; initially `null`

#### 3.1.3 Update context destructuring

Change the existing line:

```typescript
const { updateTask } = useBoard();
```

To:

```typescript
const { updateTask, removeTask } = useBoard();
```

#### 3.1.4 Delete handler

Add after `handleClearDueDate`:

```typescript
async function handleDelete() {
  setShowConfirm(false);
  setDeleteError(null);
  try {
    await removeTask(taskId);
    onClose();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    setDeleteError(message);
  }
}
```

**Key design decisions**:
- **Close dialog first**: `setShowConfirm(false)` is called immediately, before the async operation, so the dialog disappears right away. This matches the pattern in `column.tsx` (line 84).
- **Clear previous error**: `setDeleteError(null)` clears any prior error before retrying.
- **On success, close the panel**: `onClose()` is called after `removeTask` succeeds. The `removeTask` method already removes the task from `BoardContext.tasks`, so the board behind the panel will update immediately.
- **On failure, show error in the panel**: The error message is stored in `deleteError` and displayed via `ErrorMessage` in the panel body. The panel stays open so the user can retry.
- **Error message extraction**: Follows the same `err instanceof Error ? err.message : fallback` pattern used throughout the codebase.

#### 3.1.5 Delete button JSX

Add inside the `{!isLoading && !error && task && ( ... )}` block, after the metadata section `</div>` (the priority/due-date grid), before the closing `</>`:

```tsx
{/* Delete error */}
{deleteError && (
  <div className="mt-6">
    <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
  </div>
)}

{/* Delete task button */}
<div className="mt-6 border-t border-gray-200 pt-4">
  <button
    onClick={() => setShowConfirm(true)}
    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
  >
    Delete task
  </button>
</div>
```

**Key styling decisions**:
- **Destructive styling**: Red text (`text-red-600`) with red outline border (`border-red-300`), matching the task spec's requirement for "red text or outline." On hover, a light red background (`hover:bg-red-50`) provides visual feedback.
- **Separator**: A top border (`border-t border-gray-200`) visually separates the delete action from the metadata above, signaling it's a distinct, dangerous action.
- **Error display**: Uses `ErrorMessage` with `onDismiss` prop (same pattern as `column.tsx` line 159), placed above the delete button so the error is visible near the action that caused it.

#### 3.1.6 ConfirmDialog JSX

Add inside the `createPortal` return, after the panel `</div>` but still inside the overlay `<div>`, or alternatively inside the panel body after the task content. However, since `ConfirmDialog` uses `Modal` which itself uses `createPortal`, placement within the component JSX is flexible — it renders to `document.body` regardless.

Add just before the closing of the `{!isLoading && !error && task && ( ... )}` fragment, after the delete button `</div>`:

```tsx
{/* Confirm dialog for delete */}
<ConfirmDialog
  isOpen={showConfirm}
  message="Are you sure you want to delete this task? This action cannot be undone."
  confirmLabel="Delete"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

**Key design decisions**:
- **Message text**: Matches the exact wording from the task spec.
- **Confirm label**: "Delete" matches the pattern used by `column.tsx` and `dashboard-page.tsx`.
- **`onCancel`**: Simply hides the dialog without side effects.
- **`ConfirmDialog` uses `Modal`**: The `Modal` component uses `createPortal` to render to `document.body`, so the dialog will appear above the panel overlay. The `Modal` has its own Escape key handler and backdrop click handler, which call `onClose` (mapped to `onCancel` here). There is a potential conflict with the panel's Escape key handler — when the `ConfirmDialog` is open, pressing Escape should close the dialog, not the panel. The `Modal` component's Escape handler calls `event.stopPropagation()` (or if it doesn't, the dialog's `onCancel` will fire first since it's higher in the DOM stacking order). We need to verify this doesn't cause issues — see 3.1.7.

#### 3.1.7 Escape key interaction with ConfirmDialog

When `showConfirm` is `true` and the user presses Escape, both the `Modal`'s Escape handler (inside `ConfirmDialog`) and the panel's Escape handler could fire. To prevent the panel from closing when the dialog is dismissed, update the panel's Escape key listener to check `showConfirm`:

Update the existing Escape key `useEffect`:

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (showConfirm) {
        // Let the ConfirmDialog handle its own Escape
        return;
      }
      if (isEditingTitle) {
        setEditTitle(task?.title ?? "");
        setIsEditingTitle(false);
      } else {
        onClose();
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onClose, isEditingTitle, task, showConfirm]);
```

The change is:
- Add `showConfirm` to the check at the top: if the confirm dialog is open, the panel's Escape handler returns early and does nothing — the `ConfirmDialog`/`Modal` handles its own Escape behavior.
- Add `showConfirm` to the dependency array.

#### 3.1.8 What NOT to do

- Do **not** add a loading/spinner state for the delete operation — the `ConfirmDialog` closes immediately, and `removeTask` is fast enough that no intermediate state is needed. If it fails, the error appears in the panel.
- Do **not** disable the delete button during the API call — the dialog is already closed, so the user can't double-click the confirm button. If the delete fails, the user can click "Delete task" again to retry.
- Do **not** add a separate `ConfirmDialog` test mock — the existing `Modal` mock (if any) or the real `ConfirmDialog` can be used in tests. Since `ConfirmDialog` uses `Modal` which uses `createPortal`, the dialog content renders to `document.body` and is queryable by RTL. The existing test file does not mock `ConfirmDialog` or `Modal`, so the real components will be used.

---

## 4. Contracts

### Delete Button

| Attribute | Details |
|-----------|---------|
| **Element** | `<button>` with text "Delete task" |
| **Styling** | `border border-red-300 text-red-600 hover:bg-red-50` — destructive appearance |
| **On click** | Sets `showConfirm` to `true`, opening the `ConfirmDialog` |

### ConfirmDialog Integration

| Attribute | Details |
|-----------|---------|
| **`isOpen`** | Controlled by `showConfirm` state |
| **`message`** | "Are you sure you want to delete this task? This action cannot be undone." |
| **`confirmLabel`** | "Delete" |
| **`onConfirm`** | Calls `handleDelete`: closes dialog → calls `removeTask(taskId)` → on success calls `onClose()` → on failure sets `deleteError` |
| **`onCancel`** | Sets `showConfirm` to `false` |

### Interactions and Effects

| User Action | Internal Effect | External Effect (via BoardContext) |
|-------------|----------------|-----------------------------------|
| Click "Delete task" button | `setShowConfirm(true)` — dialog opens | None |
| Click "Cancel" in dialog | `setShowConfirm(false)` — dialog closes | None |
| Click "Delete" in dialog | Dialog closes → `removeTask(taskId)` called → on success: `onClose()` called | `removeTask` calls `DELETE /api/tasks/:id` and removes task from `BoardContext.tasks` — the `TaskCard` disappears from the board |
| Delete fails | `deleteError` set to error message; panel stays open | None |
| Escape while dialog is open | Panel's Escape handler returns early; `ConfirmDialog`/`Modal` handles its own Escape → dialog closes | None |
| Dismiss delete error | `setDeleteError(null)` — error message disappears | None |

---

## 5. Test Plan

All tests are added to the existing file `packages/client/src/components/__tests__/task-detail-panel.test.tsx`.

### 5.1 Test Setup Modifications

The existing test file already mocks `fetchTask` and `useBoard`. We need to:
- Add `removeTask` to the `useBoard` mock return value in relevant tests
- The `ConfirmDialog` component is **not** mocked — it will render its real JSX (via `Modal` which uses `createPortal`). However, `Modal` is not mocked either, so the dialog content renders to `document.body` and is queryable. We need to verify this works or add a mock for `Modal`.

Actually, looking at the existing test setup: `Modal` is imported by `ConfirmDialog`, and `Modal` uses `createPortal`. The tests use `@testing-library/react`'s `render` which supports portals. The dialog content will be queryable via `screen`. No additional mocks are needed for `ConfirmDialog` or `Modal`.

### 5.2 Per-Test Specification

| # | Test Name | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | delete button is visible in the panel | `fetchTask` resolves with `mockTask`, `useBoard` returns `updateTask` and `removeTask` mocks | Render panel, wait for load | A button with text "Delete task" is visible |
| 2 | clicking delete button opens confirmation dialog | `fetchTask` resolves with `mockTask` | Click "Delete task" button | Dialog with message "Are you sure you want to delete this task? This action cannot be undone." is visible; "Delete" and "Cancel" buttons are visible |
| 3 | canceling confirmation dialog does not delete task | `fetchTask` resolves with `mockTask`, `removeTask` mock | Click "Delete task", then click "Cancel" | `removeTask` NOT called; dialog closes; panel is still open (title still visible) |
| 4 | confirming deletion calls removeTask and closes panel | `fetchTask` resolves with `mockTask`, `removeTask` resolves | Click "Delete task", then click "Delete" (confirm button) | `removeTask` called with `"task1"`; `onClose` called once |
| 5 | delete failure shows error in panel | `fetchTask` resolves with `mockTask`, `removeTask` rejects with `Error("Delete failed")` | Click "Delete task", then click "Delete" | `removeTask` called; `onClose` NOT called; error message "Delete failed" is visible in the panel |
| 6 | delete error can be dismissed | `fetchTask` resolves with `mockTask`, `removeTask` rejects | Click "Delete task", click "Delete", then click dismiss button on error | Error message disappears |
| 7 | Escape while confirm dialog is open does not close panel | `fetchTask` resolves with `mockTask` | Click "Delete task" to open dialog, press Escape | Dialog closes; panel is still open; `onClose` NOT called |

### 5.3 Test Implementation Details

**Test 1: delete button is visible in the panel**

```typescript
it("delete button is visible in the panel", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: vi.fn(),
  } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  expect(screen.getByRole("button", { name: "Delete task" })).toBeInTheDocument();
});
```

**Test 2: clicking delete button opens confirmation dialog**

```typescript
it("clicking delete button opens confirmation dialog", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: vi.fn(),
  } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete task" }));

  expect(
    screen.getByText("Are you sure you want to delete this task? This action cannot be undone."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
});
```

**Test 3: canceling confirmation dialog does not delete task**

```typescript
it("canceling confirmation dialog does not delete task", async () => {
  const mockRemoveTask = vi.fn();
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: mockRemoveTask,
  } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(mockRemoveTask).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
});
```

**Test 4: confirming deletion calls removeTask and closes panel**

```typescript
it("confirming deletion calls removeTask and closes panel", async () => {
  const mockRemoveTask = vi.fn().mockResolvedValue(undefined);
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: mockRemoveTask,
  } as any);

  const { onClose } = renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => {
    expect(mockRemoveTask).toHaveBeenCalledWith("task1");
  });

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

**Test 5: delete failure shows error in panel**

```typescript
it("delete failure shows error in panel", async () => {
  const mockRemoveTask = vi.fn().mockRejectedValue(new Error("Delete failed"));
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: mockRemoveTask,
  } as any);

  const { onClose } = renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => {
    expect(mockRemoveTask).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(screen.getByText("Delete failed")).toBeInTheDocument();
  });

  expect(onClose).not.toHaveBeenCalled();
});
```

**Test 6: delete error can be dismissed**

```typescript
it("delete error can be dismissed", async () => {
  const mockRemoveTask = vi.fn().mockRejectedValue(new Error("Delete failed"));
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: mockRemoveTask,
  } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => {
    expect(screen.getByText("Delete failed")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByLabelText("Dismiss"));

  expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
});
```

**Test 7: Escape while confirm dialog is open does not close panel**

```typescript
it("Escape while confirm dialog is open does not close panel", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({
    updateTask: vi.fn(),
    removeTask: vi.fn(),
  } as any);

  const { onClose } = renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete task" }));

  expect(
    screen.getByText("Are you sure you want to delete this task? This action cannot be undone."),
  ).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });

  // Dialog should close but panel should remain open
  await waitFor(() => {
    expect(
      screen.queryByText("Are you sure you want to delete this task? This action cannot be undone."),
    ).not.toBeInTheDocument();
  });

  expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});
```

### 5.4 Note on existing test mocks

The existing tests mock `useBoard` with only `{ updateTask: vi.fn() }`. After this task, the component also accesses `removeTask`. The existing tests use `as any` on the mock return value, so they will **not** break — accessing `removeTask` on the mocked object will simply return `undefined`, and `handleDelete` is never called in those tests. No changes to existing tests are needed.

However, it is cleaner to add `removeTask: vi.fn()` to all mocks for consistency. This is optional and can be done as a separate cleanup if desired. For this task, only the new tests need `removeTask` in the mock.

---

## 6. Implementation Order

1. **Step 1**: Open `packages/client/src/components/task-detail-panel.tsx`
2. **Step 2**: Add the `ConfirmDialog` import
3. **Step 3**: Add `showConfirm` and `deleteError` state variables
4. **Step 4**: Update `useBoard()` destructuring to include `removeTask`
5. **Step 5**: Update the Escape key `useEffect` to check `showConfirm` and add `showConfirm` to the dependency array
6. **Step 6**: Add the `handleDelete` function after `handleClearDueDate`
7. **Step 7**: Add the delete error display, delete button, and `ConfirmDialog` JSX after the metadata section
8. **Step 8**: Open `packages/client/src/components/__tests__/task-detail-panel.test.tsx`
9. **Step 9**: Add all 7 new test cases after the existing due date tests
10. **Step 10**: Verify TypeScript compiles: `npm run build -w packages/client`
11. **Step 11**: Run tests: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify the ConfirmDialog import exists
grep "ConfirmDialog" packages/client/src/components/task-detail-panel.tsx

# 2. Verify the delete button exists
grep "Delete task" packages/client/src/components/task-detail-panel.tsx

# 3. Verify removeTask is used from the context
grep "removeTask" packages/client/src/components/task-detail-panel.tsx

# 4. Verify TypeScript compiles
npm run build -w packages/client

# 5. Run all client tests (should pass including 7 new delete tests)
npm run test -w packages/client
```

All five commands should succeed (grep finds matches, build and test exit with code 0).