Now I have all the context I need. Let me write the plan.

# Task 8 Plan: FilterBar Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/filter-bar.tsx` | Created | Horizontal filter bar with label, priority, and due date controls, plus clear button and task count summary |
| 2 | `packages/client/src/components/__tests__/filter-bar.test.tsx` | Created | Tests for the FilterBar component |

---

## 2. Dependencies

- **`labels: Label[]`** from `useBoard()` — `packages/client/src/context/board-context.tsx` line 46. Provides all project labels for the label filter dropdown.
- **`Label` type** from `@taskboard/shared` — `packages/shared/src/types/index.ts` lines 66-72. Defines `_id`, `name`, `color`, `project`, `createdAt`.
- **`Priority` type** from `@taskboard/shared` — `packages/shared/src/types/index.ts` line 74. Type union `"low" | "medium" | "high" | "urgent"`.
- **`PRIORITIES` constant** from `@taskboard/shared` — `packages/shared/src/constants/index.ts` lines 3-8. The array `["low", "medium", "high", "urgent"]` for rendering priority checkboxes. Note: need to verify this is exported from the shared package's main entry.

---

## 3. Implementation Details

### Deliverable 1: `packages/client/src/components/filter-bar.tsx`

**Purpose**: A horizontal bar rendered above the board columns with controls for filtering tasks by label, priority, and due date range. The component manages its own internal filter state and communicates changes to the parent via an `onFilterChange` callback.

**Exports**:
- `FilterBar` — the component
- `FilterState` — the filter state type (exported for use by `BoardView` in Task 9)

**Filter state shape**:

```typescript
export interface FilterState {
  labels: string[];
  priorities: Priority[];
  dueDateFrom: string | null;
  dueDateTo: string | null;
}
```

**Props interface**:

```typescript
interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}
```

- `onFilterChange` — callback invoked whenever any filter value changes, emitting the complete current filter state
- `totalCount` — total number of tasks on the board (unfiltered), used for the summary badge
- `filteredCount` — number of tasks currently visible after applying filters, used for the summary badge

**Design rationale for `totalCount`/`filteredCount` as props vs self-computing**: The `FilterBar` doesn't have access to the full task list — filtering logic lives in `BoardView` (Task 9). Passing counts as props keeps the component simple and avoids a dependency on `tasks` from `BoardContext`.

**Component state**:

```typescript
const { labels: projectLabels } = useBoard();
const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
const [dueDateFrom, setDueDateFrom] = useState("");
const [dueDateTo, setDueDateTo] = useState("");
const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
const labelDropdownRef = useRef<HTMLDivElement>(null);
const priorityDropdownRef = useRef<HTMLDivElement>(null);
```

**Derived values**:

```typescript
const hasActiveFilters =
  selectedLabels.length > 0 ||
  selectedPriorities.length > 0 ||
  dueDateFrom !== "" ||
  dueDateTo !== "";
```

**Key design decisions**:

1. **Notify parent via `onFilterChange`**: Every toggle/change handler computes the new filter state and calls `onFilterChange` with the full `FilterState` object. This makes the parent (`BoardView` in Task 9) the single source of truth for filtering — `FilterBar` only manages its own UI state.

2. **Label filter as multi-select dropdown**: A button trigger shows the count of selected labels. The dropdown lists all project labels with checkboxes, colored swatches, and names — reusing the same visual pattern as `LabelPicker`. Click-outside-to-close via `mousedown` event listener.

3. **Priority filter as multi-select dropdown**: A button trigger shows the count of selected priorities. The dropdown lists all four priority values with checkboxes and capitalized labels. Click-outside-to-close via `mousedown` event listener.

4. **Due date filter as two inline date inputs**: "From" and "To" date inputs rendered inline (not in a dropdown). Either can be left empty for open-ended ranges.

5. **"Clear filters" button**: Only visible when `hasActiveFilters` is true. Resets all internal state and calls `onFilterChange` with the empty filter state.

6. **Task count summary**: When `hasActiveFilters` is true, displays "Showing {filteredCount} of {totalCount} tasks" next to the clear button.

**Helper: `emitFilters`**

Instead of duplicating the `onFilterChange` call in every handler, a helper function builds the `FilterState` from the current state values. However, since React state updates are batched and async, each handler must compute the *new* state locally and pass it directly to `onFilterChange` rather than reading from state.

**Handler functions**:

#### `handleLabelToggle(labelId: string)`

```typescript
function handleLabelToggle(labelId: string) {
  const updated = selectedLabels.includes(labelId)
    ? selectedLabels.filter((id) => id !== labelId)
    : [...selectedLabels, labelId];
  setSelectedLabels(updated);
  onFilterChange({
    labels: updated,
    priorities: selectedPriorities,
    dueDateFrom: dueDateFrom || null,
    dueDateTo: dueDateTo || null,
  });
}
```

#### `handlePriorityToggle(priority: Priority)`

```typescript
function handlePriorityToggle(priority: Priority) {
  const updated = selectedPriorities.includes(priority)
    ? selectedPriorities.filter((p) => p !== priority)
    : [...selectedPriorities, priority];
  setSelectedPriorities(updated);
  onFilterChange({
    labels: selectedLabels,
    priorities: updated,
    dueDateFrom: dueDateFrom || null,
    dueDateTo: dueDateTo || null,
  });
}
```

#### `handleDueDateFromChange(value: string)`

```typescript
function handleDueDateFromChange(value: string) {
  setDueDateFrom(value);
  onFilterChange({
    labels: selectedLabels,
    priorities: selectedPriorities,
    dueDateFrom: value || null,
    dueDateTo: dueDateTo || null,
  });
}
```

#### `handleDueDateToChange(value: string)`

```typescript
function handleDueDateToChange(value: string) {
  setDueDateTo(value);
  onFilterChange({
    labels: selectedLabels,
    priorities: selectedPriorities,
    dueDateFrom: dueDateFrom || null,
    dueDateTo: value || null,
  });
}
```

#### `handleClear()`

```typescript
function handleClear() {
  setSelectedLabels([]);
  setSelectedPriorities([]);
  setDueDateFrom("");
  setDueDateTo("");
  setLabelDropdownOpen(false);
  setPriorityDropdownOpen(false);
  onFilterChange({
    labels: [],
    priorities: [],
    dueDateFrom: null,
    dueDateTo: null,
  });
}
```

**Click-outside-to-close for dropdowns**:

```typescript
useEffect(() => {
  if (!labelDropdownOpen && !priorityDropdownOpen) return;
  function handleClickOutside(e: MouseEvent) {
    if (
      labelDropdownOpen &&
      labelDropdownRef.current &&
      !labelDropdownRef.current.contains(e.target as Node)
    ) {
      setLabelDropdownOpen(false);
    }
    if (
      priorityDropdownOpen &&
      priorityDropdownRef.current &&
      !priorityDropdownRef.current.contains(e.target as Node)
    ) {
      setPriorityDropdownOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [labelDropdownOpen, priorityDropdownOpen]);
```

**Full file content**:

```typescript
import { useState, useRef, useEffect } from "react";
import type { Priority } from "@taskboard/shared";
import { useBoard } from "../context/board-context";

export interface FilterState {
  labels: string[];
  priorities: Priority[];
  dueDateFrom: string | null;
  dueDateTo: string | null;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function FilterBar({ onFilterChange, totalCount, filteredCount }: FilterBarProps) {
  const { labels: projectLabels } = useBoard();
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    selectedLabels.length > 0 ||
    selectedPriorities.length > 0 ||
    dueDateFrom !== "" ||
    dueDateTo !== "";

  useEffect(() => {
    if (!labelDropdownOpen && !priorityDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        labelDropdownOpen &&
        labelDropdownRef.current &&
        !labelDropdownRef.current.contains(e.target as Node)
      ) {
        setLabelDropdownOpen(false);
      }
      if (
        priorityDropdownOpen &&
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(e.target as Node)
      ) {
        setPriorityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [labelDropdownOpen, priorityDropdownOpen]);

  function handleLabelToggle(labelId: string) {
    const updated = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId];
    setSelectedLabels(updated);
    onFilterChange({
      labels: updated,
      priorities: selectedPriorities,
      dueDateFrom: dueDateFrom || null,
      dueDateTo: dueDateTo || null,
    });
  }

  function handlePriorityToggle(priority: Priority) {
    const updated = selectedPriorities.includes(priority)
      ? selectedPriorities.filter((p) => p !== priority)
      : [...selectedPriorities, priority];
    setSelectedPriorities(updated);
    onFilterChange({
      labels: selectedLabels,
      priorities: updated,
      dueDateFrom: dueDateFrom || null,
      dueDateTo: dueDateTo || null,
    });
  }

  function handleDueDateFromChange(value: string) {
    setDueDateFrom(value);
    onFilterChange({
      labels: selectedLabels,
      priorities: selectedPriorities,
      dueDateFrom: value || null,
      dueDateTo: dueDateTo || null,
    });
  }

  function handleDueDateToChange(value: string) {
    setDueDateTo(value);
    onFilterChange({
      labels: selectedLabels,
      priorities: selectedPriorities,
      dueDateFrom: dueDateFrom || null,
      dueDateTo: value || null,
    });
  }

  function handleClear() {
    setSelectedLabels([]);
    setSelectedPriorities([]);
    setDueDateFrom("");
    setDueDateTo("");
    setLabelDropdownOpen(false);
    setPriorityDropdownOpen(false);
    onFilterChange({
      labels: [],
      priorities: [],
      dueDateFrom: null,
      dueDateTo: null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
      {/* Label filter */}
      <div ref={labelDropdownRef} className="relative">
        <button
          onClick={() => setLabelDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
            selectedLabels.length > 0
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
          aria-label="Filter by label"
        >
          Labels
          {selectedLabels.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              {selectedLabels.length}
            </span>
          )}
        </button>

        {labelDropdownOpen && (
          <div className="absolute z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
            {projectLabels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No labels available
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto py-1">
                {projectLabels.map((label) => (
                  <li key={label._id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedLabels.includes(label._id)}
                        onChange={() => handleLabelToggle(label._id)}
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
          </div>
        )}
      </div>

      {/* Priority filter */}
      <div ref={priorityDropdownRef} className="relative">
        <button
          onClick={() => setPriorityDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
            selectedPriorities.length > 0
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
          aria-label="Filter by priority"
        >
          Priority
          {selectedPriorities.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              {selectedPriorities.length}
            </span>
          )}
        </button>

        {priorityDropdownOpen && (
          <div className="absolute z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg">
            <ul className="py-1">
              {PRIORITY_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(opt.value)}
                      onChange={() => handlePriorityToggle(opt.value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Due date range filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Due:</span>
        <input
          type="date"
          value={dueDateFrom}
          onChange={(e) => handleDueDateFromChange(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Due date from"
        />
        <span className="text-sm text-gray-400">–</span>
        <input
          type="date"
          value={dueDateTo}
          onChange={(e) => handleDueDateToChange(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Due date to"
        />
      </div>

      {/* Clear filters + count summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">
            Showing {filteredCount} of {totalCount} tasks
          </span>
          <button
            onClick={handleClear}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
```

**Design notes**:
- The bar uses `flex flex-wrap items-center gap-3` to flow controls across the width, wrapping on smaller screens.
- Active filter buttons get `border-blue-300 bg-blue-50 text-blue-700` styling to distinguish them from inactive ones.
- The count badge on the filter buttons uses a small circular `bg-blue-600` pill — same pattern as notification badges in the existing codebase.
- Dropdown z-index is `z-20` (higher than the label picker's `z-10`) since the filter bar sits above columns which may have their own z-indexed elements.
- The "Clear filters" button and task count summary are right-aligned via `ml-auto`.
- The `PRIORITY_OPTIONS` array is defined locally (matching the same array in `task-detail-panel.tsx` line 19-24) rather than importing from shared — this avoids adding a display-label constant to the shared package for what is purely a UI concern.
- Empty strings for `dueDateFrom`/`dueDateTo` are converted to `null` when emitting to `onFilterChange`, keeping the external interface clean.

---

## 4. Contracts

### `FilterState` interface

```typescript
export interface FilterState {
  labels: string[];        // Label IDs to filter by (OR logic: show tasks with ANY selected label)
  priorities: Priority[];  // Priorities to filter by (OR logic: show tasks matching ANY selected priority)
  dueDateFrom: string | null;  // ISO date string "YYYY-MM-DD" or null (inclusive lower bound)
  dueDateTo: string | null;    // ISO date string "YYYY-MM-DD" or null (inclusive upper bound)
}
```

### `FilterBarProps` interface

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onFilterChange` | `(filters: FilterState) => void` | Yes | Called whenever any filter value changes, emitting the complete filter state |
| `totalCount` | `number` | Yes | Total number of tasks on the board (unfiltered) |
| `filteredCount` | `number` | Yes | Number of tasks visible after applying filters |

### Context dependencies

| Hook | Destructured Fields | Type | Description |
|------|---------------------|------|-------------|
| `useBoard()` | `labels` | `Label[]` | All project labels for the label filter dropdown |

### Rendering behavior for key states

| State | Rendered output |
|-------|----------------|
| No filters active | Labels button (no badge), Priority button (no badge), empty date inputs, no clear button, no count |
| 2 labels selected | Labels button with blue styling + badge "2", dropdown shows 2 checked checkboxes |
| 1 priority selected | Priority button with blue styling + badge "1", dropdown shows 1 checked checkbox |
| Due date from set | "From" date input has value, clear button visible, count summary visible |
| All filters active | All buttons highlighted, badges shown, count "Showing X of Y tasks", "Clear filters" button visible |
| Clear filters clicked | All state reset, `onFilterChange` called with empty filter state |
| No project labels | Label dropdown shows "No labels available" instead of empty list |

### `onFilterChange` examples

**Label toggled on**:
```typescript
onFilterChange({
  labels: ["label1"],
  priorities: [],
  dueDateFrom: null,
  dueDateTo: null,
})
```

**Priority added**:
```typescript
onFilterChange({
  labels: ["label1"],
  priorities: ["high"],
  dueDateFrom: null,
  dueDateTo: null,
})
```

**Due date range set**:
```typescript
onFilterChange({
  labels: [],
  priorities: [],
  dueDateFrom: "2026-01-01",
  dueDateTo: "2026-03-31",
})
```

**All filters cleared**:
```typescript
onFilterChange({
  labels: [],
  priorities: [],
  dueDateFrom: null,
  dueDateTo: null,
})
```

---

## 5. Test Plan

### New test file: `packages/client/src/components/__tests__/filter-bar.test.tsx`

**Test setup**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "../filter-bar";
import type { Label } from "@taskboard/shared";

vi.mock("../../context/board-context");

import { useBoard } from "../../context/board-context";
```

**Mock data**:

```typescript
const mockLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label3", name: "Enhancement", color: "#10b981", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];
```

**Default setup helper**:

```typescript
function renderFilterBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  vi.mocked(useBoard).mockReturnValue({ labels: mockLabels } as any);
  const onFilterChange = vi.fn();
  const props = {
    onFilterChange,
    totalCount: 12,
    filteredCount: 12,
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return { onFilterChange, ...props };
}
```

**Test cases** (15 tests):

#### Test 1: "renders label, priority, and due date filter controls"

```typescript
it("renders label, priority, and due date filter controls", () => {
  renderFilterBar();

  expect(screen.getByLabelText("Filter by label")).toBeInTheDocument();
  expect(screen.getByLabelText("Filter by priority")).toBeInTheDocument();
  expect(screen.getByLabelText("Due date from")).toBeInTheDocument();
  expect(screen.getByLabelText("Due date to")).toBeInTheDocument();
});
```

Verifies all three filter control groups render.

#### Test 2: "does not show clear button or count when no filters are active"

```typescript
it("does not show clear button or count when no filters are active", () => {
  renderFilterBar();

  expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
  expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
});
```

#### Test 3: "opens label dropdown and shows all project labels"

```typescript
it("opens label dropdown and shows all project labels", () => {
  renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by label"));

  expect(screen.getByText("Bug")).toBeInTheDocument();
  expect(screen.getByText("Feature")).toBeInTheDocument();
  expect(screen.getByText("Enhancement")).toBeInTheDocument();
});
```

#### Test 4: "toggling a label checkbox calls onFilterChange with label added"

```typescript
it("toggling a label checkbox calls onFilterChange with label added", () => {
  const { onFilterChange } = renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by label"));
  const checkboxes = screen.getAllByRole("checkbox");
  fireEvent.click(checkboxes[0]); // Toggle Bug

  expect(onFilterChange).toHaveBeenCalledWith({
    labels: ["label1"],
    priorities: [],
    dueDateFrom: null,
    dueDateTo: null,
  });
});
```

#### Test 5: "toggling a label checkbox off calls onFilterChange with label removed"

```typescript
it("toggling a label checkbox off calls onFilterChange with label removed", () => {
  const { onFilterChange } = renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by label"));
  const checkboxes = screen.getAllByRole("checkbox");
  fireEvent.click(checkboxes[0]); // Toggle Bug on
  fireEvent.click(checkboxes[0]); // Toggle Bug off

  expect(onFilterChange).toHaveBeenLastCalledWith({
    labels: [],
    priorities: [],
    dueDateFrom: null,
    dueDateTo: null,
  });
});
```

#### Test 6: "shows badge count on label button when labels are selected"

```typescript
it("shows badge count on label button when labels are selected", () => {
  renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by label"));
  const checkboxes = screen.getAllByRole("checkbox");
  fireEvent.click(checkboxes[0]); // Toggle Bug

  const badge = screen.getByLabelText("Filter by label").querySelector("span");
  expect(screen.getByLabelText("Filter by label")).toHaveTextContent("Labels1");
});
```

#### Test 7: "opens priority dropdown and shows all priority options"

```typescript
it("opens priority dropdown and shows all priority options", () => {
  renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by priority"));

  expect(screen.getByText("Low")).toBeInTheDocument();
  expect(screen.getByText("Medium")).toBeInTheDocument();
  expect(screen.getByText("High")).toBeInTheDocument();
  expect(screen.getByText("Urgent")).toBeInTheDocument();
});
```

#### Test 8: "toggling a priority checkbox calls onFilterChange with priority added"

```typescript
it("toggling a priority checkbox calls onFilterChange with priority added", () => {
  const { onFilterChange } = renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by priority"));
  // Find the checkboxes inside the priority dropdown
  const checkboxes = screen.getAllByRole("checkbox");
  fireEvent.click(checkboxes[0]); // Toggle Low

  expect(onFilterChange).toHaveBeenCalledWith({
    labels: [],
    priorities: ["low"],
    dueDateFrom: null,
    dueDateTo: null,
  });
});
```

#### Test 9: "setting due date from calls onFilterChange"

```typescript
it("setting due date from calls onFilterChange", () => {
  const { onFilterChange } = renderFilterBar();

  fireEvent.change(screen.getByLabelText("Due date from"), {
    target: { value: "2026-01-01" },
  });

  expect(onFilterChange).toHaveBeenCalledWith({
    labels: [],
    priorities: [],
    dueDateFrom: "2026-01-01",
    dueDateTo: null,
  });
});
```

#### Test 10: "setting due date to calls onFilterChange"

```typescript
it("setting due date to calls onFilterChange", () => {
  const { onFilterChange } = renderFilterBar();

  fireEvent.change(screen.getByLabelText("Due date to"), {
    target: { value: "2026-03-31" },
  });

  expect(onFilterChange).toHaveBeenCalledWith({
    labels: [],
    priorities: [],
    dueDateFrom: null,
    dueDateTo: "2026-03-31",
  });
});
```

#### Test 11: "shows task count summary when filters are active"

```typescript
it("shows task count summary when filters are active", () => {
  renderFilterBar({ totalCount: 12, filteredCount: 5 });

  // Activate a filter to make the summary visible
  fireEvent.change(screen.getByLabelText("Due date from"), {
    target: { value: "2026-01-01" },
  });

  expect(screen.getByText("Showing 5 of 12 tasks")).toBeInTheDocument();
});
```

#### Test 12: "clear filters resets all filters and calls onFilterChange"

```typescript
it("clear filters resets all filters and calls onFilterChange", () => {
  const { onFilterChange } = renderFilterBar();

  // Set a due date filter to make clear button visible
  fireEvent.change(screen.getByLabelText("Due date from"), {
    target: { value: "2026-01-01" },
  });

  fireEvent.click(screen.getByText("Clear filters"));

  expect(onFilterChange).toHaveBeenLastCalledWith({
    labels: [],
    priorities: [],
    dueDateFrom: null,
    dueDateTo: null,
  });

  // Date inputs should be cleared
  expect(screen.getByLabelText("Due date from")).toHaveValue("");
  expect(screen.getByLabelText("Due date to")).toHaveValue("");
});
```

#### Test 13: "closes label dropdown when clicking outside"

```typescript
it("closes label dropdown when clicking outside", () => {
  renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by label"));
  expect(screen.getByText("Bug")).toBeInTheDocument();

  fireEvent.mouseDown(document.body);
  expect(screen.queryByText("Bug")).not.toBeInTheDocument();
});
```

#### Test 14: "closes priority dropdown when clicking outside"

```typescript
it("closes priority dropdown when clicking outside", () => {
  renderFilterBar();

  fireEvent.click(screen.getByLabelText("Filter by priority"));
  expect(screen.getByText("Low")).toBeInTheDocument();

  fireEvent.mouseDown(document.body);
  expect(screen.queryByText("Low")).not.toBeInTheDocument();
});
```

#### Test 15: "handles empty project labels list in label filter"

```typescript
it("handles empty project labels list in label filter", () => {
  vi.mocked(useBoard).mockReturnValue({ labels: [] } as any);
  const onFilterChange = vi.fn();
  render(<FilterBar onFilterChange={onFilterChange} totalCount={5} filteredCount={5} />);

  fireEvent.click(screen.getByLabelText("Filter by label"));
  expect(screen.getByText("No labels available")).toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
```

### Mocking approach

- `useBoard` is mocked via `vi.mock("../../context/board-context")` with `vi.mocked(useBoard).mockReturnValue(...)` — same pattern as all other component test files.
- Only `labels` is needed from the mock return value since `FilterBar` only destructures `labels` from `useBoard()`.

---

## 6. Implementation Order

1. **Step 1**: Create `packages/client/src/components/filter-bar.tsx` with the full component implementation including the exported `FilterState` type
2. **Step 2**: Create `packages/client/src/components/__tests__/filter-bar.test.tsx` with all 15 test cases
3. **Step 3**: Verify TypeScript compilation
4. **Step 4**: Run tests

---

## 7. Verification Commands

```bash
# 1. Build the shared package (dependency for client)
npm run build --workspace=@taskboard/shared

# 2. Verify client package compiles with the new file
cd packages/client && npx tsc --noEmit

# 3. Run the filter-bar test suite
cd packages/client && npx vitest run src/components/__tests__/filter-bar.test.tsx

# 4. Run the full client test suite to check for regressions
cd packages/client && npx vitest run

# 5. Verify the exports are correct
grep -n "export" packages/client/src/components/filter-bar.tsx
# Expected: FilterState interface and FilterBar function exported

# 6. Verify the FilterState type is exported (needed by Task 9)
grep -n "FilterState" packages/client/src/components/filter-bar.tsx
```