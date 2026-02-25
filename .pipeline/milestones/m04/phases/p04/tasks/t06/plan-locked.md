I now have all the context. Let me produce the definitive plan.

# Task 6 Plan: LabelPicker Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/label-picker.tsx` | Created | Dropdown component for attaching/detaching labels from a task |
| 2 | `packages/client/src/components/task-detail-panel.tsx` | Modified | Integrate LabelPicker into the metadata section |
| 3 | `packages/client/src/components/__tests__/label-picker.test.tsx` | Created | Tests for the LabelPicker component |
| 4 | `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | Modified | Add `labels: []` to all `useBoard` mock return values |

---

## 2. Dependencies

- **`labels: Label[]`** from `useBoard()` — `packages/client/src/context/board-context.tsx` line 46. Provides all project labels to display in the dropdown.
- **`updateTask`** from `useBoard()` — `packages/client/src/context/board-context.tsx` line 43. Used to persist label changes via `PUT /api/tasks/:id` with `{ labels: string[] }`.
- **`UpdateTaskInput.labels?: string[]`** — `packages/client/src/api/tasks.ts` line 18. Confirms the `updateTask` API accepts a `labels` field.
- **`Label` type** from `@taskboard/shared` — `packages/shared/src/types/index.ts` lines 66-72. Provides `_id`, `name`, `color`, `project`, `createdAt`.
- **`Task` type** from `@taskboard/shared` — `packages/shared/src/types/index.ts` lines 33-46. `Task.labels` is `string[]` (array of label IDs).
- **Existing `TaskDetailPanel`** — `packages/client/src/components/task-detail-panel.tsx`. The metadata section is a `grid grid-cols-2 gap-4` at line 311 containing Priority (lines 312-332) and Due Date (lines 334-362). The LabelPicker will be integrated below this grid.
- **Task 7 (LabelManager)** — referenced by the "Manage labels" link. Since Task 7 is not yet implemented, the link will set a state flag and render a placeholder that Task 7 will replace.

---

## 3. Implementation Details

### Deliverable 1: `packages/client/src/components/label-picker.tsx`

**Purpose**: A dropdown/popover component that displays all project labels with checkboxes, allowing the user to attach/detach labels from a task.

**Props interface**:

```typescript
interface LabelPickerProps {
  taskId: string;
  labels: string[];
  onUpdate: (updatedTask: Task) => void;
}
```

- `taskId` — the ID of the task being edited
- `labels` — the current array of label IDs attached to the task (from `task.labels`)
- `onUpdate` — callback invoked with the updated `Task` after a successful API call, so `TaskDetailPanel` can sync its local `task` state (same pattern used for priority and due date changes)

**Component structure**:

```typescript
export function LabelPicker({ taskId, labels: taskLabels, onUpdate }: LabelPickerProps) {
  const { labels: projectLabels, updateTask } = useBoard();
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
```

**Key design decisions**:

1. **Click-outside-to-close**: Uses a `mousedown` event listener on `document` scoped to when `isOpen` is true, checking `containerRef.current.contains(e.target)`. The listener is cleaned up when the dropdown closes or the component unmounts.

2. **Toggle handler with error handling**: Computes the new `labels` array by adding/removing the toggled label ID, then calls `updateTask(taskId, { labels: updatedLabels })`. On success, calls `onUpdate(updatedTask)`. **Wraps the call in try/catch** — consistent with the existing `handlePriorityChange` (line 153) and `handleDueDateChange` (line 165) patterns in `TaskDetailPanel`, which all use try/catch. On failure, the toggle is silently ignored (no optimistic update was applied, so no revert needed).

3. **Trigger button content**: Shows colored dots for attached labels plus a count (e.g., "2 labels"), or "No labels" if none are attached.

4. **Dropdown positioning**: Uses `relative` on the container and `absolute z-10` on the dropdown, positioning it below the trigger button.

5. **"Manage labels" link**: Sets `showManager` state flag to `true`. Currently renders a placeholder; Task 7 will replace it with the actual `LabelManager` component.

6. **Empty state**: When `projectLabels.length === 0`, displays "No labels created yet" instead of an empty list.

**Full file content**:

```typescript
import { useState, useRef, useEffect } from "react";
import type { Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";

interface LabelPickerProps {
  taskId: string;
  labels: string[];
  onUpdate: (updatedTask: Task) => void;
}

export function LabelPicker({ taskId, labels: taskLabels, onUpdate }: LabelPickerProps) {
  const { labels: projectLabels, updateTask } = useBoard();
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleToggle(labelId: string) {
    const isAttached = taskLabels.includes(labelId);
    const updatedLabels = isAttached
      ? taskLabels.filter((id) => id !== labelId)
      : [...taskLabels, labelId];
    try {
      const updatedTask = await updateTask(taskId, { labels: updatedLabels });
      onUpdate(updatedTask);
    } catch {
      // No revert needed — checkbox reflects taskLabels prop which hasn't changed
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700">Labels</label>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        aria-label="Toggle label picker"
      >
        {taskLabels.length > 0 ? (
          <>
            {taskLabels.map((id) => {
              const label = projectLabels.find((l) => l._id === id);
              if (!label) return null;
              return (
                <span
                  key={id}
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              );
            })}
            <span className="ml-1 text-gray-500">
              {taskLabels.length} label{taskLabels.length !== 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <span className="text-gray-400">No labels</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
          {projectLabels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No labels created yet
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {projectLabels.map((label) => (
                <li key={label._id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={taskLabels.includes(label._id)}
                      onChange={() => handleToggle(label._id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-gray-700">{label.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-200 px-3 py-2">
            <button
              onClick={() => setShowManager(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage labels
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
```

---

### Deliverable 2: Modified `packages/client/src/components/task-detail-panel.tsx`

**Overview of changes**: Two modifications — add the `LabelPicker` import and integrate it into the metadata section.

#### Change 1: Add import

Add after the existing imports (after line 11):

```typescript
import { LabelPicker } from "./label-picker";
```

#### Change 2: Integrate LabelPicker below the metadata grid

The current metadata section (lines 310-363) is a `grid grid-cols-2 gap-4` containing Priority and Due Date. The LabelPicker will be placed immediately below this grid, not inside it — avoiding awkward layout issues and giving the dropdown popover room to render.

**Insert after the closing `</div>` of the grid (after line 363)**:

```tsx
{/* Labels */}
<div className="mt-4">
  <LabelPicker
    taskId={taskId}
    labels={task.labels}
    onUpdate={(updatedTask) => setTask(updatedTask)}
  />
</div>
```

**Key details**:
- `task.labels` provides the current label IDs attached to the task.
- `onUpdate={(updatedTask) => setTask(updatedTask)}` follows the same pattern as `handlePriorityChange` (line 153-163) and `handleDueDateChange` (line 165-178) which update local `task` state after a successful API call, which also propagates the updated task to `BoardContext.tasks` via the `updateTask` callback.
- Uses `mt-4` spacing consistent with the component's spacing pattern.

---

### Deliverable 3: `packages/client/src/components/__tests__/label-picker.test.tsx`

**Test setup**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LabelPicker } from "../label-picker";
import type { Label, Task } from "@taskboard/shared";

vi.mock("../../context/board-context");

import { useBoard } from "../../context/board-context";
```

**Mock data**:

```typescript
const mockProjectLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label3", name: "Enhancement", color: "#10b981", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

const mockUpdatedTask: Task = {
  _id: "task1",
  title: "Test Task",
  description: "",
  status: "To Do",
  priority: "medium",
  position: 0,
  labels: ["label1", "label2"],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};
```

**Test cases** (11 tests):

1. **"renders trigger button in closed state"** — verifies the button exists and shows "No labels" when no labels are attached
2. **"trigger button shows colored dots and count when labels are attached"** — dots with correct colors and "2 labels" text
3. **"opens dropdown showing all project labels on click"** — clicking trigger displays all label names
4. **"checked checkboxes match task's current labels"** — checkboxes for attached labels are checked, others unchecked
5. **"toggling a checkbox on calls updateTask with label added"** — verifies `updateTask("task1", { labels: ["label1", "label2"] })`
6. **"toggling a checkbox off calls updateTask with label removed"** — verifies `updateTask("task1", { labels: [] })`
7. **"calls onUpdate with the updated task after successful API call"** — verifies `onUpdate(mockUpdatedTask)`
8. **"does not call onUpdate when updateTask rejects"** — verifies error handling: `updateTask` rejects, `onUpdate` is never called, no unhandled rejection
9. **"closes dropdown when clicking outside"** — `mouseDown` on `document.body` closes the dropdown
10. **"shows 'Manage labels' link in dropdown"** — the link text is present
11. **"handles empty project labels list gracefully"** — shows "No labels created yet", no checkboxes

**Test 8 implementation** (the error-handling test added per feedback-v2):

```typescript
it("does not call onUpdate when updateTask rejects", async () => {
  const mockUpdateTask = vi.fn().mockRejectedValue(new Error("API error"));
  const mockOnUpdate = vi.fn();
  vi.mocked(useBoard).mockReturnValue({
    labels: mockProjectLabels,
    updateTask: mockUpdateTask,
  } as any);

  render(<LabelPicker taskId="task1" labels={["label1"]} onUpdate={mockOnUpdate} />);

  fireEvent.click(screen.getByLabelText("Toggle label picker"));
  fireEvent.click(screen.getAllByRole("checkbox")[1]); // Toggle Feature on

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalled();
  });

  expect(mockOnUpdate).not.toHaveBeenCalled();
});
```

---

### Deliverable 4: Modified `packages/client/src/components/__tests__/task-detail-panel.test.tsx`

**Overview**: The `TaskDetailPanel` now imports `LabelPicker`, which calls `useBoard()` to get `labels`. Every `vi.mocked(useBoard).mockReturnValue(...)` call needs `labels: []` added to prevent runtime errors.

**Pattern — before**:
```typescript
vi.mocked(useBoard).mockReturnValue({
  updateTask: vi.fn(),
} as any);
```

**Pattern — after**:
```typescript
vi.mocked(useBoard).mockReturnValue({
  updateTask: vi.fn(),
  labels: [],
} as any);
```

And for tests that also include `removeTask`:
```typescript
vi.mocked(useBoard).mockReturnValue({
  updateTask: vi.fn(),
  removeTask: vi.fn(),
  labels: [],
} as any);
```

There are approximately 30 such mock calls to update. No new test cases needed in this file — the `LabelPicker` integration is minimal (renders it as a child) and has its own dedicated test file.

---

## 4. Contracts

### `LabelPicker` props interface

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `taskId` | `string` | Yes | The ID of the task being edited |
| `labels` | `string[]` | Yes | Current label IDs attached to the task (`task.labels`) |
| `onUpdate` | `(updatedTask: Task) => void` | Yes | Callback invoked with the updated task after a successful label toggle |

### Context dependencies

| Hook | Destructured Fields | Type | Description |
|------|---------------------|------|-------------|
| `useBoard()` | `labels` | `Label[]` | All project labels for rendering checkbox rows |
| `useBoard()` | `updateTask` | `(taskId: string, updates: UpdateTaskInput) => Promise<Task>` | API call to persist the updated labels array |

### Rendering behavior for key states

| State | Trigger button shows | Dropdown content |
|-------|---------------------|------------------|
| No labels attached, project has labels | "No labels" text | All labels with unchecked checkboxes |
| 2 labels attached, project has 3 labels | 2 colored dots + "2 labels" | 3 labels, 2 checked, 1 unchecked |
| All labels attached | N colored dots + "N labels" | All checkboxes checked |
| Empty project labels list | "No labels" text | "No labels created yet" message |
| Dropdown closed | Trigger button only | Dropdown hidden |

### Integration with TaskDetailPanel

The `LabelPicker` is rendered below the Priority/Due Date grid:

```tsx
<LabelPicker
  taskId={taskId}
  labels={task.labels}
  onUpdate={(updatedTask) => setTask(updatedTask)}
/>
```

This follows the same `onUpdate → setTask` pattern used by:
- `handlePriorityChange` (line 153-163): calls `updateTask`, then `setTask(updated)`
- `handleDueDateChange` (line 165-178): calls `updateTask`, then `setTask(updated)`

---

## 5. Test Plan

### New test file: `packages/client/src/components/__tests__/label-picker.test.tsx`

11 tests covering:

1. **Renders trigger button in closed state** — verifies the button exists and shows "No labels"
2. **Trigger button shows colored dots and count** — dots with correct colors and count string
3. **Opens dropdown showing all project labels on click** — all labels displayed by name
4. **Checked checkboxes match task's current labels** — attached labels checked, others unchecked
5. **Toggling a checkbox on calls updateTask with label added** — correct expanded labels array
6. **Toggling a checkbox off calls updateTask with label removed** — label removed from array
7. **Calls onUpdate with the updated task after successful API call** — `onUpdate` receives the task from `updateTask`
8. **Does not call onUpdate when updateTask rejects** — error handling: `onUpdate` not called on failure
9. **Closes dropdown when clicking outside** — `mouseDown` on `document.body` closes dropdown
10. **Shows "Manage labels" link in dropdown** — link text present
11. **Handles empty project labels list gracefully** — "No labels created yet" message, no checkboxes

### Modified test file: `packages/client/src/components/__tests__/task-detail-panel.test.tsx`

- Add `labels: []` to every `useBoard` mock return value (~30 occurrences)
- No new test cases needed

---

## 6. Implementation Order

1. **Step 1**: Create `packages/client/src/components/label-picker.tsx` with the full component implementation
2. **Step 2**: Modify `packages/client/src/components/task-detail-panel.tsx`:
   - Add the `LabelPicker` import (after line 11)
   - Insert the `LabelPicker` JSX below the metadata grid (after line 363)
3. **Step 3**: Create `packages/client/src/components/__tests__/label-picker.test.tsx` with all 11 test cases
4. **Step 4**: Modify `packages/client/src/components/__tests__/task-detail-panel.test.tsx`:
   - Add `labels: []` to every `useBoard` mock return value
5. **Step 5**: Verify TypeScript compilation
6. **Step 6**: Run tests

---

## 7. Verification Commands

```bash
# 1. Build the shared package (dependency for client)
npm run build --workspace=@taskboard/shared

# 2. Verify client package compiles with the new and modified files
cd packages/client && npx tsc --noEmit

# 3. Run the label-picker test suite
cd packages/client && npx vitest run src/components/__tests__/label-picker.test.tsx

# 4. Run the task-detail-panel test suite (verify mocks are updated correctly)
cd packages/client && npx vitest run src/components/__tests__/task-detail-panel.test.tsx

# 5. Run the full client test suite to check for regressions
cd packages/client && npx vitest run

# 6. Verify the LabelPicker import is present in task-detail-panel.tsx
grep -n "LabelPicker" packages/client/src/components/task-detail-panel.tsx

# 7. Verify the useBoard mock includes labels in test file
grep -c "labels:" packages/client/src/components/__tests__/task-detail-panel.test.tsx
```