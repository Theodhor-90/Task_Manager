Now I have everything I need. Let me produce the implementation plan.

# Task 4: `Column` Component — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/column.tsx` | Created | Column component with header (inline-editable name, task count, drag handle, delete button), scrollable task container |
| 2 | `packages/client/src/components/__tests__/column.test.tsx` | Created | Unit tests covering rendering, inline rename, delete with confirm dialog, error display, and drag handle presence |

## 2. Dependencies

- **Task 1 complete** — `@dnd-kit/core` (v6.3.1) and `@dnd-kit/sortable` (v10.0.0) are installed
- **Task 3 complete** — `BoardContext` exists (though this component receives data via props, not directly from context)
- **Existing components**:
  - `packages/client/src/components/ui/confirm-dialog.tsx` — `ConfirmDialog` with `isOpen`, `message`, `confirmLabel`, `onConfirm`, `onCancel` props
  - `packages/client/src/components/ui/error-message.tsx` — `ErrorMessage` with `message` and optional `onDismiss` props
- **Shared types**: `Column` and `Task` from `@taskboard/shared`
- **@dnd-kit/sortable** — `useSortable` hook returning `attributes`, `listeners`, `setNodeRef`, `setActivatorNodeRef`, `transform`, `transition`, `isDragging`
- **@dnd-kit/utilities** — `CSS.Transform.toString()` for converting transform to CSS string

## 3. Implementation Details

### 3.1 `packages/client/src/components/column.tsx`

**Purpose**: Render a single kanban column with its header (name, task count, drag handle, delete button), inline-editable name, and a scrollable container for children (task card stubs in this phase, full `TaskCard` in Phase 2).

**Imports**:

```typescript
import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column as ColumnType, Task } from "@taskboard/shared";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { ErrorMessage } from "./ui/error-message";
```

**Props interface**:

```typescript
interface ColumnProps {
  column: ColumnType;
  taskCount: number;
  onRename: (columnId: string, name: string) => Promise<void>;
  onDelete: (columnId: string) => Promise<void>;
  children: ReactNode;
}
```

**Key design decisions on props**:
- `taskCount` is a separate number prop rather than `tasks: Task[]` — the Column component does not need the full task array, only the count for the badge. The parent (`BoardView`) passes children for task rendering and the count separately. This keeps the Column component focused on column concerns.
- `onRename` and `onDelete` are async callbacks that the parent wires to `BoardContext` methods. They return `Promise<void>` so the Column can `await` them and catch errors.
- `children` is used for task rendering — the parent passes task stubs (or later `TaskCard` components) as children.

**Component structure**:

```typescript
export function Column({ column, taskCount, onRename, onDelete, children }: ColumnProps) {
  // --- dnd-kit sortable ---
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // --- inline rename state ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- delete state ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // --- handlers ---
  // ... (see below)

  return ( /* ... */ );
}
```

**Handler: `handleDoubleClick`**:

```typescript
function handleDoubleClick() {
  setEditName(column.name);
  setIsEditing(true);
}
```

- Resets `editName` to current column name (in case it was changed since last edit)
- Enters edit mode

**Handler: `handleRenameSubmit`**:

```typescript
async function handleRenameSubmit() {
  const trimmed = editName.trim();
  if (!trimmed || trimmed === column.name) {
    setIsEditing(false);
    return;
  }
  try {
    await onRename(column._id, trimmed);
  } catch {
    // Rename failed — revert to original
    setEditName(column.name);
  }
  setIsEditing(false);
}
```

- Trims the input; if empty or unchanged, simply exits edit mode
- Calls `onRename` and waits for it
- On failure, reverts `editName` to the original name
- Always exits edit mode after the attempt

**Handler: `handleRenameKeyDown`**:

```typescript
function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    handleRenameSubmit();
  } else if (e.key === "Escape") {
    setEditName(column.name);
    setIsEditing(false);
  }
}
```

- Enter saves the rename
- Escape cancels and reverts

**Handler: `handleDelete`**:

```typescript
async function handleDelete() {
  setShowConfirm(false);
  setDeleteError(null);
  try {
    await onDelete(column._id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete column";
    setDeleteError(message);
  }
}
```

- Closes the confirm dialog first
- Clears any previous error
- Calls `onDelete`; on failure, stores the error message in local state for display

**JSX structure**:

```tsx
<div
  ref={setNodeRef}
  style={style}
  className={`flex w-72 flex-shrink-0 flex-col rounded-lg bg-gray-100 ${
    isDragging ? "opacity-50" : ""
  }`}
>
  {/* Header */}
  <div className="flex items-center gap-2 px-3 py-2">
    {/* Drag handle */}
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
      aria-label="Drag to reorder column"
    >
      {/* Grip icon SVG — 6-dot grip pattern */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
      </svg>
    </button>

    {/* Column name: editable or static */}
    {isEditing ? (
      <input
        ref={inputRef}
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onKeyDown={handleRenameKeyDown}
        onBlur={handleRenameSubmit}
        className="min-w-0 flex-1 rounded border border-blue-300 px-1 py-0.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Column name"
      />
    ) : (
      <h3
        onDoubleClick={handleDoubleClick}
        className="flex-1 cursor-pointer truncate text-sm font-semibold text-gray-900"
        title="Double-click to rename"
      >
        {column.name}
      </h3>
    )}

    {/* Task count badge */}
    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
      {taskCount}
    </span>

    {/* Delete button */}
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
      aria-label="Delete column"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.78.72l.5 6a.75.75 0 01-1.5.12l-.5-6a.75.75 0 01.72-.78zm2.06.72a.75.75 0 011.5-.12l.5 6a.75.75 0 11-1.5.12l-.5-6z" clipRule="evenodd" />
      </svg>
    </button>
  </div>

  {/* Delete error */}
  {deleteError && (
    <div className="px-3 pb-2">
      <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
    </div>
  )}

  {/* Task list — scrollable */}
  <div className="flex-1 overflow-y-auto px-3 pb-3">
    {children}
  </div>

  {/* Confirm dialog for delete */}
  <ConfirmDialog
    isOpen={showConfirm}
    message={`Are you sure you want to delete the "${column.name}" column?`}
    confirmLabel="Delete"
    onConfirm={handleDelete}
    onCancel={() => setShowConfirm(false)}
  />
</div>
```

**Tailwind styling notes**:
- `w-72` — fixed width for kanban column feel (288px)
- `flex-shrink-0` — prevents column from shrinking in the horizontal flex container
- `bg-gray-100` — subtle background distinguishing columns from the board background
- `rounded-lg` — rounded corners
- `opacity-50` when `isDragging` — visual feedback during drag
- The drag handle uses `cursor-grab` and `touch-none` for proper drag UX
- The task container uses `overflow-y-auto` for scrolling when many tasks exist
- The trash icon SVG is the same one used in `project-card.tsx` for consistency

**Pattern notes**:
- The drag handle gets `setActivatorNodeRef`, `attributes`, and `listeners` — this means only the handle initiates a drag, not the entire column. The column wrapper gets `setNodeRef` for position tracking.
- `CSS.Transform.toString(transform)` converts the dnd-kit transform to a CSS transform string.
- The `ConfirmDialog` is rendered within the component but portals to `document.body` via `Modal`, so it doesn't affect the column layout.

### 3.2 `packages/client/src/components/__tests__/column.test.tsx`

**Purpose**: Unit tests for the `Column` component covering rendering, inline rename, delete flow, error display, and drag handle wiring.

**Mock setup**:

Since `Column` uses `useSortable` from `@dnd-kit/sortable`, we must mock it. The component also depends on `ConfirmDialog` which uses `Modal` which uses `createPortal` — jsdom supports this, but we need to be careful about querying portal content.

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Column } from "../column";
import type { Column as ColumnType } from "@taskboard/shared";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: { role: "button", tabIndex: 0 },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));
```

**Mock data**:

```typescript
const mockColumn: ColumnType = {
  _id: "col1",
  name: "To Do",
  position: 0,
};
```

**Render helper**:

```typescript
function renderColumn(
  props?: Partial<{
    column: ColumnType;
    taskCount: number;
    onRename: (columnId: string, name: string) => Promise<void>;
    onDelete: (columnId: string) => Promise<void>;
    children: React.ReactNode;
  }>,
) {
  const defaultProps = {
    column: mockColumn,
    taskCount: 3,
    onRename: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    children: <div data-testid="task-stub">Task 1</div>,
  };
  const finalProps = { ...defaultProps, ...props };
  return { ...render(<Column {...finalProps} />), ...finalProps };
}
```

**Test cases**:

| # | Test | Description |
|---|------|-------------|
| 1 | `renders column name` | Verify `column.name` text is displayed as a heading |
| 2 | `renders task count badge` | Verify the `taskCount` number is displayed |
| 3 | `renders children` | Verify children (task stub) are rendered inside the column |
| 4 | `renders drag handle with correct aria-label` | Verify a button with "Drag to reorder column" label is present |
| 5 | `renders delete button with correct aria-label` | Verify a button with "Delete column" label is present |
| 6 | `double-click enters edit mode` | Double-click the column name heading; verify an input appears with the column name as value |
| 7 | `Enter saves rename and calls onRename` | Enter edit mode; change value; press Enter; verify `onRename` called with `(column._id, newName)` |
| 8 | `Escape cancels rename without calling onRename` | Enter edit mode; change value; press Escape; verify `onRename` not called; verify heading shows original name |
| 9 | `rename with empty string does not call onRename` | Enter edit mode; clear input; press Enter; verify `onRename` not called |
| 10 | `rename with unchanged name does not call onRename` | Enter edit mode; press Enter without changing; verify `onRename` not called |
| 11 | `delete button opens confirm dialog` | Click delete button; verify confirm dialog message is visible |
| 12 | `confirming delete calls onDelete` | Click delete; confirm; verify `onDelete` called with `column._id` |
| 13 | `cancelling delete does not call onDelete` | Click delete; click Cancel in dialog; verify `onDelete` not called |
| 14 | `delete error displays ErrorMessage` | Mock `onDelete` to reject; click delete; confirm; verify error message is displayed |
| 15 | `dismissing delete error clears it` | After error is shown, click dismiss button; verify error disappears |

**Detailed test implementations**:

**Test 1: `renders column name`**
```typescript
it("renders column name", () => {
  renderColumn();
  expect(screen.getByText("To Do")).toBeInTheDocument();
});
```

**Test 2: `renders task count badge`**
```typescript
it("renders task count badge", () => {
  renderColumn({ taskCount: 5 });
  expect(screen.getByText("5")).toBeInTheDocument();
});
```

**Test 3: `renders children`**
```typescript
it("renders children", () => {
  renderColumn();
  expect(screen.getByTestId("task-stub")).toBeInTheDocument();
});
```

**Test 4: `renders drag handle`**
```typescript
it("renders drag handle with correct aria-label", () => {
  renderColumn();
  expect(screen.getByLabelText("Drag to reorder column")).toBeInTheDocument();
});
```

**Test 5: `renders delete button`**
```typescript
it("renders delete button with correct aria-label", () => {
  renderColumn();
  expect(screen.getByLabelText("Delete column")).toBeInTheDocument();
});
```

**Test 6: `double-click enters edit mode`**
```typescript
it("double-click enters edit mode", () => {
  renderColumn();
  fireEvent.doubleClick(screen.getByText("To Do"));
  const input = screen.getByLabelText("Column name");
  expect(input).toBeInTheDocument();
  expect(input).toHaveValue("To Do");
});
```

**Test 7: `Enter saves rename`**
```typescript
it("Enter saves rename and calls onRename", async () => {
  const onRename = vi.fn().mockResolvedValue(undefined);
  renderColumn({ onRename });
  fireEvent.doubleClick(screen.getByText("To Do"));
  const input = screen.getByLabelText("Column name");
  fireEvent.change(input, { target: { value: "Backlog" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => {
    expect(onRename).toHaveBeenCalledWith("col1", "Backlog");
  });
});
```

**Test 8: `Escape cancels rename`**
```typescript
it("Escape cancels rename without calling onRename", () => {
  const onRename = vi.fn();
  renderColumn({ onRename });
  fireEvent.doubleClick(screen.getByText("To Do"));
  const input = screen.getByLabelText("Column name");
  fireEvent.change(input, { target: { value: "Backlog" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(onRename).not.toHaveBeenCalled();
  expect(screen.getByText("To Do")).toBeInTheDocument();
});
```

**Test 9: `rename with empty string does not call onRename`**
```typescript
it("rename with empty string does not call onRename", async () => {
  const onRename = vi.fn();
  renderColumn({ onRename });
  fireEvent.doubleClick(screen.getByText("To Do"));
  const input = screen.getByLabelText("Column name");
  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onRename).not.toHaveBeenCalled();
});
```

**Test 10: `rename with unchanged name does not call onRename`**
```typescript
it("rename with unchanged name does not call onRename", async () => {
  const onRename = vi.fn();
  renderColumn({ onRename });
  fireEvent.doubleClick(screen.getByText("To Do"));
  const input = screen.getByLabelText("Column name");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onRename).not.toHaveBeenCalled();
});
```

**Test 11: `delete button opens confirm dialog`**
```typescript
it("delete button opens confirm dialog", () => {
  renderColumn();
  fireEvent.click(screen.getByLabelText("Delete column"));
  expect(screen.getByText(/Are you sure you want to delete the "To Do" column/)).toBeInTheDocument();
});
```

**Test 12: `confirming delete calls onDelete`**
```typescript
it("confirming delete calls onDelete", async () => {
  const onDelete = vi.fn().mockResolvedValue(undefined);
  renderColumn({ onDelete });
  fireEvent.click(screen.getByLabelText("Delete column"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => {
    expect(onDelete).toHaveBeenCalledWith("col1");
  });
});
```

**Test 13: `cancelling delete does not call onDelete`**
```typescript
it("cancelling delete does not call onDelete", () => {
  const onDelete = vi.fn();
  renderColumn({ onDelete });
  fireEvent.click(screen.getByLabelText("Delete column"));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onDelete).not.toHaveBeenCalled();
});
```

**Test 14: `delete error displays ErrorMessage`**
```typescript
it("delete error displays ErrorMessage", async () => {
  const onDelete = vi.fn().mockRejectedValue(new Error("Cannot delete column that contains tasks"));
  renderColumn({ onDelete });
  fireEvent.click(screen.getByLabelText("Delete column"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => {
    expect(screen.getByText("Cannot delete column that contains tasks")).toBeInTheDocument();
  });
});
```

**Test 15: `dismissing delete error clears it`**
```typescript
it("dismissing delete error clears it", async () => {
  const onDelete = vi.fn().mockRejectedValue(new Error("Cannot delete column that contains tasks"));
  renderColumn({ onDelete });
  fireEvent.click(screen.getByLabelText("Delete column"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => {
    expect(screen.getByText("Cannot delete column that contains tasks")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByLabelText("Dismiss"));
  expect(screen.queryByText("Cannot delete column that contains tasks")).not.toBeInTheDocument();
});
```

## 4. Contracts

### `ColumnProps` interface

| Prop | Type | Description |
|------|------|-------------|
| `column` | `Column` (from `@taskboard/shared`) | The column data: `{ _id, name, position }` |
| `taskCount` | `number` | Number of tasks in this column (displayed as badge) |
| `onRename` | `(columnId: string, name: string) => Promise<void>` | Callback when user renames the column; should call `BoardContext.renameColumn` |
| `onDelete` | `(columnId: string) => Promise<void>` | Callback when user confirms column deletion; should call `BoardContext.removeColumn` |
| `children` | `ReactNode` | Task elements to render inside the column's scrollable container |

### How `BoardView` (Task 5) will consume this component

```tsx
// In BoardView:
{board.columns.map((column) => {
  const columnTasks = tasks.filter((t) => t.status === column.name);
  return (
    <Column
      key={column._id}
      column={column}
      taskCount={columnTasks.length}
      onRename={async (columnId, name) => {
        await renameColumn(columnId, name);
      }}
      onDelete={async (columnId) => {
        await removeColumn(columnId);
      }}
    >
      {columnTasks.map((task) => (
        <div key={task._id} className="mb-2 rounded bg-white p-2 text-sm shadow-sm">
          {task.title}
        </div>
      ))}
    </Column>
  );
})}
```

### dnd-kit integration contract

The `Column` component uses `useSortable({ id: column._id })` and exposes:
- `setNodeRef` on the column wrapper `<div>` — for dnd-kit to track the column's position
- `setActivatorNodeRef` on the drag handle `<button>` — restricts drag initiation to the handle only
- `attributes` and `listeners` on the drag handle — enables drag interaction
- `transform` and `transition` as inline styles on the wrapper — moves the column during drag
- `isDragging` to reduce opacity during drag

The parent `BoardView` (Task 5) wraps columns in `DndContext` + `SortableContext` for the drag orchestration.

## 5. Test Plan

### 5.1 Test file

`packages/client/src/components/__tests__/column.test.tsx`

### 5.2 Test setup

- Mock `@dnd-kit/sortable` to return a stable `useSortable` value with no-op refs and `isDragging: false`
- Mock `@dnd-kit/utilities` to provide `CSS.Transform.toString` that returns `undefined`
- Define `mockColumn` constant and `renderColumn` helper following the project's test conventions (see `project-card.test.tsx` pattern)

### 5.3 Test specifications

**`describe("Column")`**:

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `renders column name` | Column name text is visible |
| 2 | `renders task count badge` | Task count number is displayed |
| 3 | `renders children` | Children passed as task stubs are rendered |
| 4 | `renders drag handle with correct aria-label` | Drag handle button exists with proper label |
| 5 | `renders delete button with correct aria-label` | Delete button exists with proper label |
| 6 | `double-click enters edit mode` | Double-clicking name shows input with current name |
| 7 | `Enter saves rename and calls onRename` | Changing name + Enter → `onRename(columnId, newName)` called |
| 8 | `Escape cancels rename without calling onRename` | Changing name + Escape → no callback, original name restored |
| 9 | `rename with empty string does not call onRename` | Clearing input + Enter → no callback |
| 10 | `rename with unchanged name does not call onRename` | No change + Enter → no callback |
| 11 | `delete button opens confirm dialog` | Click delete → confirm dialog message visible |
| 12 | `confirming delete calls onDelete` | Click delete → confirm → `onDelete(columnId)` called |
| 13 | `cancelling delete does not call onDelete` | Click delete → cancel → no callback |
| 14 | `delete error displays ErrorMessage` | `onDelete` rejects → error message visible |
| 15 | `dismissing delete error clears it` | Click dismiss on error → error disappears |

## 6. Implementation Order

1. **Create `packages/client/src/components/column.tsx`** — implement the full component as specified in Section 3.1
2. **Create `packages/client/src/components/__tests__/column.test.tsx`** — implement all 15 test cases as specified in Section 3.2
3. **Verify TypeScript compilation** — `npx tsc --noEmit` from `packages/client`
4. **Run column tests** — `npx vitest run src/components/__tests__/column.test.tsx` from `packages/client`
5. **Run all client tests** — `npm run test --workspace=@taskboard/client` to confirm no regressions

## 7. Verification Commands

```bash
# 1. Verify the component file exists
ls packages/client/src/components/column.tsx

# 2. Verify the test file exists
ls packages/client/src/components/__tests__/column.test.tsx

# 3. Verify the component exports
grep "^export function Column" packages/client/src/components/column.tsx

# 4. Verify useSortable is used
grep "useSortable" packages/client/src/components/column.tsx

# 5. Verify ConfirmDialog is used
grep "ConfirmDialog" packages/client/src/components/column.tsx

# 6. Verify ErrorMessage is used
grep "ErrorMessage" packages/client/src/components/column.tsx

# 7. TypeScript compilation
cd packages/client && npx tsc --noEmit && cd ../..

# 8. Run column tests only
cd packages/client && npx vitest run src/components/__tests__/column.test.tsx && cd ../..

# 9. Run all client tests to check for regressions
npm run test --workspace=@taskboard/client
```