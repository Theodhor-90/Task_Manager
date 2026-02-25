Now I have complete context. Let me write the implementation plan.

# Task 3 Implementation Plan — TaskCard Component

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/components/task-card.tsx` | **Create** | Compact task card component displaying title, priority badge, label dots, and due date |
| `packages/client/src/components/__tests__/task-card.test.tsx` | **Create** | Unit tests for TaskCard covering all rendering variants and interactions |

---

## 2. Dependencies

- **Shared types** — `Task` and `Priority` exported from `@taskboard/shared` (verified in `packages/shared/src/types/index.ts`)
- **No phase-internal dependencies** — this task can be implemented in parallel with t01 and t02; it only needs the shared `Task` type
- **No npm packages to install** — uses only Tailwind CSS classes already available in the project

---

## 3. Implementation Details

### File: `packages/client/src/components/task-card.tsx`

**Purpose**: A compact, presentation-focused card component that displays key task information at a glance. Used inside columns to represent individual tasks.

**Exports**: One named function component `TaskCard` and one constant `PRIORITY_CLASSES` (exported for test assertions).

**Pattern to follow**: Matches the structure of `packages/client/src/components/project-card.tsx`:
- TypeScript interface for props
- Named function export
- Tailwind utility classes for styling
- Conditional rendering for optional fields
- `aria-label` on interactive elements

#### 3.1 Props Interface

```typescript
interface TaskCardProps {
  task: Task;
  onClick?: (taskId: string) => void;
}
```

- `task` — required; the full `Task` object from `@taskboard/shared`
- `onClick` — optional callback; fires with the task's `_id` when the card is clicked. Used by Phase 3 for opening the detail panel; safe to be `undefined` now.

#### 3.2 Priority Color Map

Defined as a module-level constant (exported for test verification):

```typescript
export const PRIORITY_CLASSES: Record<Priority, string> = {
  low: "bg-gray-200 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};
```

This is a simple lookup — no separate constants file needed, as specified in the phase spec (Design Decision 8).

#### 3.3 Due Date Formatting

A helper function within the component file that formats an ISO date string as "MMM D" (e.g., "Feb 25"):

```typescript
function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

Uses `toLocaleDateString` with `en-US` locale to ensure consistent "MMM D" output regardless of system locale.

#### 3.4 Overdue Detection

A helper function to determine if a due date is in the past:

```typescript
function isOverdue(isoDate: string): boolean {
  const due = new Date(isoDate);
  due.setHours(23, 59, 59, 999);
  const now = new Date();
  return due < now;
}
```

Sets the due date to end of day before comparing, so a task due "today" is not considered overdue until the day has passed.

#### 3.5 Component Structure

```typescript
export function TaskCard({ task, onClick }: TaskCardProps) {
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
      {/* Title */}
      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </p>

      {/* Bottom row: priority badge + label dots + due date */}
      <div className="mt-2 flex items-center gap-2">
        {/* Priority badge */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[task.priority]}`}
        >
          {task.priority}
        </span>

        {/* Label dots */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Due date */}
        {task.dueDate && (
          <span
            className={`text-xs ${
              isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-gray-500"
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

**Rendering details**:

1. **Root element**: A `<div>` with `cursor-pointer`, `rounded-lg`, `bg-white`, `p-3`, `shadow-sm`, `hover:shadow-md`, `transition-shadow`. Matches the card pattern from `project-card.tsx` but uses `<div>` instead of `<Link>` since task cards don't navigate. The `mb-2` provides spacing between cards in the column list (matching the current placeholder task divs in `board-view.tsx`).

2. **Click handling**: When `onClick` is provided, the card is clickable. `role="button"` and `tabIndex={0}` are added for accessibility, along with `onKeyDown` to support Enter/Space activation. When `onClick` is `undefined`, these attributes are omitted (the card is purely presentational).

3. **Title**: `<p>` with `text-sm font-medium text-gray-900 line-clamp-2`. Uses `line-clamp-2` for truncation (same truncation approach as project description in `project-card.tsx`).

4. **Priority badge**: A `<span>` styled as a small pill with rounded corners, using the color map. Always rendered since `priority` is a required field on `Task`.

5. **Label dots**: Conditionally rendered if `task.labels.length > 0`. Each label is a small circle (`h-2 w-2 rounded-full`) with `bg-gray-400` as a placeholder color. Full label colors will come in Phase 4 when label data (name, color) is fetched and available.

6. **Due date**: Conditionally rendered if `task.dueDate` is present. Formatted as "MMM D" (e.g., "Feb 25"). If overdue, text turns red (`text-red-600 font-medium`); otherwise, muted gray (`text-gray-500`).

---

## 4. Contracts

### Input

```typescript
interface TaskCardProps {
  task: Task;          // Full Task object from @taskboard/shared
  onClick?: (taskId: string) => void;  // Optional click handler
}
```

### Rendered Output

The component renders a card `<div>` containing:
- Task title (always)
- Priority badge with color-coded pill (always)
- Label placeholder dots (only when `task.labels` is non-empty)
- Formatted due date (only when `task.dueDate` is set)

### Visual Priority Color Mapping

| Priority | Background | Text |
|----------|-----------|------|
| `low` | `bg-gray-200` | `text-gray-700` |
| `medium` | `bg-blue-100` | `text-blue-700` |
| `high` | `bg-orange-100` | `text-orange-700` |
| `urgent` | `bg-red-100` | `text-red-700` |

---

## 5. Test Plan

### File: `packages/client/src/components/__tests__/task-card.test.tsx`

**Setup**: No mocks needed — `TaskCard` is a pure presentational component with no external dependencies (no context, no API, no router, no dnd-kit).

#### Mock Data

```typescript
import type { Task } from "@taskboard/shared";

const baseTask: Task = {
  _id: "task1",
  title: "Implement login page",
  status: "To Do",
  priority: "medium",
  position: 0,
  labels: [],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};
```

#### Render Helper

```typescript
function renderCard(props?: Partial<TaskCardProps>) {
  const defaultProps = {
    task: baseTask,
  };
  const finalProps = { ...defaultProps, ...props };
  return render(<TaskCard {...finalProps} />);
}
```

Follows the same helper pattern as `column.test.tsx` and `project-card.test.tsx`.

#### Test Specifications

**Test 1: `renders task title`**
- Setup: render with default task
- Assert: `screen.getByText("Implement login page")` is in the document

**Test 2: `renders priority badge with correct text`**
- Setup: render with `priority: "high"`
- Assert: `screen.getByText("high")` is in the document

**Test 3: `renders priority badge with correct color classes for each priority`**
- Setup: render 4 times with each priority level
- Assert: for each priority, the badge element contains the expected Tailwind classes from `PRIORITY_CLASSES`
- Implementation: use `PRIORITY_CLASSES` import to verify the element's class list

**Test 4: `renders due date in "MMM D" format`**
- Setup: render with `dueDate: "2025-06-15T00:00:00.000Z"`
- Assert: `screen.getByText("Jun 15")` is in the document

**Test 5: `renders overdue date in red`**
- Setup: render with `dueDate` set to a past date (e.g., `"2020-01-01T00:00:00.000Z"`)
- Assert: the due date element has `text-red-600` class

**Test 6: `renders non-overdue date without red styling`**
- Setup: render with `dueDate` set to a far-future date (e.g., `"2099-12-31T00:00:00.000Z"`)
- Assert: the due date element has `text-gray-500` class and does not have `text-red-600`

**Test 7: `does not render due date when absent`**
- Setup: render with no `dueDate` (default task)
- Assert: no date text is present in the document (query for common month abbreviations returns null)

**Test 8: `renders label dots when labels are present`**
- Setup: render with `labels: ["label1", "label2", "label3"]`
- Assert: 3 elements with `aria-label="Label"` are in the document

**Test 9: `does not render label dots when labels array is empty`**
- Setup: render with `labels: []` (default)
- Assert: no elements with `aria-label="Label"` exist

**Test 10: `calls onClick with task ID when card is clicked`**
- Setup: render with `onClick: vi.fn()`
- Act: click the card element
- Assert: `onClick` was called with `"task1"`

**Test 11: `does not throw when clicked without onClick handler`**
- Setup: render without `onClick`
- Act: click the card element
- Assert: no error thrown (component handles undefined `onClick` gracefully)

**Test 12: `has role="button" and tabIndex when onClick is provided`**
- Setup: render with `onClick: vi.fn()`
- Assert: the card element has `role="button"` and `tabIndex="0"`

**Test 13: `does not have role="button" when onClick is not provided`**
- Setup: render without `onClick`
- Assert: no element with `role="button"` in the document

**Test 14: `truncates long titles with line-clamp`**
- Setup: render with a very long title
- Assert: the title element has `line-clamp-2` class (CSS truncation is visual-only, so we verify the class is applied)

**Test 15: `keyboard activation with Enter key`**
- Setup: render with `onClick: vi.fn()`
- Act: fire `keyDown` event with `key: "Enter"` on the card
- Assert: `onClick` was called with `"task1"`

**Test 16: `keyboard activation with Space key`**
- Setup: render with `onClick: vi.fn()`
- Act: fire `keyDown` event with `key: " "` on the card
- Assert: `onClick` was called with `"task1"`

---

## 6. Implementation Order

### Step 1: Create `packages/client/src/components/task-card.tsx`

1. Add imports: `Task` and `Priority` from `@taskboard/shared`
2. Define and export the `PRIORITY_CLASSES` constant map
3. Define the `formatDueDate` helper function
4. Define the `isOverdue` helper function
5. Define the `TaskCardProps` interface
6. Implement and export the `TaskCard` component with:
   - Clickable card wrapper with conditional accessibility attributes
   - Title with `line-clamp-2` truncation
   - Priority badge with dynamic color classes
   - Conditional label dots
   - Conditional due date with overdue styling

### Step 2: Create `packages/client/src/components/__tests__/task-card.test.tsx`

1. Import dependencies: `render`, `screen`, `fireEvent` from `@testing-library/react`; `describe`, `it`, `expect`, `vi` from `vitest`
2. Import `TaskCard` and `PRIORITY_CLASSES` from the component
3. Import `Task` type from `@taskboard/shared`
4. Define `baseTask` mock data
5. Define `renderCard` helper function
6. Implement all 16 test cases described in the test plan

### Step 3: Verify

Run TypeScript compilation and tests to confirm everything works.

---

## 7. Verification Commands

```bash
# 1. TypeScript compilation — must succeed with no errors
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Run TaskCard tests specifically
npx vitest run packages/client/src/components/__tests__/task-card.test.tsx

# 3. Run full client test suite to verify no regressions
npm run test -w packages/client

# 4. Verify the component file exports TaskCard
grep -n "export function TaskCard\|export const PRIORITY_CLASSES" packages/client/src/components/task-card.tsx
```

---

## Complete File Content

### `packages/client/src/components/task-card.tsx`

```typescript
import type { Priority, Task } from "@taskboard/shared";

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
            {task.labels.map((labelId) => (
              <span
                key={labelId}
                className="h-2 w-2 rounded-full bg-gray-400"
                aria-label="Label"
              />
            ))}
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

### `packages/client/src/components/__tests__/task-card.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TaskCard, PRIORITY_CLASSES } from "../task-card";
import type { Task, Priority } from "@taskboard/shared";

const baseTask: Task = {
  _id: "task1",
  title: "Implement login page",
  status: "To Do",
  priority: "medium",
  position: 0,
  labels: [],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function renderCard(
  props?: Partial<{
    task: Task;
    onClick: (taskId: string) => void;
  }>,
) {
  const defaultProps = {
    task: baseTask,
  };
  const finalProps = { ...defaultProps, ...props };
  return render(<TaskCard {...finalProps} />);
}

describe("TaskCard", () => {
  it("renders task title", () => {
    renderCard();
    expect(screen.getByText("Implement login page")).toBeInTheDocument();
  });

  it("renders priority badge with correct text", () => {
    renderCard({ task: { ...baseTask, priority: "high" } });
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders priority badge with correct color classes for each priority", () => {
    const priorities: Priority[] = ["low", "medium", "high", "urgent"];
    for (const priority of priorities) {
      const { unmount } = renderCard({
        task: { ...baseTask, priority },
      });
      const badge = screen.getByText(priority);
      const expectedClasses = PRIORITY_CLASSES[priority].split(" ");
      for (const cls of expectedClasses) {
        expect(badge.className).toContain(cls);
      }
      unmount();
    }
  });

  it("renders due date in 'MMM D' format", () => {
    renderCard({
      task: { ...baseTask, dueDate: "2025-06-15T00:00:00.000Z" },
    });
    expect(screen.getByText("Jun 15")).toBeInTheDocument();
  });

  it("renders overdue date in red", () => {
    renderCard({
      task: { ...baseTask, dueDate: "2020-01-01T00:00:00.000Z" },
    });
    const dateElement = screen.getByText("Jan 1");
    expect(dateElement.className).toContain("text-red-600");
  });

  it("renders non-overdue date without red styling", () => {
    renderCard({
      task: { ...baseTask, dueDate: "2099-12-31T00:00:00.000Z" },
    });
    const dateElement = screen.getByText("Dec 31");
    expect(dateElement.className).toContain("text-gray-500");
    expect(dateElement.className).not.toContain("text-red-600");
  });

  it("does not render due date when absent", () => {
    renderCard();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const month of months) {
      expect(screen.queryByText(new RegExp(`^${month} \\d`))).not.toBeInTheDocument();
    }
  });

  it("renders label dots when labels are present", () => {
    renderCard({
      task: { ...baseTask, labels: ["label1", "label2", "label3"] },
    });
    const dots = screen.getAllByLabelText("Label");
    expect(dots).toHaveLength(3);
  });

  it("does not render label dots when labels array is empty", () => {
    renderCard();
    expect(screen.queryByLabelText("Label")).not.toBeInTheDocument();
  });

  it("calls onClick with task ID when card is clicked", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    fireEvent.click(screen.getByText("Implement login page"));
    expect(onClick).toHaveBeenCalledWith("task1");
  });

  it("does not throw when clicked without onClick handler", () => {
    renderCard();
    expect(() => {
      fireEvent.click(screen.getByText("Implement login page"));
    }).not.toThrow();
  });

  it("has role='button' and tabIndex when onClick is provided", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole("button");
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("does not have role='button' when onClick is not provided", () => {
    renderCard();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("truncates long titles with line-clamp", () => {
    renderCard({
      task: {
        ...baseTask,
        title: "This is a very long task title that should be truncated because it exceeds two lines of content",
      },
    });
    const title = screen.getByText(/This is a very long task title/);
    expect(title.className).toContain("line-clamp-2");
  });

  it("keyboard activation with Enter key", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("task1");
  });

  it("keyboard activation with Space key", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledWith("task1");
  });
});
```