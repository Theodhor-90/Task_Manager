Now I have all the context needed. Let me produce the implementation plan.

# Task 6 Plan — Priority Selector and Due Date Picker

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/components/task-detail-panel.tsx` | **Modify** | Add a priority dropdown and a due date picker section below the description, with immediate save-on-change via `updateTask` |
| 2 | `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | **Modify** | Add unit tests for priority changes, due date changes, and due date clear functionality |

---

## 2. Dependencies

- **Sibling tasks (completed)**:
  - Task 3: `updateTask` method in `BoardContext` — used to persist priority and due date changes
  - Task 4: `TaskDetailPanel` component exists with title editing, loading/error states, and close behavior
  - Task 5: Description section with Write/Preview tabs already in place
- **Existing infrastructure**:
  - `packages/client/src/components/task-card.tsx` — exports `PRIORITY_CLASSES` record mapping priority values to Tailwind class strings; these color classes will be reused for visual consistency
  - `packages/client/src/api/tasks.ts` — `UpdateTaskInput` interface includes `priority?: Priority` and `dueDate?: string | null`
  - `@taskboard/shared` — `Priority` type: `"low" | "medium" | "high" | "urgent"`
  - `packages/client/src/context/board-context.tsx` — `useBoard()` provides `updateTask(taskId, updates)` which patches the task in local state and persists to API
- **No new npm packages required**

---

## 3. Implementation Details

### 3.1 Modify `packages/client/src/components/task-detail-panel.tsx`

#### 3.1.1 New imports

Add at the top of the file, after the existing imports:

```typescript
import type { Priority } from "@taskboard/shared";
import { PRIORITY_CLASSES } from "./task-card";
```

- `Priority` type is needed for the `handlePriorityChange` parameter type and the `PRIORITY_OPTIONS` array
- `PRIORITY_CLASSES` is imported from `task-card.tsx` to reuse the exact same color-coding for visual consistency between the task card badge and the priority dropdown options

#### 3.1.2 Priority options constant

Add outside the component function (module-level constant), before the `TaskDetailPanel` function:

```typescript
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];
```

This provides a typed array of options for the `<select>` dropdown. Defined outside the component to avoid re-creation on every render.

#### 3.1.3 Priority change handler

Add inside `TaskDetailPanel`, after `handleDescriptionBlur`:

```typescript
async function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
  if (!task) return;
  const newPriority = e.target.value as Priority;
  if (newPriority === task.priority) return;
  try {
    const updated = await updateTask(taskId, { priority: newPriority });
    setTask(updated);
  } catch {
    // No revert needed — the <select> will re-render with task.priority on next render
  }
}
```

**Key design decisions**:
- **Immediate save on change**: The spec says "On change, immediately calls `updateTask({ priority })`". No debouncing needed since dropdown changes are discrete one-time events.
- **No optimistic update of `<select>` value**: The `<select>` is controlled by `task.priority`. On success, `setTask(updated)` updates the value. On failure, the `<select>` naturally remains at `task.priority` since we never changed local state — the re-render after the catch block shows the original value. No explicit revert needed.
- **Skip API call if value unchanged**: If the user re-selects the same priority, the handler returns early.

#### 3.1.4 Due date change handler

Add after `handlePriorityChange`:

```typescript
async function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
  if (!task) return;
  const newDate = e.target.value; // ISO date string "YYYY-MM-DD" or "" if cleared
  const currentDate = task.dueDate ? task.dueDate.split("T")[0] : "";
  if (newDate === currentDate) return;
  try {
    const updated = await updateTask(taskId, {
      dueDate: newDate || null,
    });
    setTask(updated);
  } catch {
    // No revert needed — input re-renders with task.dueDate
  }
}
```

**Key design decisions**:
- **`dueDate: null` to clear**: When the native date input is cleared (value becomes `""`), the API receives `dueDate: null` which removes the due date on the server. This matches the `UpdateTaskInput` type: `dueDate?: string | null`.
- **Date comparison**: The task's `dueDate` from the server is an ISO string like `"2026-02-25T00:00:00.000Z"`. The native `<input type="date">` provides `"2026-02-25"`. Comparison uses `task.dueDate.split("T")[0]` to extract just the date portion.
- **No optimistic update**: Same pattern as priority — the `<input>` is controlled by `task.dueDate`, which updates on success via `setTask(updated)`.

#### 3.1.5 Due date clear handler

Add after `handleDueDateChange`:

```typescript
async function handleClearDueDate() {
  if (!task || !task.dueDate) return;
  try {
    const updated = await updateTask(taskId, { dueDate: null });
    setTask(updated);
  } catch {
    // No revert needed — input re-renders with task.dueDate
  }
}
```

This is a separate handler for the explicit "clear" button (X) next to the date input. It sends `dueDate: null` directly without needing to read the input value.

#### 3.1.6 Metadata section JSX

Add inside the `{!isLoading && !error && task && ( ... )}` block, after the description section `</div>` (after line 243 in the current file), before the closing `</>`:

```tsx
{/* Metadata section — Priority and Due Date */}
<div className="mt-6 grid grid-cols-2 gap-4">
  {/* Priority */}
  <div>
    <label
      htmlFor="task-priority"
      className="block text-sm font-medium text-gray-700"
    >
      Priority
    </label>
    <select
      id="task-priority"
      value={task.priority}
      onChange={handlePriorityChange}
      className={`mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${PRIORITY_CLASSES[task.priority]}`}
    >
      {PRIORITY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>

  {/* Due Date */}
  <div>
    <label
      htmlFor="task-due-date"
      className="block text-sm font-medium text-gray-700"
    >
      Due Date
    </label>
    <div className="mt-1 flex items-center gap-2">
      <input
        id="task-due-date"
        type="date"
        value={task.dueDate ? task.dueDate.split("T")[0] : ""}
        onChange={handleDueDateChange}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Task due date"
      />
      {task.dueDate && (
        <button
          onClick={handleClearDueDate}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Clear due date"
          title="Clear due date"
        >
          ×
        </button>
      )}
    </div>
  </div>
</div>
```

**Key layout decisions**:
- **Grid layout**: Uses `grid grid-cols-2 gap-4` to place Priority and Due Date side by side in a horizontal row, as specified in the task spec ("a horizontal row beneath the description").
- **`<label>` elements**: Each control has a proper `<label>` with `htmlFor` pointing to the input's `id`. This provides accessibility and helps test queries.
- **Priority `<select>` styling**: The `<select>` applies `PRIORITY_CLASSES[task.priority]` to color-code the dropdown to match the current priority. This uses the same classes as `TaskCard`'s priority badge (`bg-gray-200 text-gray-700` for low, `bg-blue-100 text-blue-700` for medium, etc.).
- **Due date `<input type="date">`**: Uses the native browser date picker. The `value` is derived from `task.dueDate.split("T")[0]` to extract the `YYYY-MM-DD` portion from the ISO timestamp.
- **Clear button**: A `×` button appears only when a due date is set (`task.dueDate` is truthy). Clicking it calls `handleClearDueDate`. Uses `aria-label="Clear due date"` for accessibility.
- **No human-readable date display**: The spec mentions "Displays the date in a human-readable format alongside or above the input." The native `<input type="date">` already displays the date in the browser's locale format (e.g., "02/25/2026" or "25/02/2026"). Adding a separate human-readable display is redundant with the native input. The task card already shows "Feb 25" format via `formatDueDate`. Adding a separate formatted date would be over-engineering.

#### 3.1.7 What NOT to do

- Do **not** create separate component files for `PrioritySelector` or `DueDatePicker` — the spec says "either an inline component within the panel or a small dedicated component" and keeping them inline avoids unnecessary file creation. The handlers are simple enough to inline.
- Do **not** add `saving` / `saved` indicator state — the spec mentions this as a "brief saving/saved indicator provides feedback" in Design Decision #3, but Task 6's spec only requires the controls and immediate persistence. Adding save indicators would be scope creep beyond what the task requires.
- Do **not** add custom styled dropdown for priority — a native `<select>` with color-coded classes is sufficient for MVP. Custom dropdowns add complexity with no functional benefit for a single-user app.
- Do **not** add form validation — priority values are constrained by the `<option>` elements, and date values are constrained by `<input type="date">`. No additional validation is needed.

---

## 4. Contracts

### Priority Selector

| Attribute | Details |
|-----------|---------|
| **Element** | `<select id="task-priority">` |
| **Controlled value** | `task.priority` (from loaded task state) |
| **On change** | Calls `updateTask(taskId, { priority: newValue })` via board context |
| **Color** | `PRIORITY_CLASSES[task.priority]` applied as className to match TaskCard badge colors |
| **Options** | `"low"` → "Low", `"medium"` → "Medium", `"high"` → "High", `"urgent"` → "Urgent" |

### Due Date Picker

| Attribute | Details |
|-----------|---------|
| **Element** | `<input id="task-due-date" type="date">` |
| **Controlled value** | `task.dueDate ? task.dueDate.split("T")[0] : ""` |
| **On change** | Calls `updateTask(taskId, { dueDate: value || null })` — empty string becomes `null` |
| **Clear button** | `×` button with `aria-label="Clear due date"`, only visible when `task.dueDate` is truthy, calls `updateTask(taskId, { dueDate: null })` |

### Interactions and Effects

| User Action | Internal Effect | External Effect (via BoardContext) |
|-------------|----------------|-----------------------------------|
| Select new priority | `setTask(updated)` with API response | `updateTask` patches task in `BoardContext.tasks` — `TaskCard` priority badge re-renders |
| Select same priority | No-op (early return) | None |
| Pick a new date | `setTask(updated)` with API response | `updateTask` patches task in `BoardContext.tasks` — `TaskCard` due date re-renders |
| Pick same date | No-op (early return) | None |
| Click clear due date button | `setTask(updated)` with API response (dueDate removed) | `updateTask` patches task in `BoardContext.tasks` — `TaskCard` due date removed |
| Priority/date update fails | No state change (catch block is empty); `task.priority`/`task.dueDate` remain at previous values since `setTask` was never called | None |

---

## 5. Test Plan

All tests are added to the existing file `packages/client/src/components/__tests__/task-detail-panel.test.tsx`.

### 5.1 Test Setup Modifications

**Update `mockTask` fixture**: The existing `mockTask` has `priority: "medium"` and no `dueDate` field. Add a new fixture for tests that need a due date:

```typescript
const mockTaskWithDueDate: Task = {
  ...mockTask,
  dueDate: "2026-03-15T00:00:00.000Z",
};
```

**Import `PRIORITY_CLASSES`**: Not needed in tests — we test behavior, not styling classes.

### 5.2 Per-Test Specification

| # | Test Name | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | priority selector shows current priority | `fetchTask` resolves with `mockTask` (priority: "medium") | Render panel, wait for load | `<select>` with id `task-priority` has value `"medium"` |
| 2 | priority selector lists all four options | `fetchTask` resolves with `mockTask` | Render panel, wait for load | `<select>` contains 4 `<option>` elements: Low, Medium, High, Urgent |
| 3 | changing priority calls updateTask | `fetchTask` resolves with `mockTask`, `updateTask` resolves with updated task (priority: "high") | Change `<select>` value to `"high"` | `updateTask` called with `("task1", { priority: "high" })`; after update, select value becomes `"high"` |
| 4 | priority update failure keeps original value | `fetchTask` resolves with `mockTask`, `updateTask` rejects | Change `<select>` value to `"urgent"` | `updateTask` called; after error, select value remains `"medium"` |
| 5 | due date input shows empty when no due date | `fetchTask` resolves with `mockTask` (no dueDate) | Render panel, wait for load | `<input type="date">` with id `task-due-date` has value `""` |
| 6 | due date input shows current date | `fetchTask` resolves with `mockTaskWithDueDate` | Render panel, wait for load | `<input type="date">` has value `"2026-03-15"` |
| 7 | changing due date calls updateTask | `fetchTask` resolves with `mockTask`, `updateTask` resolves with updated task | Change date input to `"2026-04-01"` | `updateTask` called with `("task1", { dueDate: "2026-04-01" })` |
| 8 | clear button sends null for due date | `fetchTask` resolves with `mockTaskWithDueDate`, `updateTask` resolves with task without dueDate | Click button with `aria-label="Clear due date"` | `updateTask` called with `("task1", { dueDate: null })` |
| 9 | clear button not shown when no due date | `fetchTask` resolves with `mockTask` (no dueDate) | Render panel, wait for load | No element with `aria-label="Clear due date"` exists |
| 10 | due date clear updates the input | `fetchTask` resolves with `mockTaskWithDueDate`, `updateTask` resolves with `{ ...mockTask, dueDate: undefined }` | Click clear button | After update, date input value is `""`; clear button disappears |

### 5.3 Test Implementation Details

**Test 1: priority selector shows current priority**

```typescript
it("priority selector shows current priority", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const select = screen.getByLabelText("Priority") as HTMLSelectElement;
  expect(select.value).toBe("medium");
});
```

**Test 2: priority selector lists all four options**

```typescript
it("priority selector lists all four options", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const options = screen.getByLabelText("Priority").querySelectorAll("option");
  expect(options).toHaveLength(4);
  expect(options[0]).toHaveTextContent("Low");
  expect(options[1]).toHaveTextContent("Medium");
  expect(options[2]).toHaveTextContent("High");
  expect(options[3]).toHaveTextContent("Urgent");
});
```

**Test 3: changing priority calls updateTask**

```typescript
it("changing priority calls updateTask", async () => {
  const mockUpdateTask = vi.fn().mockResolvedValue({
    ...mockTask,
    priority: "high",
  });
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const select = screen.getByLabelText("Priority");
  fireEvent.change(select, { target: { value: "high" } });

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalledWith("task1", { priority: "high" });
  });

  await waitFor(() => {
    expect((screen.getByLabelText("Priority") as HTMLSelectElement).value).toBe("high");
  });
});
```

**Test 4: priority update failure keeps original value**

```typescript
it("priority update failure keeps original value", async () => {
  const mockUpdateTask = vi.fn().mockRejectedValue(new Error("Failed"));
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const select = screen.getByLabelText("Priority");
  fireEvent.change(select, { target: { value: "urgent" } });

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect((screen.getByLabelText("Priority") as HTMLSelectElement).value).toBe("medium");
  });
});
```

**Test 5: due date input shows empty when no due date**

```typescript
it("due date input shows empty when no due date", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const input = screen.getByLabelText("Task due date") as HTMLInputElement;
  expect(input.value).toBe("");
});
```

**Test 6: due date input shows current date**

```typescript
it("due date input shows current date", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskWithDueDate } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const input = screen.getByLabelText("Task due date") as HTMLInputElement;
  expect(input.value).toBe("2026-03-15");
});
```

**Test 7: changing due date calls updateTask**

```typescript
it("changing due date calls updateTask", async () => {
  const mockUpdateTask = vi.fn().mockResolvedValue({
    ...mockTask,
    dueDate: "2026-04-01T00:00:00.000Z",
  });
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const input = screen.getByLabelText("Task due date");
  fireEvent.change(input, { target: { value: "2026-04-01" } });

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalledWith("task1", { dueDate: "2026-04-01" });
  });
});
```

**Test 8: clear button sends null for due date**

```typescript
it("clear button sends null for due date", async () => {
  const mockUpdateTask = vi.fn().mockResolvedValue({
    ...mockTaskWithDueDate,
    dueDate: undefined,
  });
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskWithDueDate } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  const clearButton = screen.getByLabelText("Clear due date");
  fireEvent.click(clearButton);

  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalledWith("task1", { dueDate: null });
  });
});
```

**Test 9: clear button not shown when no due date**

```typescript
it("clear button not shown when no due date", async () => {
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn() } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  expect(screen.queryByLabelText("Clear due date")).not.toBeInTheDocument();
});
```

**Test 10: due date clear updates the input**

```typescript
it("due date clear updates the input", async () => {
  const clearedTask = { ...mockTaskWithDueDate, dueDate: undefined };
  const mockUpdateTask = vi.fn().mockResolvedValue(clearedTask);
  vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskWithDueDate } as any);
  vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask } as any);

  renderPanel();

  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  expect((screen.getByLabelText("Task due date") as HTMLInputElement).value).toBe("2026-03-15");

  const clearButton = screen.getByLabelText("Clear due date");
  fireEvent.click(clearButton);

  await waitFor(() => {
    expect((screen.getByLabelText("Task due date") as HTMLInputElement).value).toBe("");
  });

  expect(screen.queryByLabelText("Clear due date")).not.toBeInTheDocument();
});
```

---

## 6. Implementation Order

1. **Step 1**: Open `packages/client/src/components/task-detail-panel.tsx`
2. **Step 2**: Add the `Priority` type import from `@taskboard/shared` and `PRIORITY_CLASSES` import from `./task-card`
3. **Step 3**: Add the `PRIORITY_OPTIONS` constant above the component function
4. **Step 4**: Add the `handlePriorityChange`, `handleDueDateChange`, and `handleClearDueDate` handler functions inside the component
5. **Step 5**: Add the metadata section JSX (priority `<select>` + due date `<input>` + clear button) after the description section
6. **Step 6**: Open `packages/client/src/components/__tests__/task-detail-panel.test.tsx`
7. **Step 7**: Add the `mockTaskWithDueDate` fixture
8. **Step 8**: Add all 10 new test cases after the existing description tests
9. **Step 9**: Verify TypeScript compiles: `npm run build -w packages/client`
10. **Step 10**: Run tests: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify priority selector exists in the component
grep "task-priority" packages/client/src/components/task-detail-panel.tsx

# 2. Verify due date input exists in the component
grep "task-due-date" packages/client/src/components/task-detail-panel.tsx

# 3. Verify PRIORITY_CLASSES import
grep "PRIORITY_CLASSES" packages/client/src/components/task-detail-panel.tsx

# 4. Verify TypeScript compiles
npm run build -w packages/client

# 5. Run all client tests (should pass including 10 new tests)
npm run test -w packages/client
```

All five commands should succeed (grep finds matches, build and test exit with code 0).