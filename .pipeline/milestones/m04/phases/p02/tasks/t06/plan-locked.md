Now I have all the context. Let me produce the definitive plan.

# Task 6 Implementation Plan — Integration Testing & Polish

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** | Add integration tests for same-column reorder, cross-column move, API failure rollback, and task drop on empty column |
| `packages/client/src/components/board-view.tsx` | **Modify** | Visual polish: DragOverlay styling, `CSS.Translate` to prevent scale transforms |
| `packages/client/src/components/column.tsx` | **Modify** | Visual polish: min-height on task list for empty column droppability |

---

## 2. Dependencies

- **t01–t05 complete** — All prior tasks in this phase are implemented and their individual tests pass
- All implementation files exist and are verified:
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

After reviewing all existing test files from t01–t05, here is what is already covered vs. what the task spec requires:

**Already covered (by t01–t05 tests)**:
- `board-context.test.tsx`: createTask (append to state, throw when board not loaded, no state change on API failure), moveTask (cross-column optimistic update, rollback on failure, same-column reorder, throw when board not loaded), setTasks (exposed and functional)
- `board-view.test.tsx`: column rendering, task grouping and sorting, TaskCard rendering, DragOverlay rendering, AddTaskForm in each column, column drag-end (reorder, same position, null over), task drag-end (cross-column move, no-move when dropped on self, type discrimination)
- `task-card.test.tsx`: title, priority badge, due date, label dots, click handler, accessibility
- `add-task-form.test.tsx`: button toggle, auto-focus, Enter submission, input clear, Escape cancel, empty submission, error display, error clear, disabled while submitting, double-submit guard, blur behavior
- `column.test.tsx`: name, task count, children, drag handle, delete, rename, confirm dialog, error display

**Gaps to fill (per verification criteria)**:

1. **Same-column task reorder with correct `moveTask` arguments** — The existing test "handleDragEnd does not call moveTask when task has not moved" covers drop-on-self, but there is no test for within-column reorder where a task is dropped on a *different* task in the same column. Must be added.

2. **Cross-column move with verified status and position arguments** — The existing test "handleDragEnd calls moveTask for task drag to different column" verifies `moveTask` is called but does NOT verify the exact `status` and `position` arguments. A new test should verify these.

3. **API failure rollback at the board-view level** — Tested at the context level (`board-context.test.tsx`: "moveTask reverts on API failure and sets error") but NOT at the board-view integration level. A test verifying that `setTasks` is called with the snapshot to restore state strengthens coverage.

4. **Task drop on empty column** — No existing test covers the case where a task is dropped on a column droppable area rather than on another task. Must be added.

5. **Regression: column drag-and-drop** — Already covered by existing `board-view.test.tsx` column drag tests. No new code needed.

6. **Full client test suite passes** — Must verify by running `npm run test -w packages/client`.

7. **Drag overlay renders correctly** — Already tested: "renders DragOverlay" test exists.

### 3.2 New Integration Tests for `board-view.test.tsx`

**Important prerequisite — Update `@dnd-kit/utilities` mock**: The visual polish changes (Section 3.5) change `CSS.Transform.toString` to `CSS.Translate.toString` in `SortableTaskItem`. The existing test mock only provides `CSS.Transform`. The mock **must** be updated to provide `CSS.Translate` (and can keep `CSS.Transform` for safety):

```typescript
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
    Translate: {
      toString: () => undefined,
    },
  },
}));
```

Without this change, every test rendering `SortableTaskItem` would fail with `TypeError: Cannot read properties of undefined (reading 'toString')`.

#### Test A: `handleDragEnd calls moveTask with correct args for same-column reorder`

Tests that dragging task2 (position 0 in "To Do") onto task1 (position 1 in "To Do") results in `moveTask` being called with the correct task ID, status, and position.

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

**Logic**: task2 is at position 0, task1 is at position 1, both in "To Do". `onDragOver` does not fire for same-column moves. The handler reads the current task from state (task2 has `status: "To Do"`). The over task (task1) is in the same column, so `finalPosition = overTask.position = 1`. Since this differs from the snapshot (task2 was at position 0), `moveTask` is called with `("task2", "To Do", 1)`.

#### Test B: `handleDragEnd calls moveTask with correct status for cross-column move via onDragOver`

Verifies that after `onDragOver` moves a task to a new column, `handleDragEnd` calls `moveTask` with the correct new status. The `setTasks` mock must actually update the tasks so the handler can read the new status.

**Critical pattern**: Declare `let state` before defining the `mockSetTasks` closure. The closure captures the mutable binding — by the time drag events fire (after render), `state` will have been assigned. This avoids the circular reference bug identified in feedback-v1.

```typescript
it("handleDragEnd calls moveTask with correct status for cross-column move via onDragOver", () => {
  let currentTasks = [...mockTasks];
  let state: ReturnType<typeof defaultBoardState>;

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

  state = renderBoardView({
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

#### Test C: `handleDragEnd restores snapshot before calling moveTask`

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

  const setTasksCalls = mockSetTasks.mock.calls;
  const snapshotRestoreCall = setTasksCalls.find(
    (call: unknown[]) => Array.isArray(call[0]),
  );
  expect(snapshotRestoreCall).toBeTruthy();
  expect(snapshotRestoreCall![0]).toEqual(mockTasks);
  expect(state.moveTask).toHaveBeenCalled();
});
```

#### Test D: `handleDragEnd calls moveTask when task dropped on empty column area`

Tests the edge case where a task is dropped on a column droppable area rather than on another task. Uses the same `let state` pattern as Test B.

```typescript
it("handleDragEnd calls moveTask when task dropped on empty column area", () => {
  let currentTasks = [...mockTasks];
  let state: ReturnType<typeof defaultBoardState>;

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

  state = renderBoardView({
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

### 3.3 Visual Polish — `board-view.tsx` DragOverlay

Current state (line 356–358):
```tsx
<DragOverlay>
  {activeTask ? <TaskCard task={activeTask} /> : null}
</DragOverlay>
```

Updated — wrap `TaskCard` with a subtle "picked up" effect:
```tsx
<DragOverlay>
  {activeTask ? (
    <div className="rotate-1 shadow-lg">
      <TaskCard task={activeTask} />
    </div>
  ) : null}
</DragOverlay>
```

The `rotate-1` adds a 1-degree tilt to indicate the card is being dragged, and `shadow-lg` elevates it visually above the board. This is a common drag-and-drop UX pattern.

### 3.4 Visual Polish — `board-view.tsx` SortableTaskItem Transform

Current state (line 42):
```typescript
transform: CSS.Transform.toString(transform),
```

Updated:
```typescript
transform: CSS.Translate.toString(transform),
```

`CSS.Translate` only applies translate transforms (X/Y movement), not scale, which avoids unexpected card resizing during drag. Both `Transform` and `Translate` are on the `CSS` object from `@dnd-kit/utilities`, so no import changes are needed.

### 3.5 Visual Polish — `column.tsx` Min-Height

Current state (line 164):
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

The `min-h-[2rem]` ensures empty columns have at least 32px of droppable area, preventing the case where an empty column has zero height and tasks can't be dragged into it.

### 3.6 Visual Polish — `task-card.tsx`

**No changes needed.** The current styling is already consistent: `mb-2` spacing between cards, `SortableTaskItem` wrapper handles `transform`/`transition`/`opacity` from `useSortable`. The margin is on the `TaskCard` div (not the sortable wrapper), which does not cause layout shift.

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

All existing tests remain unchanged. The following changes are made:

#### Mock Update: `@dnd-kit/utilities`

Update the mock to include both `CSS.Transform` and `CSS.Translate`:

```typescript
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
    Translate: {
      toString: () => undefined,
    },
  },
}));
```

#### New Test A: `handleDragEnd calls moveTask with correct args for same-column reorder`

- **Setup**: render with default board state
- **Act**: Call `capturedOnDragStart` with task2 (position 0, "To Do"), then `capturedOnDragEnd` with active=task2, over=task1 (position 1, "To Do")
- **Assert**: `state.moveTask` called with `("task2", "To Do", 1)`

#### New Test B: `handleDragEnd calls moveTask with correct status for cross-column move via onDragOver`

- **Setup**: Declare `let state` first, define functional `setTasks` mock that references `state` via mutable binding, then assign `state = renderBoardView(...)`
- **Act**: `onDragStart` (task3, "In Progress") → `onDragOver` (over task2 in "To Do") → `onDragEnd` (drop on task2)
- **Assert**: `state.moveTask` called with `("task3", "To Do", <number>)`

#### New Test C: `handleDragEnd restores snapshot before calling moveTask`

- **Setup**: render with a mock `setTasks`
- **Act**: `onDragStart` (task2) → `onDragEnd` (active=task2, over=task1, same column different position)
- **Assert**: `setTasks` was called with the original `mockTasks` array (snapshot restore), and `moveTask` was called

#### New Test D: `handleDragEnd calls moveTask when task dropped on empty column area`

- **Setup**: Same `let state` pattern as Test B with functional `setTasks`
- **Act**: `onDragStart` (task3, "In Progress") → `onDragOver` (over col3, "Done" column) → `onDragEnd` (drop on col3)
- **Assert**: `state.moveTask` called with `("task3", "Done", <number>)`

#### Existing Regression Tests (no changes needed)

- "handleDragEnd calls reorderColumns for column drag with new column order"
- "handleDragEnd does not call reorderColumns when column dropped on same position"
- "handleDragEnd does not call reorderColumns when over is null"
- "handleDragEnd dispatches to column reorder not moveTask for column type"

These already exist and pass. Their continued passing constitutes regression proof.

---

## 6. Implementation Order

### Step 1: Update `@dnd-kit/utilities` mock in `board-view.test.tsx`

Change the mock to include `CSS.Translate.toString` alongside the existing `CSS.Transform.toString`. This must happen before the production code change to prevent test failures.

### Step 2: Add new integration tests to `board-view.test.tsx`

Append four new test cases (Tests A–D) to the end of the existing `describe("BoardView")` block:

1. Same-column reorder with correct `moveTask` arguments
2. Cross-column move with correct status via `onDragOver` + `onDragEnd`
3. Snapshot restoration before `moveTask` call
4. Task dropped on empty column (column droppable, not task droppable)

### Step 3: Visual polish — `board-view.tsx`

1. In `SortableTaskItem`, change `CSS.Transform.toString(transform)` to `CSS.Translate.toString(transform)` (line 42)
2. Update the `DragOverlay` content to wrap `TaskCard` in `<div className="rotate-1 shadow-lg">` (lines 356–358)

### Step 4: Visual polish — `column.tsx`

Add `min-h-[2rem]` to the task list container div class (line 164):
```
"flex-1 overflow-y-auto px-3 pb-3" → "min-h-[2rem] flex-1 overflow-y-auto px-3 pb-3"
```

### Step 5: Run full client test suite

Run `npm run test -w packages/client` and verify all tests pass with 0 failures. Fix any failures discovered.

### Step 6: TypeScript compilation check

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

## Tiebreaker Decisions

### Decision 1: `CSS.Translate` mock update (from feedback-v2)

Both plan-v1 and plan-v2 proposed changing `CSS.Transform.toString` → `CSS.Translate.toString` in production code, but **neither** updated the test mock. Feedback-v2 correctly identified that this would cause `TypeError: Cannot read properties of undefined (reading 'toString')` in every test rendering `SortableTaskItem`. This plan explicitly includes the mock update as Step 1 of the implementation order, before the production code change.

### Decision 2: Circular reference fix (from feedback-v1)

Plan-v1 defined `mockSetTasks` closures that referenced `state` before assignment. Plan-v2 fixed this by declaring `let state` before the closure definition. This plan adopts plan-v2's fix for Tests B and D, with an explicit comment explaining why the pattern is safe (the closure only executes during drag events, after `state` is assigned by `renderBoardView`).

### Decision 3: No removal of `task-card.tsx` from deliverables table

Both plans listed `task-card.tsx` as a potential modification target for visual polish, then concluded no changes were needed. This plan removes it from the deliverables table entirely to avoid confusion — only files that will actually be modified are listed.

---

## Complete Changes

### `packages/client/src/components/__tests__/board-view.test.tsx`

**Change 1**: Update `@dnd-kit/utilities` mock (lines 65–71):

```typescript
// Before:
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

// After:
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
    Translate: {
      toString: () => undefined,
    },
  },
}));
```

**Change 2**: Append four new tests inside the `describe("BoardView")` block, after the last existing test (line 456, before the closing `});`):

```typescript
  // ===== NEW INTEGRATION TESTS: Task 6 =====

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

  it("handleDragEnd calls moveTask with correct status for cross-column move via onDragOver", () => {
    let currentTasks = [...mockTasks];
    // Declare state before the closure so mockSetTasks captures the mutable binding.
    // By the time drag events fire (after render), state will have been assigned.
    let state: ReturnType<typeof defaultBoardState>;

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

    state = renderBoardView({
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

    const setTasksCalls = mockSetTasks.mock.calls;
    const snapshotRestoreCall = setTasksCalls.find(
      (call: unknown[]) => Array.isArray(call[0]),
    );
    expect(snapshotRestoreCall).toBeTruthy();
    expect(snapshotRestoreCall![0]).toEqual(mockTasks);
    expect(state.moveTask).toHaveBeenCalled();
  });

  it("handleDragEnd calls moveTask when task dropped on empty column area", () => {
    let currentTasks = [...mockTasks];
    // Declare state before the closure so mockSetTasks captures the mutable binding.
    // By the time drag events fire (after render), state will have been assigned.
    let state: ReturnType<typeof defaultBoardState>;

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

    state = renderBoardView({
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

### `packages/client/src/components/board-view.tsx`

**Change 1** (line 42): Replace `CSS.Transform.toString` with `CSS.Translate.toString`:

```typescript
// Before:
    transform: CSS.Transform.toString(transform),

// After:
    transform: CSS.Translate.toString(transform),
```

**Change 2** (lines 356–358): Wrap DragOverlay TaskCard in a styled container:

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

### `packages/client/src/components/column.tsx`

**Change** (line 164): Add `min-h-[2rem]` to the task list container:

```tsx
// Before:
      <div className="flex-1 overflow-y-auto px-3 pb-3">

// After:
      <div className="min-h-[2rem] flex-1 overflow-y-auto px-3 pb-3">
```