Now I have all the context I need. Let me produce the implementation plan.

# Task 5 Plan: TaskCard Label Colors

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/task-card.tsx` | Modified | Replace placeholder gray label dots with actual label colors from BoardContext, add hover tooltips |

---

## 2. Dependencies

- **Task 4 (Labels in BoardContext)** — `labels: Label[]` must be available via `useBoard()`. Confirmed present in `packages/client/src/context/board-context.tsx` (line 46, 59, 301).
- **`Label` type** from `@taskboard/shared` at `packages/shared/src/types/index.ts` (lines 66-72) — provides `_id`, `name`, `color`, `project`, `createdAt`.
- **Existing `TaskCard`** at `packages/client/src/components/task-card.tsx` — currently renders placeholder gray dots (`bg-gray-400`) for each label ID in `task.labels` (lines 55-65).
- **`useBoard` hook** at `packages/client/src/context/board-context.tsx` (lines 324-330) — returns the `BoardContextValue` including `labels`.

---

## 3. Implementation Details

### Deliverable 1: Modified `packages/client/src/components/task-card.tsx`

**Overview of changes**: Three discrete modifications — add imports for `Label` and `useBoard`, build a label lookup map for efficient matching, and replace the placeholder gray dot rendering with colored dots that have hover tooltips.

---

#### Change 1: Add imports

**Current imports** (line 1):
```typescript
import type { Priority, Task } from "@taskboard/shared";
```

**Modified imports**:
```typescript
import type { Label, Priority, Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";
```

**Notes**:
- Add `Label` to the existing type import from `@taskboard/shared`.
- Add a new import for `useBoard` from the board context — this provides access to the `labels` array.
- The component will call `useBoard()` directly rather than receiving labels as a prop. This is simpler (no prop drilling needed) and the component is always rendered within a `BoardProvider`. The task spec says: "Consume `labels` from `useBoard()` (or receive them as a prop from the parent component)." Using `useBoard()` is the preferred approach since it avoids modifying the `TaskCardProps` interface, the `SortableTaskItem` wrapper, and the `DragOverlay` rendering — all of which pass `TaskCard` only `task` and `onClick`.

---

#### Change 2: Build a label lookup map inside the component

**Add at the top of the `TaskCard` function body** (after the opening `{` of the function, before the `return`):

```typescript
const { labels } = useBoard();
const labelMap = new Map<string, Label>(labels.map((l) => [l._id, l]));
```

**Key details**:
- `useBoard()` extracts only `labels` (destructured) to keep the component focused.
- A `Map<string, Label>` is built from the labels array for O(1) lookups per label ID — more efficient than `.find()` when a task has multiple labels.
- The map is rebuilt on each render. Since the labels array is typically small (project-scoped), this is negligible. Memoization is unnecessary complexity.

---

#### Change 3: Replace placeholder gray dots with colored dots

**Current label rendering** (lines 55-65):
```tsx
{task.labels.length > 0 && (
  <div className="flex gap-1">
    {task.labels.map((labelId) => (
      <span
        key={labelId}
        className="h-2 w-2 rounded-full bg-gray-400"
        aria-label="Label"
      />
    ))}
  </div>
)}
```

**Replacement**:
```tsx
{task.labels.length > 0 && (
  <div className="flex gap-1">
    {task.labels.map((labelId) => {
      const label = labelMap.get(labelId);
      if (!label) return null;
      return (
        <span
          key={labelId}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: label.color }}
          title={label.name}
          aria-label={label.name}
        />
      );
    })}
  </div>
)}
```

**Key details**:
- **Lookup**: `labelMap.get(labelId)` finds the matching `Label` object. If not found (stale data, deleted label), `return null` skips rendering — satisfying the spec requirement: "If a label ID is not found (e.g., stale data), skip rendering it."
- **Color**: Removed the static `bg-gray-400` Tailwind class. Instead, uses an inline `style={{ backgroundColor: label.color }}` where `label.color` is a hex string (e.g., `"#ef4444"`). Inline style is necessary because the color is dynamic and cannot be expressed as a Tailwind class at build time.
- **Tooltip**: Added `title={label.name}` to display the label name on hover — satisfying the spec requirement: "Add a `title` attribute to each dot showing the label name on hover."
- **Accessibility**: Changed `aria-label` from the static `"Label"` to `label.name` for better screen reader support — each dot now identifies itself by the label's actual name.
- **Sizing**: Retained the existing `h-2 w-2 rounded-full` classes for consistent dot size (8×8 px circle).

---

#### Full file after changes

```typescript
import type { Label, Priority, Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";

interface TaskCardProps {
  task: Task;
  onClick?: (taskId: string) => void;
}

export const PRIORITY_CLASSES: Record<Priority, string> = {
  low: "bg-gray-200 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(isoDate: string): boolean {
  const due = new Date(isoDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { labels } = useBoard();
  const labelMap = new Map<string, Label>(labels.map((l) => [l._id, l]));

  return (
    <div
      className="mb-2 cursor-pointer rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onClick?.(task._id)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(task._id);
              }
            }
          : undefined
      }
    >
      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[task.priority]}`}
        >
          {task.priority}
        </span>

        {task.labels.length > 0 && (
          <div className="flex gap-1">
            {task.labels.map((labelId) => {
              const label = labelMap.get(labelId);
              if (!label) return null;
              return (
                <span
                  key={labelId}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                  aria-label={label.name}
                />
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {task.dueDate && (
          <span
            className={`text-xs ${
              isOverdue(task.dueDate)
                ? "text-red-600 font-medium"
                : "text-gray-500"
            }`}
          >
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## 4. Contracts

### `TaskCard` component contract

**Props** (unchanged):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `task` | `Task` | Yes | The task object with `labels: string[]` containing label IDs |
| `onClick` | `(taskId: string) => void` | No | Click handler for opening the task detail panel |

**Context dependency** (new):

| Hook | Destructured Field | Type | Description |
|------|-------------------|------|-------------|
| `useBoard()` | `labels` | `Label[]` | All project labels used to look up color and name by ID |

**Rendering behavior**:

| `task.labels` state | `labelMap.get(id)` result | Rendered output |
|---------------------|--------------------------|-----------------|
| Empty array `[]` | N/A | No label dots rendered (entire section hidden) |
| `["id1", "id2"]` | Both found | Two colored dots with `backgroundColor` and `title` |
| `["id1", "id_stale"]` | `id1` found, `id_stale` not found | One colored dot for `id1`; stale ID renders `null` |
| `["id_stale"]` | Not found | The wrapping `<div>` renders but contains only `null` (no visible dots) |

**Label dot HTML structure** (per rendered dot):
```html
<span
  class="h-2 w-2 rounded-full"
  style="background-color: #ef4444"
  title="Bug"
  aria-label="Bug"
></span>
```

---

## 5. Test Plan

The existing test file at `packages/client/src/components/__tests__/task-card.test.tsx` must be updated to accommodate the `useBoard()` hook call. Currently, `TaskCard` is rendered without a `BoardProvider`, so the tests will fail after this change.

### Test setup changes

**Mock `useBoard`**: The simplest approach is to mock the `../context/board-context` module so `useBoard` returns a controlled value without needing a full `BoardProvider` wrapper.

Add at the top of the test file:
```typescript
import type { Label } from "@taskboard/shared";

const mockLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label3", name: "Enhancement", color: "#10b981", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

vi.mock("../context/board-context", () => ({
  useBoard: () => ({ labels: mockLabels }),
}));
```

**Note**: The mock returns only `{ labels: mockLabels }` — `TaskCard` only destructures `labels` from the context, so no other fields are needed.

### Existing tests that need adjustment

**Test: "renders label dots when labels are present"** (lines 90-96):

The current test asserts 3 dots via `screen.getAllByLabelText("Label")`. After the change, `aria-label` is the label's name, not the static string `"Label"`. Also, the test uses label IDs `["label1", "label2", "label3"]` which must match the mock data.

**Updated test**:
```typescript
it("renders label dots when labels are present", () => {
  renderCard({
    task: { ...baseTask, labels: ["label1", "label2", "label3"] },
  });
  expect(screen.getByLabelText("Bug")).toBeInTheDocument();
  expect(screen.getByLabelText("Feature")).toBeInTheDocument();
  expect(screen.getByLabelText("Enhancement")).toBeInTheDocument();
});
```

**Test: "does not render label dots when labels array is empty"** (lines 98-101):

The current test queries `screen.queryByLabelText("Label")`. After the change, there is no static `"Label"` aria-label. The test should verify no dots are rendered at all.

**Updated test**:
```typescript
it("does not render label dots when labels array is empty", () => {
  renderCard();
  expect(screen.queryByLabelText("Bug")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Feature")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Enhancement")).not.toBeInTheDocument();
});
```

### New tests to add

#### Test: "renders label dots with correct colors"

```typescript
it("renders label dots with correct colors", () => {
  renderCard({
    task: { ...baseTask, labels: ["label1", "label2"] },
  });
  const bugDot = screen.getByLabelText("Bug");
  const featureDot = screen.getByLabelText("Feature");
  expect(bugDot).toHaveStyle({ backgroundColor: "#ef4444" });
  expect(featureDot).toHaveStyle({ backgroundColor: "#3b82f6" });
});
```

#### Test: "renders label dots with title tooltip showing label name"

```typescript
it("renders label dots with title tooltip showing label name", () => {
  renderCard({
    task: { ...baseTask, labels: ["label1"] },
  });
  const dot = screen.getByLabelText("Bug");
  expect(dot).toHaveAttribute("title", "Bug");
});
```

#### Test: "skips rendering dots for missing/stale label IDs"

```typescript
it("skips rendering dots for missing label IDs", () => {
  renderCard({
    task: { ...baseTask, labels: ["label1", "nonexistent_id"] },
  });
  expect(screen.getByLabelText("Bug")).toBeInTheDocument();
  // Only one dot rendered — the nonexistent label is skipped
  const allDots = screen.getAllByRole("generic").filter(
    (el) => el.classList.contains("rounded-full") && el.classList.contains("h-2"),
  );
  expect(allDots).toHaveLength(1);
});
```

**Alternative simpler approach** for the stale label test:
```typescript
it("skips rendering dots for missing label IDs", () => {
  renderCard({
    task: { ...baseTask, labels: ["nonexistent_id"] },
  });
  // No label dots should be rendered since the ID doesn't match any label
  expect(screen.queryByTitle("Bug")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Feature")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Enhancement")).not.toBeInTheDocument();
});
```

---

## 6. Implementation Order

1. **Step 1**: Add `Label` to the type import and add the `useBoard` import in `task-card.tsx`
2. **Step 2**: Add `const { labels } = useBoard()` and `const labelMap = ...` at the top of the `TaskCard` function body
3. **Step 3**: Replace the label dot rendering block (lines 55-65) with the new version that uses `labelMap`, `style`, `title`, and `aria-label`
4. **Step 4**: Update the existing test file to mock `useBoard` and adjust the two existing label tests
5. **Step 5**: Add new tests for color rendering, tooltip, and stale ID handling
6. **Step 6**: Verify TypeScript compilation and run tests

---

## 7. Verification Commands

```bash
# 1. Build shared package (dependency)
npm run build --workspace=@taskboard/shared

# 2. Verify client package compiles with modified task-card.tsx
cd packages/client && npx tsc --noEmit

# 3. Run the task-card test suite
cd packages/client && npx vitest run src/components/__tests__/task-card.test.tsx

# 4. Run the full client test suite to check for regressions (board-view tests mock TaskCard)
cd packages/client && npx vitest run

# 5. Verify the useBoard import is present
grep -n "useBoard" packages/client/src/components/task-card.tsx

# 6. Verify placeholder bg-gray-400 is gone
grep -c "bg-gray-400" packages/client/src/components/task-card.tsx
# Expected: 0
```