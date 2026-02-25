Now I have all the context I need. Let me produce the implementation plan.

# Task 3 Plan — Extend Board Context with `updateTask` and `removeTask`

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/context/board-context.tsx` | **Modify** | Add `updateTask` and `removeTask` methods to `BoardContextValue` interface and `BoardProvider` implementation |
| 2 | `packages/client/src/context/__tests__/board-context.test.tsx` | **Modify** | Add unit tests for `updateTask` and `removeTask` methods |

---

## 2. Dependencies

- **Sibling tasks**: Task 1 (install `react-markdown`) and Task 2 (`fetchTask` API function) — both completed; no code overlap with this task.
- **Existing infrastructure**:
  - `packages/client/src/context/board-context.tsx` — provides `BoardProvider` with `tasks` state, `setTasks`, and existing methods (`createTask`, `moveTask`) to follow as patterns
  - `packages/client/src/api/tasks.ts` — provides `updateTask(taskId, input)` and `deleteTask(taskId)` API functions (already exist from Phase 2)
  - `@taskboard/shared` — provides `Task` type
  - `packages/client/src/api/tasks.ts` — provides `UpdateTaskInput` interface

---

## 3. Implementation Details

### 3.1 Modify `packages/client/src/context/board-context.tsx`

#### 3.1.1 Add imports

Add `updateTask` and `deleteTask` to the existing import from `"../api/tasks"`:

```typescript
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from "../api/tasks";
```

Also import `UpdateTaskInput` from `"../api/tasks"`:

```typescript
import type { UpdateTaskInput } from "../api/tasks";
```

#### 3.1.2 Extend `BoardContextValue` interface

Add two new methods to the existing interface (lines 22–35):

```typescript
interface BoardContextValue {
  board: Board | null;
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  loadBoard: (projectId: string) => Promise<void>;
  addColumn: (name: string) => Promise<Column>;
  renameColumn: (columnId: string, name: string) => Promise<Column>;
  removeColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
  createTask: (columnName: string, title: string) => Promise<Task>;
  moveTask: (taskId: string, status: string, position: number) => Promise<void>;
  updateTask: (taskId: string, updates: UpdateTaskInput) => Promise<Task>;
  removeTask: (taskId: string) => Promise<void>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
}
```

#### 3.1.3 Implement `updateTask` method

Add inside `BoardProvider`, after `moveTask` and before the `return` statement. Follow the same pattern as `createTask` (call API, then update state on success, let errors propagate):

```typescript
const updateTask = useCallback(
  async (taskId: string, updates: UpdateTaskInput): Promise<Task> => {
    const response = await apiUpdateTask(taskId, updates);
    const updatedTask = response.data;
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? updatedTask : t)),
    );
    return updatedTask;
  },
  [],
);
```

**Key design decisions**:
- **No optimistic update**: Unlike `moveTask` and `reorderColumns`, `updateTask` does not use optimistic updates. The phase spec (Design Decision #3) says edits save on blur/change, and a brief saving/saved indicator provides feedback. The simpler approach is to wait for the API response and then patch state — this avoids the complexity of rollback for inline field edits where the user already sees their input in the form field.
- **Replace the entire task object**: The API returns the complete updated task in `response.data`. Replacing the entire task object (rather than merging fields) ensures the `updatedAt` timestamp and any server-computed values are reflected.
- **No `board` dependency**: Unlike `createTask` (which needs `board._id` for the API path), `updateTask` only needs `taskId`, so the dependency array is empty `[]`.
- **Errors propagate to caller**: The `TaskDetailPanel` component (Task 4) will handle errors from `updateTask` by displaying them in the panel. The context method does not catch or set `error` state.

#### 3.1.4 Implement `removeTask` method

Add after `updateTask`:

```typescript
const removeTask = useCallback(
  async (taskId: string): Promise<void> => {
    await apiDeleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  },
  [],
);
```

**Key design decisions**:
- **No optimistic update**: Delete operations should wait for server confirmation before removing from state — avoids a jarring "task reappears" scenario on failure.
- **Errors propagate to caller**: Task 7's delete button will catch errors and display them in the panel.
- **Empty dependency array**: `removeTask` only uses `apiDeleteTask` (stable module import) and `setTasks` (stable React setter).

#### 3.1.5 Add to Provider value

Update the `<BoardContext.Provider value={...}>` to include the new methods:

```typescript
<BoardContext.Provider
  value={{
    board,
    tasks,
    isLoading,
    error,
    loadBoard,
    addColumn,
    renameColumn,
    removeColumn,
    reorderColumns,
    createTask,
    moveTask,
    updateTask,
    removeTask,
    setTasks,
  }}
>
```

### 3.2 Modify `packages/client/src/context/__tests__/board-context.test.tsx`

#### 3.2.1 Add imports for the new API functions

Extend the existing `vi.mock("../../api/tasks")` block and add mock variables:

```typescript
vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
  moveTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));
```

Add imports at the top:

```typescript
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from "../../api/tasks";
```

Add mock type aliases:

```typescript
const mockApiUpdateTask = apiUpdateTask as ReturnType<typeof vi.fn>;
const mockApiDeleteTask = apiDeleteTask as ReturnType<typeof vi.fn>;
```

#### 3.2.2 Add `updateTask` tests

Add the following tests after the existing `createTask` tests (approximately after line 428):

**Test 1: `updateTask` calls API and patches task in state**

```typescript
it("updateTask calls API and patches task in state", async () => {
  mockFetchBoard.mockResolvedValue({ data: mockBoard });
  mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
  const updatedTask = {
    ...mockTasks[0],
    title: "Updated Title",
    updatedAt: "2025-01-02T00:00:00.000Z",
  };
  mockApiUpdateTask.mockResolvedValue({ data: updatedTask });

  renderWithProvider();

  await act(async () => {
    await testHookValues.loadBoard("proj1");
  });

  let result;
  await act(async () => {
    result = await testHookValues.updateTask("task1", { title: "Updated Title" });
  });

  expect(mockApiUpdateTask).toHaveBeenCalledWith("task1", { title: "Updated Title" });
  expect(result).toEqual(updatedTask);
  // Verify the task in state was updated
  const statuses = screen.getByTestId("task-statuses").textContent;
  expect(statuses).toContain("task1:To Do:0");
  expect(screen.getByTestId("task-count")).toHaveTextContent("1");
});
```

**Test 2: `updateTask` does not modify state on API failure**

```typescript
it("updateTask does not modify state on API failure", async () => {
  mockFetchBoard.mockResolvedValue({ data: mockBoard });
  mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
  mockApiUpdateTask.mockRejectedValue(new Error("Update failed"));

  renderWithProvider();

  await act(async () => {
    await testHookValues.loadBoard("proj1");
  });

  await expect(
    act(async () => {
      await testHookValues.updateTask("task1", { title: "New" });
    }),
  ).rejects.toThrow("Update failed");

  // State unchanged
  expect(screen.getByTestId("task-count")).toHaveTextContent("1");
});
```

#### 3.2.3 Add `removeTask` tests

**Test 3: `removeTask` calls API and removes task from state**

```typescript
it("removeTask calls API and removes task from state", async () => {
  mockFetchBoard.mockResolvedValue({ data: mockBoard });
  mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
  mockApiDeleteTask.mockResolvedValue({ data: { message: "Task deleted" } });

  renderWithProvider();

  await act(async () => {
    await testHookValues.loadBoard("proj1");
  });

  expect(screen.getByTestId("task-count")).toHaveTextContent("1");

  await act(async () => {
    await testHookValues.removeTask("task1");
  });

  expect(mockApiDeleteTask).toHaveBeenCalledWith("task1");
  expect(screen.getByTestId("task-count")).toHaveTextContent("0");
});
```

**Test 4: `removeTask` does not modify state on API failure**

```typescript
it("removeTask does not modify state on API failure", async () => {
  mockFetchBoard.mockResolvedValue({ data: mockBoard });
  mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
  mockApiDeleteTask.mockRejectedValue(new Error("Delete failed"));

  renderWithProvider();

  await act(async () => {
    await testHookValues.loadBoard("proj1");
  });

  await expect(
    act(async () => {
      await testHookValues.removeTask("task1");
    }),
  ).rejects.toThrow("Delete failed");

  // State unchanged
  expect(screen.getByTestId("task-count")).toHaveTextContent("1");
});
```

---

## 4. Contracts

### `updateTask`

| Attribute | Details |
|-----------|---------|
| **Signature** | `updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task>` |
| **Input — `taskId`** | MongoDB ObjectId string identifying the task |
| **Input — `updates`** | `{ title?: string; description?: string; priority?: Priority; dueDate?: string \| null; labels?: string[] }` — partial object with only the fields to update |
| **Output** | `Promise<Task>` — resolves to the full updated `Task` object returned by the server |
| **Side effect** | Replaces the matching task in `BoardContext.tasks` state array |
| **Error behavior** | Error propagates to caller (not caught); state is **not** modified |

**Usage example** (by Task 4–7 components):
```typescript
const { updateTask } = useBoard();
const updated = await updateTask(taskId, { title: "New Title" });
```

### `removeTask`

| Attribute | Details |
|-----------|---------|
| **Signature** | `removeTask(taskId: string): Promise<void>` |
| **Input — `taskId`** | MongoDB ObjectId string identifying the task |
| **Output** | `Promise<void>` |
| **Side effect** | Removes the task with matching `_id` from `BoardContext.tasks` state array |
| **Error behavior** | Error propagates to caller (not caught); state is **not** modified |

**Usage example** (by Task 7 delete button):
```typescript
const { removeTask } = useBoard();
await removeTask(taskId);
onClose(); // close the detail panel
```

---

## 5. Test Plan

All tests are added to the existing file `packages/client/src/context/__tests__/board-context.test.tsx`.

### Test setup (modifications to existing fixture)

- Extend the `vi.mock("../../api/tasks")` factory to include `updateTask` and `deleteTask`
- Add `mockApiUpdateTask` and `mockApiDeleteTask` typed aliases
- No new test helpers or components needed — the existing `TestConsumer` and `renderWithProvider` are sufficient

### Per-test specification

| # | Test Name | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | `updateTask calls API and patches task in state` | Load board with `mockTasks`. Mock `apiUpdateTask` to resolve with an updated task (changed title, new `updatedAt`). | Call `testHookValues.updateTask("task1", { title: "Updated Title" })` | `mockApiUpdateTask` called with correct args. Return value equals updated task. Task count unchanged (still 1). Task's state reflects updated data. |
| 2 | `updateTask does not modify state on API failure` | Load board with `mockTasks`. Mock `apiUpdateTask` to reject with `Error("Update failed")`. | Call `testHookValues.updateTask("task1", { title: "New" })` inside `expect(...).rejects.toThrow(...)` | Error thrown with "Update failed". Task count remains 1 (state unchanged). |
| 3 | `removeTask calls API and removes task from state` | Load board with `mockTasks` (1 task). Mock `apiDeleteTask` to resolve. | Call `testHookValues.removeTask("task1")` | `mockApiDeleteTask` called with `"task1"`. Task count becomes 0. |
| 4 | `removeTask does not modify state on API failure` | Load board with `mockTasks`. Mock `apiDeleteTask` to reject with `Error("Delete failed")`. | Call `testHookValues.removeTask("task1")` inside `expect(...).rejects.toThrow(...)` | Error thrown with "Delete failed". Task count remains 1 (state unchanged). |

---

## 6. Implementation Order

1. **Step 1**: Open `packages/client/src/context/board-context.tsx`
2. **Step 2**: Add the `apiUpdateTask` and `apiDeleteTask` imports and `UpdateTaskInput` type import
3. **Step 3**: Extend the `BoardContextValue` interface with the two new method signatures
4. **Step 4**: Implement the `updateTask` callback inside `BoardProvider`
5. **Step 5**: Implement the `removeTask` callback inside `BoardProvider`
6. **Step 6**: Add `updateTask` and `removeTask` to the `<BoardContext.Provider value={...}>` object
7. **Step 7**: Open `packages/client/src/context/__tests__/board-context.test.tsx`
8. **Step 8**: Extend the `vi.mock("../../api/tasks")` block to include `updateTask` and `deleteTask`
9. **Step 9**: Add import and mock aliases for `apiUpdateTask` and `apiDeleteTask`
10. **Step 10**: Add the four new test cases
11. **Step 11**: Verify TypeScript compiles: `npm run build -w packages/client`
12. **Step 12**: Run tests: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify the new methods are exported from the context
grep "updateTask" packages/client/src/context/board-context.tsx
grep "removeTask" packages/client/src/context/board-context.tsx

# 2. Verify TypeScript compiles
npm run build -w packages/client

# 3. Run all client tests (should pass including 4 new tests)
npm run test -w packages/client
```

All three commands should succeed (grep finds matches, build and test exit with code 0).