Now I have a complete picture. Let me analyze the gap between the existing `add-task-form.tsx` and the task spec:

1. **Missing error handling**: The spec requires "if creation fails, show a brief inline error message; keep the input text so the user can retry." The current implementation has an empty `catch` block — it doesn't display an error message and doesn't preserve the input text (the catch block is empty, but the text is preserved because `setTitle("")` is only in the `try` block).

2. **Missing test file**: `packages/client/src/components/__tests__/add-task-form.test.tsx` doesn't exist.

Now I have everything needed to produce the plan.

# Task 5 Implementation Plan — AddTaskForm Component

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/components/add-task-form.tsx` | **Modify** | Add inline error display when task creation fails |
| `packages/client/src/components/__tests__/add-task-form.test.tsx` | **Create** | Unit tests for AddTaskForm covering all verification criteria |

---

## 2. Dependencies

- **t02 complete** — `BoardContextValue` exposes `createTask(columnName, title)` (verified in `board-context.tsx` lines 32, 138–150)
- **Shared types** — none directly needed; `AddTaskForm` only uses the context hook
- **No npm packages to install** — all dependencies already available

---

## 3. Implementation Details

### File: `packages/client/src/components/add-task-form.tsx`

**Current state**: The component already exists with correct basic functionality — button toggle, input, Enter/Escape handlers, auto-focus, `createTask` call, `isSubmitting` guard, and onBlur collapse. However, it is **missing error handling**: verification criterion 7 requires that API failures display an inline error message and preserve the input text.

**What to change**: Add local `error` state to capture creation failures, display the error inline below the input, and auto-dismiss the error when the user starts typing again.

#### 3.1 Add Error State

Add a new `useState` for error:

```typescript
const [error, setError] = useState<string | null>(null);
```

#### 3.2 Update `handleSubmit` to Capture Errors

Change the `catch` block from empty to capture and display the error:

```typescript
async function handleSubmit() {
  const trimmed = title.trim();
  if (!trimmed || isSubmitting) return;

  setIsSubmitting(true);
  setError(null);
  try {
    await createTask(columnName, trimmed);
    setTitle("");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    setError(message);
  } finally {
    setIsSubmitting(false);
  }
}
```

**Key behaviors preserved**:
- On success: input clears, form stays open (existing behavior, unchanged)
- On failure: input text preserved (only `setTitle("")` runs inside `try`), error message displayed
- `isSubmitting` guard prevents double-submission

#### 3.3 Clear Error on Input Change

Update the `onChange` handler to dismiss the error when the user types:

```typescript
onChange={(e) => {
  setTitle(e.target.value);
  if (error) setError(null);
}}
```

This provides a natural UX where the error disappears as soon as the user starts modifying their input to retry.

#### 3.4 Render Inline Error

Add an error message below the input when `error` is set. Use a simple `<p>` with red text (not the full `ErrorMessage` component, which is oversized for this inline context):

```tsx
{error && (
  <p className="mt-1 text-xs text-red-600" role="alert">
    {error}
  </p>
)}
```

Since the input is returned directly (not wrapped in a container), the open state JSX needs to be wrapped in a `<div>` to hold both the input and the error message:

```tsx
return (
  <div>
    <input
      ref={inputRef}
      value={title}
      onChange={(e) => {
        setTitle(e.target.value);
        if (error) setError(null);
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (!title.trim()) {
          setIsOpen(false);
        }
      }}
      placeholder="Enter task title..."
      disabled={isSubmitting}
      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      aria-label="New task title"
    />
    {error && (
      <p className="mt-1 text-xs text-red-600" role="alert">
        {error}
      </p>
    )}
  </div>
);
```

#### 3.5 Clear Error on Escape

Update the Escape handler to also clear any displayed error when the form closes:

```typescript
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSubmit();
  } else if (e.key === "Escape") {
    setTitle("");
    setError(null);
    setIsOpen(false);
  }
}
```

---

### File: `packages/client/src/components/__tests__/add-task-form.test.tsx`

**Purpose**: Unit tests for `AddTaskForm` covering all 8 verification criteria.

**Mock setup**: Mock the `useBoard` context hook to provide a controlled `createTask` function. This follows the same pattern as `board-view.test.tsx` (mock the context module, not the API layer).

#### Mock Pattern

```typescript
const mockCreateTask = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: () => ({
    createTask: mockCreateTask,
  }),
}));
```

This is simpler than `board-view.test.tsx`'s full mock because `AddTaskForm` only uses `createTask` from the context.

#### Render Helper

```typescript
function renderForm(columnName = "To Do") {
  return render(<AddTaskForm columnName={columnName} />);
}
```

#### Test Specifications

**Test 1: `renders "+ Add task" button initially`**
- Verification criterion: 1
- Setup: render with default props
- Assert: `screen.getByText("+ Add task")` is in the document
- Assert: `screen.queryByLabelText("New task title")` is null (input not shown)

**Test 2: `clicking button reveals auto-focused input`**
- Verification criterion: 2
- Setup: render, click the "+" button
- Assert: `screen.getByLabelText("New task title")` is in the document
- Assert: input has focus (use `document.activeElement`)
- Assert: the "+" button is no longer visible

**Test 3: `Enter with text calls createTask with correct column name and title`**
- Verification criterion: 3
- Setup: render with `columnName="In Progress"`, open form, type "New task"
- Mock `createTask` to resolve
- Act: press Enter
- Assert: `mockCreateTask` called with `("In Progress", "New task")`

**Test 4: `input clears after successful creation but form stays open`**
- Verification criterion: 4
- Setup: render, open form, type "New task", mock `createTask` to resolve
- Act: press Enter, wait for async completion
- Assert: input value is `""` (cleared)
- Assert: input is still in the document (form stayed open)

**Test 5: `Escape hides input and shows button again`**
- Verification criterion: 5
- Setup: render, open form
- Act: press Escape on the input
- Assert: `screen.queryByLabelText("New task title")` is null
- Assert: `screen.getByText("+ Add task")` is in the document

**Test 6: `empty submission is ignored — does not call createTask`**
- Verification criterion: 6
- Setup: render, open form, leave input empty (or type only spaces)
- Act: press Enter
- Assert: `mockCreateTask` not called

**Test 7: `API error displays inline error message and preserves input text`**
- Verification criterion: 7
- Setup: render, open form, type "My task", mock `createTask` to reject with `new Error("Server error")`
- Act: press Enter, wait for async
- Assert: `screen.getByRole("alert")` contains "Server error"
- Assert: input value is still "My task" (preserved)

**Test 8: `error clears when user types`**
- Verification criterion: 7 (sub-behavior)
- Setup: cause an error (same as Test 7)
- Act: type a character in the input
- Assert: `screen.queryByRole("alert")` is null

**Test 9: `error clears on Escape`**
- Setup: cause an error
- Act: press Escape
- Assert: `screen.queryByRole("alert")` is null
- Assert: button is shown again

**Test 10: `input is disabled while submitting`**
- Setup: render, open form, type "Task", mock `createTask` to return a pending promise (never resolves during the test)
- Act: press Enter
- Assert: input has `disabled` attribute

**Test 11: `double Enter does not call createTask twice (isSubmitting guard)`**
- Setup: render, open form, type "Task"
- Mock `createTask` to return a promise that doesn't resolve immediately
- Act: press Enter twice rapidly
- Assert: `mockCreateTask` called exactly once

**Test 12: `onBlur with empty input closes the form`**
- Setup: render, open form, leave input empty
- Act: fire blur on the input
- Assert: input is gone, button is shown

**Test 13: `onBlur with text does not close the form`**
- Setup: render, open form, type "In progress"
- Act: fire blur on the input
- Assert: input is still visible

**Test 14: `passes correct columnName for different columns`**
- Setup: render with `columnName="Done"`, open form, type "Deploy"
- Mock `createTask` to resolve
- Act: press Enter
- Assert: `mockCreateTask` called with `("Done", "Deploy")`

---

## 4. Contracts

### Props

```typescript
interface AddTaskFormProps {
  columnName: string;  // Column name (maps to task status)
}
```

### Context Dependency

Uses `createTask(columnName: string, title: string): Promise<Task>` from `useBoard()`.

### Rendered States

**Collapsed state** (initial):
- Renders a single `<button>` with text `"+ Add task"`

**Expanded state** (after click):
- Renders an `<input>` with `aria-label="New task title"`, auto-focused
- Optionally renders a `<p role="alert">` with error text below the input

### User Interactions

| Action | Result |
|--------|--------|
| Click "+" button | Opens input, auto-focuses |
| Type + Enter | Calls `createTask(columnName, trimmedTitle)`, clears input on success, shows error on failure |
| Enter with empty/whitespace | Ignored |
| Escape | Closes form, returns to button |
| Blur with empty input | Closes form |
| Blur with text | Form stays open |
| Type after error | Error clears |

---

## 5. Test Plan

See Section 3 — Tests 1–14 are fully specified above under the test file section.

### Test Setup Summary

```typescript
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddTaskForm } from "../add-task-form";

const mockCreateTask = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: () => ({
    createTask: mockCreateTask,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## 6. Implementation Order

### Step 1: Modify `packages/client/src/components/add-task-form.tsx`

1. Add `error` state: `const [error, setError] = useState<string | null>(null);`
2. Update `handleSubmit`: add `setError(null)` before the try, add `catch (err: unknown)` that sets error message
3. Update `handleKeyDown`: add `setError(null)` in the Escape branch
4. Update `onChange` handler to clear error when typing
5. Wrap the open-state JSX in a `<div>` to contain both input and error message
6. Add error `<p>` element conditionally rendered below the input

### Step 2: Create `packages/client/src/components/__tests__/add-task-form.test.tsx`

1. Set up mock for `../../context/board-context`
2. Define render helper
3. Implement all 14 tests covering:
   - Button rendering (Test 1)
   - Toggle to input with auto-focus (Test 2)
   - Enter submission with correct args (Test 3)
   - Input clears, form stays open (Test 4)
   - Escape closes form (Test 5)
   - Empty submit ignored (Test 6)
   - Error display and text preservation (Test 7)
   - Error clears on typing (Test 8)
   - Error clears on Escape (Test 9)
   - Disabled during submission (Test 10)
   - Double-submit guard (Test 11)
   - Blur with empty closes (Test 12)
   - Blur with text stays open (Test 13)
   - Different column name (Test 14)

### Step 3: Verify

Run TypeScript compilation and tests to confirm everything works.

---

## 7. Verification Commands

```bash
# 1. TypeScript compilation — must succeed with no errors
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Run AddTaskForm tests specifically
npx vitest run packages/client/src/components/__tests__/add-task-form.test.tsx

# 3. Run full client test suite to verify no regressions
npm run test -w packages/client

# 4. Verify the error handling exists in the component
grep -n "role=\"alert\"\|setError" packages/client/src/components/add-task-form.tsx
```

---

## Complete Modified File: `packages/client/src/components/add-task-form.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import { useBoard } from "../context/board-context";

interface AddTaskFormProps {
  columnName: string;
}

export function AddTaskForm({ columnName }: AddTaskFormProps) {
  const { createTask } = useBoard();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createTask(columnName, trimmed);
      setTitle("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setError(null);
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded px-2 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-200 transition-colors"
      >
        + Add task
      </button>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setIsOpen(false);
          }
        }}
        placeholder="Enter task title..."
        disabled={isSubmitting}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        aria-label="New task title"
      />
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

---

## Complete File: `packages/client/src/components/__tests__/add-task-form.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddTaskForm } from "../add-task-form";

const mockCreateTask = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: () => ({
    createTask: mockCreateTask,
  }),
}));

function renderForm(columnName = "To Do") {
  return render(<AddTaskForm columnName={columnName} />);
}

describe("AddTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders '+ Add task' button initially", () => {
    renderForm();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
  });

  it("clicking button reveals auto-focused input", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    expect(input).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
    expect(screen.queryByText("+ Add task")).not.toBeInTheDocument();
  });

  it("Enter with text calls createTask with correct column name and title", async () => {
    mockCreateTask.mockResolvedValue({
      _id: "task1",
      title: "New task",
      status: "In Progress",
    });
    renderForm("In Progress");
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith("In Progress", "New task");
    });
  });

  it("input clears after successful creation but form stays open", async () => {
    mockCreateTask.mockResolvedValue({
      _id: "task1",
      title: "New task",
      status: "To Do",
    });
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(input).toHaveValue("");
    });
    expect(screen.getByLabelText("New task title")).toBeInTheDocument();
  });

  it("Escape hides input and shows button again", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("empty submission is ignored and does not call createTask", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("API error displays inline error message and preserves input text", async () => {
    mockCreateTask.mockRejectedValue(new Error("Server error"));
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
    expect(input).toHaveValue("My task");
  });

  it("error clears when user types", async () => {
    mockCreateTask.mockRejectedValue(new Error("Server error"));
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    fireEvent.change(input, { target: { value: "My task updated" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("error clears on Escape", async () => {
    mockCreateTask.mockRejectedValue(new Error("Server error"));
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("input is disabled while submitting", async () => {
    let resolveCreate: (value: unknown) => void;
    mockCreateTask.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "Task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
    // Clean up by resolving
    resolveCreate!({ _id: "task1", title: "Task", status: "To Do" });
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it("double Enter does not call createTask twice", async () => {
    let resolveCreate: (value: unknown) => void;
    mockCreateTask.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "Task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    // Clean up
    resolveCreate!({ _id: "task1", title: "Task", status: "To Do" });
  });

  it("onBlur with empty input closes the form", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.blur(input);
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("onBlur with text does not close the form", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "In progress" } });
    fireEvent.blur(input);
    expect(screen.getByLabelText("New task title")).toBeInTheDocument();
  });

  it("passes correct columnName for different columns", async () => {
    mockCreateTask.mockResolvedValue({
      _id: "task1",
      title: "Deploy",
      status: "Done",
    });
    renderForm("Done");
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "Deploy" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith("Done", "Deploy");
    });
  });
});
```