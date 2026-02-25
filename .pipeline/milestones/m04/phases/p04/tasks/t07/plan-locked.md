Now I have all the context I need. Let me write the complete revised plan.

# Task 7 Plan: LabelManager Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/label-manager.tsx` | Created | Inline CRUD UI for creating, editing, and deleting project labels |
| 2 | `packages/client/src/components/label-picker.tsx` | Modified | Replace Task 7 placeholder (lines 110-123) with `<LabelManager>` component |
| 3 | `packages/client/src/components/__tests__/label-manager.test.tsx` | Created | Tests for the LabelManager component |

---

## 2. Dependencies

- **`addLabel`, `updateLabel`, `removeLabel`** from `useBoard()` — `packages/client/src/context/board-context.tsx` lines 258-294. Provides methods for creating, updating, and deleting labels via the API and local state.
- **`labels: Label[]`** from `useBoard()` — `packages/client/src/context/board-context.tsx` line 46. Provides the current list of project labels.
- **`Label` type** from `@taskboard/shared` — `packages/shared/src/types/index.ts` lines 66-72. Defines `_id`, `name`, `color`, `project`, `createdAt`.
- **`ConfirmDialog` component** — `packages/client/src/components/ui/confirm-dialog.tsx`. Accepts `isOpen`, `message`, `confirmLabel`, `onConfirm`, `onCancel` props. Used for delete confirmation.
- **`LabelPicker` placeholder** — `packages/client/src/components/label-picker.tsx` lines 110-123. The `showManager` state already exists (line 14) and toggles the placeholder section. This will be replaced with the actual `<LabelManager>` component.

---

## 3. Implementation Details

### Deliverable 1: `packages/client/src/components/label-manager.tsx`

**Purpose**: An inline expandable section for managing project labels — create new labels, edit existing ones (name and color), and delete with confirmation.

**Props interface**:

```typescript
interface LabelManagerProps {
  onClose: () => void;
}
```

- `onClose` — callback to close the manager panel. Wired to `LabelPicker`'s `setShowManager(false)`.

**Component state**:

```typescript
const { labels, addLabel, updateLabel, removeLabel } = useBoard();
const [newName, setNewName] = useState("");
const [newColor, setNewColor] = useState(() => randomColor());
const [editingId, setEditingId] = useState<string | null>(null);
const [editName, setEditName] = useState("");
const [editColor, setEditColor] = useState("");
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
```

- `newName` / `newColor` — form state for creating a new label.
- `editingId` — tracks which label (if any) is in inline edit mode. Only one label at a time can be edited.
- `editName` / `editColor` — form state for the label currently being edited.
- `confirmDeleteId` — the ID of the label pending deletion confirmation. When non-null, the `ConfirmDialog` is open.

**Random color generation**:

```typescript
function randomColor(): string {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}
```

Placed outside the component as a module-level helper. Generates a random hex color string (e.g., `"#a3f12c"`). The `.padStart(6, "0")` ensures the string is always 6 characters even when the random number has leading zeros.

**Handler functions**:

#### `handleCreate`

```typescript
async function handleCreate() {
  const trimmed = newName.trim();
  if (!trimmed) return;
  try {
    await addLabel(trimmed, newColor);
    setNewName("");
    setNewColor(randomColor());
  } catch {
    // addLabel throws on API failure; no UI revert needed since nothing was added
  }
}
```

- Validates name is non-empty after trimming.
- Calls `addLabel(name, color)` from context which makes the API call and appends to state.
- On success, resets the form with a fresh random color.
- On failure, the form stays as-is so the user can retry.

#### `handleStartEdit`

```typescript
function handleStartEdit(label: Label) {
  setEditingId(label._id);
  setEditName(label.name);
  setEditColor(label.color);
}
```

- Copies the label's current values into edit state.
- Sets `editingId` to the label's `_id` to trigger inline edit rendering.

#### `handleSaveEdit`

```typescript
async function handleSaveEdit() {
  if (!editingId) return;
  const trimmed = editName.trim();
  if (!trimmed) return;
  const currentLabel = labels.find((l) => l._id === editingId);
  if (!currentLabel) return;
  const changes: { name?: string; color?: string } = {};
  if (trimmed !== currentLabel.name) changes.name = trimmed;
  if (editColor !== currentLabel.color) changes.color = editColor;
  if (Object.keys(changes).length === 0) {
    setEditingId(null);
    return;
  }
  try {
    await updateLabel(editingId, changes);
    setEditingId(null);
  } catch {
    // Keep edit mode open so the user can retry
  }
}
```

- Validates name is non-empty.
- Only sends changed fields to avoid unnecessary API calls.
- On success, exits edit mode.
- On failure, stays in edit mode.

#### `handleCancelEdit`

```typescript
function handleCancelEdit() {
  setEditingId(null);
}
```

- Simply clears `editingId` to exit edit mode without saving.

#### `handleDelete`

```typescript
async function handleDelete() {
  if (!confirmDeleteId) return;
  try {
    await removeLabel(confirmDeleteId);
  } catch {
    // removeLabel throws on API failure; label remains in state
  }
  setConfirmDeleteId(null);
}
```

- Calls `removeLabel` from context which makes the API call, removes from labels state, and strips the label ID from all tasks.
- Always closes the confirm dialog whether the delete succeeded or failed.

**Full file content**:

```typescript
import { useState } from "react";
import type { Label } from "@taskboard/shared";
import { useBoard } from "../context/board-context";
import { ConfirmDialog } from "./ui/confirm-dialog";

function randomColor(): string {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

interface LabelManagerProps {
  onClose: () => void;
}

export function LabelManager({ onClose }: LabelManagerProps) {
  const { labels, addLabel, updateLabel, removeLabel } = useBoard();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(() => randomColor());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await addLabel(trimmed, newColor);
      setNewName("");
      setNewColor(randomColor());
    } catch {
      // addLabel throws on API failure; form stays as-is for retry
    }
  }

  function handleStartEdit(label: Label) {
    setEditingId(label._id);
    setEditName(label.name);
    setEditColor(label.color);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    const currentLabel = labels.find((l) => l._id === editingId);
    if (!currentLabel) return;
    const changes: { name?: string; color?: string } = {};
    if (trimmed !== currentLabel.name) changes.name = trimmed;
    if (editColor !== currentLabel.color) changes.color = editColor;
    if (Object.keys(changes).length === 0) {
      setEditingId(null);
      return;
    }
    try {
      await updateLabel(editingId, changes);
      setEditingId(null);
    } catch {
      // Keep edit mode open so the user can retry
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await removeLabel(confirmDeleteId);
    } catch {
      // removeLabel throws on API failure; label remains in state
    }
    setConfirmDeleteId(null);
  }

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Manage Labels</span>
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
          aria-label="Close label manager"
        >
          ×
        </button>
      </div>

      {/* Create new label form */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-gray-300"
          aria-label="New label color"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Label name"
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="New label name"
        />
        <button
          onClick={handleCreate}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create
        </button>
      </div>

      {/* Existing labels list */}
      {labels.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No labels yet</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {labels.map((label) => (
            <li key={label._id} className="flex items-center gap-2">
              {editingId === label._id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-gray-300"
                    aria-label="Edit label color"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                      if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Edit label name"
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    aria-label="Save label"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-gray-400 hover:text-gray-600"
                    aria-label="Cancel edit"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-sm text-gray-700">{label.name}</span>
                  <button
                    onClick={() => handleStartEdit(label)}
                    className="text-sm text-gray-400 hover:text-gray-600"
                    aria-label={`Edit ${label.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(label._id)}
                    className="text-sm text-red-400 hover:text-red-600"
                    aria-label={`Delete ${label.name}`}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        message="This label will be removed from all tasks. Are you sure?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
```

**Design notes**:
- The outer `<div>` uses the same `mt-2 rounded-md border border-gray-200 bg-gray-50 p-3` styling as the placeholder it replaces.
- The close button uses `aria-label="Close label manager"` matching the existing placeholder pattern.
- The create form and list are stacked vertically with `mt-3` spacing.
- Edit mode uses the same `flex items-center gap-2` layout as display mode for visual consistency.
- The `ConfirmDialog` is rendered once at the bottom and controlled by `confirmDeleteId` state — when non-null, `isOpen` is true and the dialog shows.
- Enter key in the new name input triggers `handleCreate`. Enter key in the edit name input triggers `handleSaveEdit`. Escape key in the edit name input triggers `handleCancelEdit`.

---

### Deliverable 2: Modified `packages/client/src/components/label-picker.tsx`

**Overview of changes**: Two modifications — add the `LabelManager` import and replace the placeholder section (lines 110-123) with the actual component.

#### Change 1: Add import

Add after the existing imports (after line 3):

```typescript
import { LabelManager } from "./label-manager";
```

#### Change 2: Replace placeholder with LabelManager

**Current placeholder** (lines 110-123):
```tsx
{showManager && (
  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">Label manager (coming in Task 7)</span>
      <button
        onClick={() => setShowManager(false)}
        className="text-sm text-gray-400 hover:text-gray-600"
        aria-label="Close label manager"
      >
        ×
      </button>
    </div>
  </div>
)}
```

**Replacement**:
```tsx
{showManager && (
  <LabelManager onClose={() => setShowManager(false)} />
)}
```

**Key details**:
- The `LabelManager` component itself renders the containing `<div>` with the same `mt-2 rounded-md border border-gray-200 bg-gray-50 p-3` styling as the placeholder, so no wrapper is needed.
- The `onClose` prop is wired to `setShowManager(false)`, exactly as the placeholder's close button was.
- The `LabelManager`'s own close button (aria-label "Close label manager") replaces the placeholder's close button.

---

### Deliverable 3: `packages/client/src/components/__tests__/label-manager.test.tsx`

**Test setup**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LabelManager } from "../label-manager";
import type { Label } from "@taskboard/shared";

vi.mock("../../context/board-context");
vi.mock("../ui/confirm-dialog", () => ({
  ConfirmDialog: ({ isOpen, message, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

import { useBoard } from "../../context/board-context";
```

**Mock setup helper**:

```typescript
const mockLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

function setupMocks(overrides: Partial<ReturnType<typeof useBoard>> = {}) {
  const mocks = {
    labels: mockLabels,
    addLabel: vi.fn().mockResolvedValue({ _id: "label3", name: "New", color: "#000000", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" }),
    updateLabel: vi.fn().mockResolvedValue({ _id: "label1", name: "Updated", color: "#000000", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" }),
    removeLabel: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  vi.mocked(useBoard).mockReturnValue(mocks as any);
  return mocks;
}
```

**Note**: The `ConfirmDialog` is mocked because it uses `createPortal` (via `Modal`) which doesn't play well with JSDOM testing. The mock renders the dialog content inline when `isOpen` is true, with "Confirm" and "Cancel" buttons wired to the callbacks. This follows the same approach used in `task-detail-panel.test.tsx`.

**Test cases** (13 tests):

#### Test 1: "renders header with close button"

```typescript
it("renders header with close button", () => {
  setupMocks();
  const onClose = vi.fn();
  render(<LabelManager onClose={onClose} />);

  expect(screen.getByText("Manage Labels")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Close label manager"));
  expect(onClose).toHaveBeenCalled();
});
```

Verifies the manager renders with a title and the close button calls `onClose`.

#### Test 2: "renders create form with color input and name input"

```typescript
it("renders create form with color input and name input", () => {
  setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  expect(screen.getByLabelText("New label color")).toBeInTheDocument();
  expect(screen.getByLabelText("New label name")).toBeInTheDocument();
  expect(screen.getByText("Create")).toBeInTheDocument();
});
```

Verifies the create form elements are present.

#### Test 3: "displays existing labels with color swatch and name"

```typescript
it("displays existing labels with color swatch and name", () => {
  setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  expect(screen.getByText("Bug")).toBeInTheDocument();
  expect(screen.getByText("Feature")).toBeInTheDocument();
  expect(screen.getByLabelText("Edit Bug")).toBeInTheDocument();
  expect(screen.getByLabelText("Delete Bug")).toBeInTheDocument();
});
```

Verifies each label row renders name, edit button, and delete button.

#### Test 4: "shows empty state when no labels exist"

```typescript
it("shows empty state when no labels exist", () => {
  setupMocks({ labels: [] });
  render(<LabelManager onClose={vi.fn()} />);

  expect(screen.getByText("No labels yet")).toBeInTheDocument();
});
```

Verifies the empty state message.

#### Test 5: "creates a new label and resets the form"

```typescript
it("creates a new label and resets the form", async () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  const nameInput = screen.getByLabelText("New label name");
  fireEvent.change(nameInput, { target: { value: "Urgent" } });
  fireEvent.click(screen.getByText("Create"));

  await waitFor(() => {
    expect(mocks.addLabel).toHaveBeenCalledWith("Urgent", expect.stringMatching(/^#[0-9a-f]{6}$/));
  });

  // Form resets after successful create
  await waitFor(() => {
    expect(nameInput).toHaveValue("");
  });
});
```

Verifies `addLabel` is called with the name and a valid hex color, and the form resets on success.

#### Test 6: "creates a label on Enter key in name input"

```typescript
it("creates a label on Enter key in name input", async () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  const nameInput = screen.getByLabelText("New label name");
  fireEvent.change(nameInput, { target: { value: "Hotfix" } });
  fireEvent.keyDown(nameInput, { key: "Enter" });

  await waitFor(() => {
    expect(mocks.addLabel).toHaveBeenCalledWith("Hotfix", expect.any(String));
  });
});
```

Verifies Enter key submits the create form.

#### Test 7: "does not create a label with empty name"

```typescript
it("does not create a label with empty name", () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByText("Create"));

  expect(mocks.addLabel).not.toHaveBeenCalled();
});
```

Verifies the guard against empty names.

#### Test 8: "enters edit mode showing name and color inputs"

```typescript
it("enters edit mode showing name and color inputs", () => {
  setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByLabelText("Edit Bug"));

  expect(screen.getByLabelText("Edit label name")).toHaveValue("Bug");
  expect(screen.getByLabelText("Edit label color")).toHaveValue("#ef4444");
  expect(screen.getByLabelText("Save label")).toBeInTheDocument();
  expect(screen.getByLabelText("Cancel edit")).toBeInTheDocument();
});
```

Verifies clicking Edit populates the edit inputs with the label's current values.

#### Test 9: "saves edited label and exits edit mode"

```typescript
it("saves edited label and exits edit mode", async () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByLabelText("Edit Bug"));
  fireEvent.change(screen.getByLabelText("Edit label name"), { target: { value: "Critical Bug" } });
  fireEvent.click(screen.getByLabelText("Save label"));

  await waitFor(() => {
    expect(mocks.updateLabel).toHaveBeenCalledWith("label1", { name: "Critical Bug" });
  });

  // Exits edit mode
  await waitFor(() => {
    expect(screen.queryByLabelText("Edit label name")).not.toBeInTheDocument();
  });
});
```

Verifies `updateLabel` is called with only the changed fields and edit mode exits.

#### Test 10: "cancels edit mode without saving"

```typescript
it("cancels edit mode without saving", () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByLabelText("Edit Bug"));
  fireEvent.change(screen.getByLabelText("Edit label name"), { target: { value: "Changed" } });
  fireEvent.click(screen.getByLabelText("Cancel edit"));

  expect(mocks.updateLabel).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Edit label name")).not.toBeInTheDocument();
  expect(screen.getByText("Bug")).toBeInTheDocument();
});
```

Verifies Cancel discards changes and returns to display mode.

#### Test 11: "cancels edit mode on Escape key"

```typescript
it("cancels edit mode on Escape key", () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByLabelText("Edit Bug"));
  fireEvent.keyDown(screen.getByLabelText("Edit label name"), { key: "Escape" });

  expect(mocks.updateLabel).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Edit label name")).not.toBeInTheDocument();
});
```

Verifies Escape key cancels edit mode.

#### Test 12: "shows confirm dialog and deletes label on confirm"

```typescript
it("shows confirm dialog and deletes label on confirm", async () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByLabelText("Delete Bug"));

  expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  expect(screen.getByText("This label will be removed from all tasks. Are you sure?")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Confirm"));

  await waitFor(() => {
    expect(mocks.removeLabel).toHaveBeenCalledWith("label1");
  });
});
```

Verifies the delete flow: clicking Delete opens the confirm dialog, clicking Confirm calls `removeLabel`.

#### Test 13: "cancels delete confirmation without deleting"

```typescript
it("cancels delete confirmation without deleting", () => {
  const mocks = setupMocks();
  render(<LabelManager onClose={vi.fn()} />);

  fireEvent.click(screen.getByLabelText("Delete Bug"));
  expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Cancel"));

  expect(mocks.removeLabel).not.toHaveBeenCalled();
  expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
});
```

Verifies canceling the confirm dialog does not call `removeLabel`.

---

## 4. Contracts

### `LabelManager` props interface

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onClose` | `() => void` | Yes | Callback to close the manager panel |

### Context dependencies

| Hook | Destructured Fields | Type | Description |
|------|---------------------|------|-------------|
| `useBoard()` | `labels` | `Label[]` | All project labels to display in the list |
| `useBoard()` | `addLabel` | `(name: string, color: string) => Promise<Label>` | Creates a label via API and appends to context state |
| `useBoard()` | `updateLabel` | `(labelId: string, input: { name?: string; color?: string }) => Promise<Label>` | Updates a label via API and patches context state |
| `useBoard()` | `removeLabel` | `(labelId: string) => Promise<void>` | Deletes a label via API, removes from context, strips from all tasks |

### Rendering behavior for key states

| State | Rendered output |
|-------|----------------|
| No labels exist (`labels.length === 0`) | Header, create form, "No labels yet" message |
| Labels exist, no editing | Header, create form, list of labels each with color swatch, name, Edit button, Delete button |
| One label in edit mode (`editingId !== null`) | That label's row shows color input, text input, Save button, Cancel button. All other labels render normally. |
| Delete confirmation open (`confirmDeleteId !== null`) | `ConfirmDialog` is visible with warning message and Delete/Cancel buttons |
| Create form submitted | `addLabel` called; on success form resets (name cleared, new random color); on failure form stays |

### Integration with LabelPicker

The `LabelPicker` renders `LabelManager` when `showManager` is true:

```tsx
{showManager && (
  <LabelManager onClose={() => setShowManager(false)} />
)}
```

This replaces the placeholder at lines 110-123 of `label-picker.tsx`. The `LabelManager` manages its own internal state and communicates with `BoardContext` directly — it does not pass data back to `LabelPicker` through props. Any labels created, updated, or deleted are reflected in `useBoard().labels`, which both `LabelPicker` and `LabelManager` consume.

---

## 5. Test Plan

### New test file: `packages/client/src/components/__tests__/label-manager.test.tsx`

13 tests covering:

1. **"renders header with close button"** — title present, close button calls `onClose`
2. **"renders create form with color input and name input"** — color picker, text input, Create button present
3. **"displays existing labels with color swatch and name"** — each label shows name, Edit button, Delete button
4. **"shows empty state when no labels exist"** — "No labels yet" message, no list items
5. **"creates a new label and resets the form"** — `addLabel` called, form resets on success
6. **"creates a label on Enter key in name input"** — Enter submits the create form
7. **"does not create a label with empty name"** — `addLabel` not called for blank input
8. **"enters edit mode showing name and color inputs"** — edit inputs populated with current values
9. **"saves edited label and exits edit mode"** — `updateLabel` called with changed fields only, exits edit mode
10. **"cancels edit mode without saving"** — Cancel discards changes, `updateLabel` not called
11. **"cancels edit mode on Escape key"** — Escape exits edit mode, `updateLabel` not called
12. **"shows confirm dialog and deletes label on confirm"** — dialog opens, Confirm calls `removeLabel`
13. **"cancels delete confirmation without deleting"** — Cancel closes dialog, `removeLabel` not called

### Mocking approach

- `useBoard` is mocked via `vi.mock("../../context/board-context")` with `vi.mocked(useBoard).mockReturnValue(...)` — same pattern as `label-picker.test.tsx`.
- `ConfirmDialog` is mocked to render inline (avoiding `createPortal`/JSDOM issues) with `data-testid="confirm-dialog"`, Confirm and Cancel buttons.

---

## 6. Implementation Order

1. **Step 1**: Create `packages/client/src/components/label-manager.tsx` with the full component implementation
2. **Step 2**: Modify `packages/client/src/components/label-picker.tsx`:
   - Add the `LabelManager` import (after line 3)
   - Replace lines 110-123 (placeholder section) with `<LabelManager onClose={() => setShowManager(false)} />`
3. **Step 3**: Create `packages/client/src/components/__tests__/label-manager.test.tsx` with all 13 test cases
4. **Step 4**: Verify TypeScript compilation
5. **Step 5**: Run tests

---

## 7. Verification Commands

```bash
# 1. Build the shared package (dependency for client)
npm run build --workspace=@taskboard/shared

# 2. Verify client package compiles with the new and modified files
cd packages/client && npx tsc --noEmit

# 3. Run the label-manager test suite
cd packages/client && npx vitest run src/components/__tests__/label-manager.test.tsx

# 4. Run the label-picker test suite (verify integration doesn't break existing tests)
cd packages/client && npx vitest run src/components/__tests__/label-picker.test.tsx

# 5. Run the full client test suite to check for regressions
cd packages/client && npx vitest run

# 6. Verify the LabelManager import is present in label-picker.tsx
grep -n "LabelManager" packages/client/src/components/label-picker.tsx

# 7. Verify the placeholder text is gone
grep -c "coming in Task 7" packages/client/src/components/label-picker.tsx
# Expected: 0
```