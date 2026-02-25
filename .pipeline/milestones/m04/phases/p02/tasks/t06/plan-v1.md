Now I have all the context I need. Let me write the plan.

# Task 6 Implementation Plan — Integration Testing & Polish

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** | Add integration test cases for full drag-and-drop flows (same-column reorder, cross-column move, API failure rollback), AddTaskForm integration, and column drag regression tests |
| `packages/client/src/components/board-view.tsx` | **Modify** (if needed) | Visual polish: ensure drag overlay has proper styling (shadow, sizing), smooth transitions, no layout shift |
| `packages/client/src/components/task-card.tsx` | **Modify** (if needed) | Visual polish: ensure consistent spacing and alignment for task cards during and after drag |
| `packages/client/src/components/column.tsx` | **Modify** (if needed) | Visual polish: ensure column accepts dragged tasks smoothly, proper min-height for empty columns |

---

## 2. Dependencies

- **t01–t05 complete** — All prior tasks in this phase are implemented and their individual tests pass
- All implementation files exist:
  - `packages/client/src/api/tasks.ts` (t01)
  - `packages/client/src/context/board-context.tsx` (t02)
  - `packages/client/src/components/task-card.tsx` (t03)
  - `packages/client/src/components/board-view.tsx` (t04)
  - `packages/client/src/components/add-task-form.tsx` (t05)
  - `packages/client/src/components/column.tsx` (t04 modification)
- All existing test files pass individually

No npm packages to install.

---

## 3. Implementation Details

### 3.1 Current Test Coverage Gap Analysis

After reviewing all existing test files, here is what is already covered vs. what the task spec requires:

**Already covered (by t01–t05 tests)**:
- `board-context.test.tsx`: createTask (append to state, throw when board not loaded, no state change on API failure), moveTask (cross-column optimistic update, rollback on failure, same-column reorder, throw when board not loaded), setTasks (exposed and functional)
- `board-view.test.tsx`: column rendering, task grouping and sorting, TaskCard rendering, DragOverlay rendering, AddTaskForm in each column, column drag-end (reorder, same position, null over), task drag-end (cross-column move, no-move when dropped on self, type discrimination)
- `task-card.test.tsx`: title, priority badge, due date, label dots, click handler, accessibility
- `add-task-form.test.tsx`: button toggle, auto-focus, Enter submission, input clear, Escape cancel, empty submission, error display, error clear, disabled while submitting, double-submit guard, blur behavior
- `column.test.tsx`: name, task count, children, drag handle, delete, rename, confirm dialog, error display

**Gaps to fill (per verification criteria)**:

1. **Integration test: same-column task reorder → position updated, API called with correct position** — The existing `board-view.test.tsx` has "handleDragEnd does not call moveTask when task has not moved" (dropped on self) and "handleDragEnd calls moveTask for task drag to different column", but does NOT have a test for **within-column reorder** where a task is dropped on a different task in the same column. This must be added.

2. **Integration test: cross-column task move → status and position updated, API called with correct status and position** — The existing test "handleDragEnd calls moveTask for task drag to different column" covers this but uses a complex setup with `setTasks` mock. It verifies `moveTask` is called but does NOT verify the exact `status` and `position` arguments. This test should be enhanced or a new test added that verifies the exact arguments.

3. **Integration test: API failure → board state reverts to snapshot, error message displayed** — This is tested at the context level (`board-context.test.tsx`: "moveTask reverts on API failure and sets error") but NOT at the board-view integration level. Since `board-view.tsx` delegates to context's `moveTask`, this is implicitly covered, but a board-view test verifying that `setTasks` is called with the snapshot during failure recovery would strengthen coverage.

4. **Integration test: AddTaskForm creates tasks that appear in correct column** — Tested at the component level (`add-task-form.test.tsx`) and context level (`board-context.test.tsx`: "createTask calls API and appends task to state"). The board-view test has AddTaskForm mocked, so it only verifies the mock renders in each column footer. No new test needed since the form is mocked in board-view tests and the real integration is tested via context tests.

5. **Regression: column drag-and-drop still works after refactor** — Already covered by existing `board-view.test.tsx` column drag tests.

6. **Full client test suite passes** — Must verify by running `npm run test -w packages/client`.

7. **Drag overlay renders correctly** — Already tested: "renders DragOverlay" test exists. Visual correctness is verified by inspection.

### 3.2 New Integration Tests for `board-view.test.tsx`

#### Test A: `handleDragEnd calls moveTask with correct args for same-column reorder`

Tests that dragging task2 (position 0 in "To Do") onto task1 (position 1 in "To Do") results in `moveTask` being called with the task2 id, "To Do" status, and the position of the over task.

```typescript
it("handleDragEnd calls moveTask with correct args for same-column reorder", () => {
  const state = renderBoardView();

  act(() => {
    capturedOnDragStart!({
      active: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });

    capturedOnDragEnd!({
      active: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
      over: {
        id: "task1",
        data: { current: { type: "task", task: mockTasks[0] } },
      },
    });
  });

  expect(state.moveTask).toHaveBeenCalledWith("task2", "To Do", 1);
});
```

**Logic**: task2 is at position 0 in "To Do", task1 is at position 1 in "To Do". When task2 is dropped on task1, the `handleDragEnd` handler reads the current task from state (task2 — which has `status: "To Do"` since `onDragOver` doesn't fire for same-column). The `over` task (task1) is in the same column, so `finalPosition = overTask.position = 1`. Since this differs from the snapshot (task2 was at position 0), `moveTask` is called with `("task2", "To Do", 1)`.

#### Test B: `handleDragEnd calls moveTask with correct status for cross-column move`

Verifies that after `onDragOver` moves a task to a new column, `handleDragEnd` calls `moveTask` with the correct new status. This requires the `setTasks` mock to actually update the tasks so the handler can read the new status.

```typescript
it("handleDragEnd calls moveTask with correct status and position for cross-column move", () => {
  // Use a working setTasks that updates the returned tasks
  let currentTasks = [...mockTasks];
  const mockSetTasks = vi.fn((updater) => {
    if (typeof updater === "function") {
      currentTasks = updater(currentTasks);
    } else {
      currentTasks = updater;
    }
    // Update what useBoard returns so the handler sees updated tasks
    mockUseBoard.mockReturnValue({
      ...state,
      tasks: currentTasks,
      setTasks: mockSetTasks,
    });
  });

  const state = renderBoardView({
    tasks: currentTasks,
    setTasks: mockSetTasks,
  });

  act(() => {
    // Start dragging task3 (In Progress, pos 0)
    capturedOnDragStart!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
    });

    // Drag over task2 (To Do) — triggers cross-column move in state
    capturedOnDragOver!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
      over: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });

    // Drop on task2
    capturedOnDragEnd!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
      over: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });
  });

  expect(state.moveTask).toHaveBeenCalledWith(
    "task3",
    "To Do",
    expect.any(Number),
  );
});
```

**Note**: The existing test "handleDragEnd calls moveTask for task drag to different column" already covers this flow and verifies `moveTask` is called. The enhancement here is verifying the first argument (taskId) and second argument (status) are correct. The existing test already passes, so this test may be combined with or supplement it.

#### Test C: `handleDragEnd restores snapshot when API failure occurs through moveTask`

Tests that `setTasks` is called with the snapshot value (restoring state before calling `moveTask` from context):

```typescript
it("handleDragEnd restores snapshot before calling moveTask", () => {
  const mockSetTasks = vi.fn();
  const state = renderBoardView({
    setTasks: mockSetTasks,
  });

  act(() => {
    capturedOnDragStart!({
      active: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });

    capturedOnDragEnd!({
      active: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
      over: {
        id: "task1",
        data: { current: { type: "task", task: mockTasks[0] } },
      },
    });
  });

  // setTasks should have been called with the snapshot to restore state
  // before moveTask handles the optimistic update
  const setTasksCalls = mockSetTasks.mock.calls;
  const lastSetTasksArg = setTasksCalls[setTasksCalls.length - 1][0];
  // The snapshot should be the original mockTasks array
  expect(lastSetTasksArg).toEqual(mockTasks);
  expect(state.moveTask).toHaveBeenCalled();
});
```

#### Test D: `column drag-and-drop does not trigger moveTask`

Already exists as "handleDragEnd dispatches to column reorder not moveTask for column type" — no change needed. Serves as regression proof.

#### Test E: `handleDragEnd with task dropped on column (not another task) uses current position`

Tests the edge case where a task is dropped on a column droppable area (empty column) rather than on another task:

```typescript
it("handleDragEnd calls moveTask when task dropped on empty column area", () => {
  let currentTasks = [...mockTasks];
  const mockSetTasks = vi.fn((updater) => {
    if (typeof updater === "function") {
      currentTasks = updater(currentTasks);
    } else {
      currentTasks = updater;
    }
    mockUseBoard.mockReturnValue({
      ...state,
      tasks: currentTasks,
      setTasks: mockSetTasks,
    });
  });

  const state = renderBoardView({
    tasks: currentTasks,
    setTasks: mockSetTasks,
  });

  act(() => {
    capturedOnDragStart!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
    });

    // Drag over the "Done" column (empty column — over type is "column")
    capturedOnDragOver!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
      over: {
        id: "col3",
        data: { current: { type: "column" } },
      },
    });

    capturedOnDragEnd!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
      over: {
        id: "col3",
        data: { current: { type: "column" } },
      },
    });
  });

  expect(state.moveTask).toHaveBeenCalledWith(
    "task3",
    "Done",
    expect.any(Number),
  );
});
```

### 3.3 Visual Polish — `board-view.tsx`

Review the current `DragOverlay` rendering:

```tsx
<DragOverlay>
  {activeTask ? <TaskCard task={activeTask} /> : null}
</DragOverlay>
```

The `DragOverlay` from `@dnd-kit/core` renders a portal-based floating element. The `TaskCard` inside it inherits its normal styling (`bg-white`, `rounded-lg`, `shadow-sm`). For visual polish during drag:

1. **Enhanced shadow on overlay**: Wrap the `TaskCard` in the overlay with a slightly elevated shadow to distinguish it from static cards:

```tsx
<DragOverlay>
  {activeTask ? (
    <div className="rotate-2 scale-105">
      <TaskCard task={activeTask} />
    </div>
  ) : null}
</DragOverlay>
```

The `rotate-2` adds a slight tilt (2 degrees) to indicate the card is "picked up", and `scale-105` makes it slightly larger. This is a common drag-and-drop pattern for visual feedback. If this feels excessive, a simpler approach is just adding a stronger shadow:

```tsx
<DragOverlay>
  {activeTask ? (
    <div className="shadow-lg">
      <TaskCard task={activeTask} />
    </div>
  ) : null}
</DragOverlay>
```

**Decision**: Use `shadow-lg` and `rotate-1` for a subtle but noticeable lift effect. This provides the "picked up" feel without being distracting.

### 3.4 Visual Polish — `column.tsx`

Add a `min-height` to the task list area so that empty columns still have a droppable target area for task drag-and-drop:

Current:
```tsx
<div className="flex-1 overflow-y-auto px-3 pb-3">
  {children}
</div>
```

Updated:
```tsx
<div className="min-h-[2rem] flex-1 overflow-y-auto px-3 pb-3">
  {children}
</div>
```

The `min-h-[2rem]` ensures empty columns have at least 2rem (32px) of droppable area, preventing the case where an empty column has zero height and tasks can't be dragged into it.

### 3.5 Visual Polish — `task-card.tsx`

The current `TaskCard` has `mb-2` for spacing between cards. Review if this causes layout shift during drag:
- The `SortableTaskItem` wrapper applies `transform` and `transition` from `useSortable`, which handles animation smoothly
- The `isDragging ? 0.5 : undefined` opacity on the original card provides visual feedback
- The `mb-2` margin is applied to the `TaskCard` div, not the sortable wrapper, so it should not cause issues

**No changes needed** to `task-card.tsx` — the current styling is already consistent and well-spaced.

### 3.6 Visual Polish — `board-view.tsx` Transitions

Review the `SortableTaskItem` component:

```tsx
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : undefined,
};
```

The `transition` from `useSortable` handles smooth reordering animations. The `CSS.Transform.toString` converts the transform to a CSS string. This is the standard @dnd-kit pattern and should produce smooth transitions.

**Potential improvement**: The `CSS.Transform.toString` can sometimes include scale transforms. To prevent unexpected scaling, use `CSS.Translate.toString` instead:

```tsx
const style = {
  transform: CSS.Translate.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : undefined,
};
```

`CSS.Translate` only applies translate transforms (X/Y movement), not scale, which avoids unexpected card resizing during drag. Update the import from `@dnd-kit/utilities` accordingly.

---

## 4. Contracts

### Integration Test Data Flow

The integration tests verify the end-to-end flow through the `BoardView` component:

1. **User drags task** → `onDragStart` fires → `tasksSnapshot` captured, `activeTask` set
2. **Task hovers over new location** → `onDragOver` fires → `setTasks` called with optimistic cross-column update
3. **User drops task** → `onDragEnd` fires → `setTasks(snapshot)` restores, then `moveTask(taskId, status, position)` called from context

The tests verify:
- `moveTask` is called with the correct `(taskId, status, position)` triple
- `setTasks` is called to restore the snapshot before `moveTask`
- For same-column reorder: `status` matches the original column, `position` changes
- For cross-column move: `status` changes to the target column name
- For column drag: `reorderColumns` is called, not `moveTask`

---

## 5. Test Plan

### File: `packages/client/src/components/__tests__/board-view.test.tsx`

All existing tests remain unchanged. The following new tests are added:

#### Test A: `handleDragEnd calls moveTask with correct args for same-column reorder`

- **Setup**: render with default board state
- **Act**: 
  - Call `capturedOnDragStart` with task2 (position 0, "To Do")
  - Call `capturedOnDragEnd` with active=task2, over=task1 (position 1, "To Do")
- **Assert**: `state.moveTask` called with `("task2", "To Do", 1)`

#### Test B: `handleDragEnd calls moveTask with correct status for cross-column move via onDragOver`

- **Setup**: render with a functional `setTasks` mock that actually updates the tasks array
- **Act**:
  - Call `capturedOnDragStart` with task3 ("In Progress", position 0)
  - Call `capturedOnDragOver` with active=task3, over=task2 ("To Do") — triggers cross-column state update
  - Call `capturedOnDragEnd` with active=task3, over=task2
- **Assert**: `state.moveTask` called with `("task3", "To Do", <number>)`

#### Test C: `handleDragEnd restores snapshot before calling moveTask`

- **Setup**: render with a mock `setTasks`
- **Act**:
  - Call `capturedOnDragStart` with task2
  - Call `capturedOnDragEnd` with active=task2, over=task1 (same column, different position)
- **Assert**: the last `setTasks` call before `moveTask` receives the original `mockTasks` array (the snapshot)

#### Test D: `handleDragEnd calls moveTask when task dropped on empty column area`

- **Setup**: render with a functional `setTasks` mock
- **Act**:
  - Call `capturedOnDragStart` with task3 ("In Progress")
  - Call `capturedOnDragOver` with active=task3, over=col3 (Done column — type "column")
  - Call `capturedOnDragEnd` with active=task3, over=col3
- **Assert**: `state.moveTask` called with `("task3", "Done", <number>)`

#### Test E: `all existing column drag tests still pass` (regression)

- These are the existing tests: "handleDragEnd calls reorderColumns for column drag with new column order", "handleDragEnd does not call reorderColumns when column dropped on same position", "handleDragEnd does not call reorderColumns when over is null"
- **No new code needed** — these already exist and pass. Their continued passing constitutes the regression proof.

### Full Test Suite Verification

After adding the new tests:
```bash
npm run test -w packages/client
```

Must exit with 0 failures. All existing tests across:
- `board-view.test.tsx` (existing + new)
- `board-context.test.tsx`
- `task-card.test.tsx`
- `add-task-form.test.tsx`
- `column.test.tsx`
- All other client tests (login, dashboard, sidebar, header, etc.)

---

## 6. Implementation Order

### Step 1: Add new integration tests to `board-view.test.tsx`

Add the four new test cases (Tests A–D) to the end of the existing `describe("BoardView")` block. These tests follow the same patterns as the existing drag tests but cover the missing scenarios:

1. Same-column reorder with correct `moveTask` arguments
2. Cross-column move with correct status via `onDragOver` + `onDragEnd`
3. Snapshot restoration before `moveTask` call
4. Task dropped on empty column (column droppable, not task droppable)

### Step 2: Visual polish — `board-view.tsx`

1. Update the `DragOverlay` content to wrap `TaskCard` in a styled container:
   ```tsx
   <DragOverlay>
     {activeTask ? (
       <div className="rotate-1 shadow-lg">
         <TaskCard task={activeTask} />
       </div>
     ) : null}
   </DragOverlay>
   ```

2. Change `CSS.Transform.toString` to `CSS.Translate.toString` in `SortableTaskItem` to prevent scale transforms during drag. This requires no import changes since both are on the `CSS` object from `@dnd-kit/utilities`.

### Step 3: Visual polish — `column.tsx`

Add `min-h-[2rem]` to the task list container div to ensure empty columns have a droppable area:

```tsx
<div className="min-h-[2rem] flex-1 overflow-y-auto px-3 pb-3">
  {children}
</div>
```

### Step 4: Run full client test suite

Run `npm run test -w packages/client` and verify all tests pass with 0 failures. Fix any failures discovered.

### Step 5: TypeScript compilation check

Run `npx tsc --noEmit -p packages/client/tsconfig.json` to ensure no type errors.

---

## 7. Verification Commands

```bash
# 1. Run full client test suite — must pass with 0 failures
npm run test -w packages/client

# 2. Run board-view tests specifically (faster feedback loop)
npx vitest run packages/client/src/components/__tests__/board-view.test.tsx

# 3. Run all board-related tests to confirm no regressions
npx vitest run packages/client/src/components/__tests__/board-view.test.tsx packages/client/src/components/__tests__/column.test.tsx packages/client/src/context/__tests__/board-context.test.tsx packages/client/src/components/__tests__/task-card.test.tsx packages/client/src/components/__tests__/add-task-form.test.tsx

# 4. TypeScript compilation — must succeed with no errors
npx tsc --noEmit -p packages/client/tsconfig.json

# 5. Verify no regressions in login/dashboard/project tests
npx vitest run packages/client/src/pages/__tests__/login-page.test.tsx packages/client/src/pages/__tests__/dashboard-page.test.tsx packages/client/src/pages/__tests__/board-page.test.tsx
```

---

## Complete Modified File: `packages/client/src/components/__tests__/board-view.test.tsx`

The file keeps all existing content unchanged. The following new tests are appended inside the `describe("BoardView")` block, after the last existing test:

```typescript
  // ===== NEW INTEGRATION TESTS: Task 6 =====

  it("handleDragEnd calls moveTask with correct args for same-column reorder", () => {
    const state = renderBoardView();

    act(() => {
      // Start dragging task2 (To Do, position 0)
      capturedOnDragStart!({
        active: {
          id: "task2",
          data: { current: { type: "task", task: mockTasks[1] } },
        },
      });

      // Drop task2 onto task1 (To Do, position 1) — same-column reorder
      capturedOnDragEnd!({
        active: {
          id: "task2",
          data: { current: { type: "task", task: mockTasks[1] } },
        },
        over: {
          id: "task1",
          data: { current: { type: "task", task: mockTasks[0] } },
        },
      });
    });

    // task2 was at position 0, dropped on task1 at position 1
    // Both are in "To Do", so status stays "To Do" and position changes to 1
    expect(state.moveTask).toHaveBeenCalledWith("task2", "To Do", 1);
  });

  it("handleDragEnd calls moveTask with correct status for cross-column move via onDragOver", () => {
    let currentTasks = [...mockTasks];
    const mockSetTasks = vi.fn((updater: unknown) => {
      if (typeof updater === "function") {
        currentTasks = (updater as (prev: typeof mockTasks) => typeof mockTasks)(currentTasks);
      } else {
        currentTasks = updater as typeof mockTasks;
      }
      mockUseBoard.mockReturnValue({
        ...state,
        tasks: currentTasks,
        setTasks: mockSetTasks,
      });
    });

    const state = renderBoardView({
      tasks: currentTasks,
      setTasks: mockSetTasks,
    });

    act(() => {
      // Start dragging task3 (In Progress, position 0)
      capturedOnDragStart!({
        active: {
          id: "task3",
          data: { current: { type: "task", task: mockTasks[2] } },
        },
      });

      // Drag over task2 (To Do) — triggers cross-column move
      capturedOnDragOver!({
        active: {
          id: "task3",
          data: { current: { type: "task", task: mockTasks[2] } },
        },
        over: {
          id: "task2",
          data: { current: { type: "task", task: mockTasks[1] } },
        },
      });

      // Drop on task2
      capturedOnDragEnd!({
        active: {
          id: "task3",
          data: { current: { type: "task", task: mockTasks[2] } },
        },
        over: {
          id: "task2",
          data: { current: { type: "task", task: mockTasks[1] } },
        },
      });
    });

    // task3 moved from "In Progress" to "To Do" via onDragOver
    expect(state.moveTask).toHaveBeenCalledWith(
      "task3",
      "To Do",
      expect.any(Number),
    );
  });

  it("handleDragEnd restores snapshot before calling moveTask", () => {
    const mockSetTasks = vi.fn();
    const state = renderBoardView({
      setTasks: mockSetTasks,
    });

    act(() => {
      capturedOnDragStart!({
        active: {
          id: "task2",
          data: { current: { type: "task", task: mockTasks[1] } },
        },
      });

      capturedOnDragEnd!({
        active: {
          id: "task2",
          data: { current: { type: "task", task: mockTasks[1] } },
        },
        over: {
          id: "task1",
          data: { current: { type: "task", task: mockTasks[0] } },
        },
      });
    });

    // The last setTasks call before moveTask restores the snapshot
    const setTasksCalls = mockSetTasks.mock.calls;
    // Find the call that receives the raw array (not a function updater)
    const snapshotRestoreCall = setTasksCalls.find(
      (call: unknown[]) => Array.isArray(call[0]),
    );
    expect(snapshotRestoreCall).toBeTruthy();
    expect(snapshotRestoreCall![0]).toEqual(mockTasks);
    expect(state.moveTask).toHaveBeenCalled();
  });

  it("handleDragEnd calls moveTask when task dropped on empty column area", () => {
    let currentTasks = [...mockTasks];
    const mockSetTasks = vi.fn((updater: unknown) => {
      if (typeof updater === "function") {
        currentTasks = (updater as (prev: typeof mockTasks) => typeof mockTasks)(currentTasks);
      } else {
        currentTasks = updater as typeof mockTasks;
      }
      mockUseBoard.mockReturnValue({
        ...state,
        tasks: currentTasks,
        setTasks: mockSetTasks,
      });
    });

    const state = renderBoardView({
      tasks: currentTasks,
      setTasks: mockSetTasks,
    });

    act(() => {
      // Start dragging task3 (In Progress, position 0)
      capturedOnDragStart!({
        active: {
          id: "task3",
          data: { current: { type: "task", task: mockTasks[2] } },
        },
      });

      // Drag over the "Done" column (empty — col3)
      capturedOnDragOver!({
        active: {
          id: "task3",
          data: { current: { type: "task", task: mockTasks[2] } },
        },
        over: {
          id: "col3",
          data: { current: { type: "column" } },
        },
      });

      // Drop on the column
      capturedOnDragEnd!({
        active: {
          id: "task3",
          data: { current: { type: "task", task: mockTasks[2] } },
        },
        over: {
          id: "col3",
          data: { current: { type: "column" } },
        },
      });
    });

    // task3 moved from "In Progress" to "Done" (empty column)
    expect(state.moveTask).toHaveBeenCalledWith(
      "task3",
      "Done",
      expect.any(Number),
    );
  });
```

---

## Complete Modified File: `packages/client/src/components/board-view.tsx`

Two changes to the existing file:

**Change 1**: In `SortableTaskItem`, replace `CSS.Transform.toString` with `CSS.Translate.toString` (line 42):

```typescript
// Before:
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : undefined,
};

// After:
const style = {
  transform: CSS.Translate.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : undefined,
};
```

**Change 2**: In the `DragOverlay`, wrap `TaskCard` with a polish container (lines 356–358):

```tsx
// Before:
<DragOverlay>
  {activeTask ? <TaskCard task={activeTask} /> : null}
</DragOverlay>

// After:
<DragOverlay>
  {activeTask ? (
    <div className="rotate-1 shadow-lg">
      <TaskCard task={activeTask} />
    </div>
  ) : null}
</DragOverlay>
```

---

## Complete Modified File: `packages/client/src/components/column.tsx`

One change to the existing file:

**Change**: Add `min-h-[2rem]` to the task list container (line 164):

```tsx
// Before:
<div className="flex-1 overflow-y-auto px-3 pb-3">
  {children}
</div>

// After:
<div className="min-h-[2rem] flex-1 overflow-y-auto px-3 pb-3">
  {children}
</div>
```