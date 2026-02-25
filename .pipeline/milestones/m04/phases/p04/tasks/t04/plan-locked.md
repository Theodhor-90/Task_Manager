I have all the context I need. Now let me write the implementation plan.

# Task 4 Plan: Labels in BoardContext

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/context/board-context.tsx` | Modified | Add `labels` state, extend `loadBoard` to fetch labels, add `addLabel`, `updateLabel`, and `removeLabel` methods |

---

## 2. Dependencies

- **Task 3 (Labels API Client)** — `fetchLabels`, `createLabel`, `updateLabel`, `deleteLabel` must be available at `packages/client/src/api/labels.ts` (confirmed present and implemented)
- **Existing `BoardContext`** at `packages/client/src/context/board-context.tsx` — currently exposes `board`, `tasks`, `isLoading`, `error`, `loadBoard`, column methods, task methods, and `setTasks`
- **`Label` type** from `@taskboard/shared` at `packages/shared/src/types/index.ts` (line 66-72) — already defined with `_id`, `name`, `color`, `project`, `createdAt`
- **`Board.project` field** — the `Board` interface has `project: string` (line 21 of shared types), which provides the `projectId` needed to call `fetchLabels` during `loadBoard`

---

## 3. Implementation Details

### Deliverable 1: Modified `packages/client/src/context/board-context.tsx`

**Overview of changes**: Five discrete modifications to the existing file — new imports, expanded interface, new state, extended `loadBoard`, and three new callback methods. No existing code is removed; the additions are additive.

---

#### Change 1: Add imports

**Add to the existing import block** (line 8-23):

```typescript
import type { Board, Column, Label, Task } from "@taskboard/shared";
```

Add `Label` to the existing type import from `@taskboard/shared` (line 8). Currently it imports `Board`, `Column`, `Task` — add `Label`.

**Add a new import for the labels API functions** (after line 22, alongside the existing task API imports):

```typescript
import {
  fetchLabels as apiFetchLabels,
  createLabel as apiCreateLabel,
  updateLabel as apiUpdateLabel,
  deleteLabel as apiDeleteLabel,
} from "../api/labels";
```

**Note**: The alias pattern (`fetchLabels as apiFetchLabels`) follows the exact convention used for columns (lines 13-16: `addColumn as apiAddColumn`, etc.) and tasks (lines 19-22: `createTask as apiCreateTask`, etc.). This avoids name collisions between the API functions and the context methods.

---

#### Change 2: Extend `BoardContextValue` interface

Add the following four members to the `BoardContextValue` interface (currently lines 25-40). Insert after the `setTasks` field (line 39):

```typescript
labels: Label[];
addLabel: (name: string, color: string) => Promise<Label>;
updateLabel: (labelId: string, input: { name?: string; color?: string }) => Promise<Label>;
removeLabel: (labelId: string) => Promise<void>;
```

The resulting interface will have the existing 14 fields plus these 4, for a total of 18 fields.

**Type decisions**:
- `addLabel` takes `name` and `color` as separate string arguments (not an object) — this matches the task spec verbatim: "Add `addLabel(name: string, color: string): Promise<Label>`"
- `updateLabel` takes `labelId` and an `input` object with optional fields — matches the spec: "Add `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<Label>`"
- `removeLabel` returns `Promise<void>` — it both deletes the label and strips it from tasks state (mirroring server cascade)

---

#### Change 3: Add `labels` state

Add a new `useState` call inside `BoardProvider`, after the existing state declarations (after line 48):

```typescript
const [labels, setLabels] = useState<Label[]>([]);
```

This follows the same pattern as lines 45-48 where `board`, `tasks`, `isLoading`, and `error` state are initialized.

---

#### Change 4: Extend `loadBoard` to fetch labels in parallel

The current `loadBoard` (lines 50-66) fetches the board, then fetches tasks. The modified version will also fetch labels in parallel with tasks, using the `project` field from the board response as the `projectId`.

**Modified `loadBoard` logic**:

```typescript
const loadBoard = useCallback(async (projectId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const boardResponse = await fetchBoard(projectId);
    const loadedBoard = boardResponse.data;
    setBoard(loadedBoard);

    const [tasksResponse, labelsResponse] = await Promise.all([
      fetchBoardTasks(loadedBoard._id),
      apiFetchLabels(loadedBoard.project),
    ]);
    setTasks(tasksResponse.data);
    setLabels(labelsResponse.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load board";
    setError(message);
  } finally {
    setIsLoading(false);
  }
}, []);
```

**Key details**:
- `fetchBoardTasks` and `apiFetchLabels` are called in parallel via `Promise.all` — this is an efficiency improvement over sequential calls, as specified in the task spec: "labels should be fetched in parallel with existing board/task data"
- `loadedBoard.project` is a `string` (the project's ObjectId) — it's available on the `Board` interface and is set by the server when the board is created
- `setLabels(labelsResponse.data)` stores the full `Label[]` array
- Error handling remains the same — if either fetch fails, the catch block handles it

---

#### Change 5: Add `addLabel`, `updateLabel`, and `removeLabel` callbacks

Insert these three methods after the existing `removeTask` callback (after line 241), before the `return` statement.

##### `addLabel`

```typescript
const addLabel = useCallback(
  async (name: string, color: string): Promise<Label> => {
    if (!board) throw new Error("Board not loaded");
    const response = await apiCreateLabel(board.project, { name, color });
    const newLabel = response.data;
    setLabels((prev) => [...prev, newLabel]);
    return newLabel;
  },
  [board],
);
```

**Key details**:
- Uses `board.project` to get the `projectId` — the `createLabel` API function requires it as a path parameter
- Appends the new label to the end of the `labels` array (matching the server's `createdAt` ascending sort order)
- Depends on `board` in the callback dependency array (same pattern as `addColumn` at line 68)
- Returns the newly created `Label` so calling components can use it immediately

##### `updateLabel`

```typescript
const updateLabel = useCallback(
  async (labelId: string, input: { name?: string; color?: string }): Promise<Label> => {
    const response = await apiUpdateLabel(labelId, input);
    const updatedLabel = response.data;
    setLabels((prev) =>
      prev.map((l) => (l._id === labelId ? updatedLabel : l)),
    );
    return updatedLabel;
  },
  [],
);
```

**Key details**:
- No `board` dependency needed — `labelId` is sufficient for the API call (`PUT /api/labels/:id`)
- Replaces the matching label in state with the full updated label from the server response (using `findOneAndUpdate` with `{ new: true }`)
- Returns the updated `Label` for immediate use by the calling component
- Empty dependency array — same pattern as `updateTask` (line 232)

##### `removeLabel`

```typescript
const removeLabel = useCallback(
  async (labelId: string): Promise<void> => {
    await apiDeleteLabel(labelId);
    setLabels((prev) => prev.filter((l) => l._id !== labelId));
    setTasks((prev) =>
      prev.map((t) =>
        t.labels.includes(labelId)
          ? { ...t, labels: t.labels.filter((id) => id !== labelId) }
          : t,
      ),
    );
  },
  [],
);
```

**Key details**:
- Calls the API first — if the delete fails, the state is not modified (no optimistic update, consistent with the `removeColumn` and `removeTask` patterns)
- Removes the label from the `labels` state array
- **Also removes the label ID from every task's `labels` array** — this mirrors the server-side cascade (`TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })` in `label.routes.ts` line 180-188)
- Uses `t.labels.includes(labelId)` to check if a task references the deleted label before creating a new object — this avoids unnecessary object allocations for tasks that don't reference the label
- Empty dependency array — both `setLabels` and `setTasks` are stable setState dispatchers

---

#### Change 6: Add new values to the Provider

Add `labels`, `addLabel`, `updateLabel`, and `removeLabel` to the `BoardContext.Provider` value object (currently lines 244-260):

```typescript
<BoardContext.Provider
  value={{
    board,
    tasks,
    labels,
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
    addLabel,
    updateLabel,
    removeLabel,
  }}
>
```

**Note**: `labels` is placed after `tasks` for logical grouping (data fields together). The three label methods are placed after `setTasks` at the end, keeping the existing order stable and adding the new entries at the bottom.

---

## 4. Contracts

### `useBoard()` return value (extended)

Consuming components call `useBoard()` to access the context. The new fields:

| Field | Type | Description |
|-------|------|-------------|
| `labels` | `Label[]` | All labels for the current project, sorted by `createdAt` ascending |
| `addLabel` | `(name: string, color: string) => Promise<Label>` | Creates a label and appends it to state |
| `updateLabel` | `(labelId: string, input: { name?: string; color?: string }) => Promise<Label>` | Updates a label and patches it in state |
| `removeLabel` | `(labelId: string) => Promise<void>` | Deletes a label, removes from state, strips from all tasks |

### `addLabel` contract

**Input**: `name: "Bug"`, `color: "#ef4444"`

**Behavior**:
1. Calls `apiCreateLabel(board.project, { name: "Bug", color: "#ef4444" })`
2. Server responds with `{ data: { _id: "...", name: "Bug", color: "#ef4444", project: "...", createdAt: "..." } }`
3. Appends to `labels` state
4. Returns the new `Label` object

### `updateLabel` contract

**Input**: `labelId: "665f..."`, `input: { color: "#dc2626" }`

**Behavior**:
1. Calls `apiUpdateLabel("665f...", { color: "#dc2626" })`
2. Server responds with the updated label
3. Replaces the matching label in `labels` state
4. Returns the updated `Label` object

### `removeLabel` contract

**Input**: `labelId: "665f..."`

**Behavior**:
1. Calls `apiDeleteLabel("665f...")`
2. Server removes label from all tasks (via `$pull`) and deletes the label document
3. Filters the label out of `labels` state
4. For every task in `tasks` state whose `labels` array contains `"665f..."`, removes that ID from the array

---

## 5. Test Plan

No dedicated test files are required by the task spec. Verification is through TypeScript compilation and behavioral checks (see Section 7).

The task spec's verification criteria are:
- `useBoard()` exposes `labels`, `addLabel`, `updateLabel`, `removeLabel`
- Loading a board also fetches and populates labels
- Adding a label updates the context state immediately
- Updating a label reflects the change in context state
- Removing a label removes it from `labels` and strips its ID from any task's `labels` array
- TypeScript compilation passes with no errors

---

## 6. Implementation Order

1. **Step 1**: Add `Label` to the type import from `@taskboard/shared` (line 8)
2. **Step 2**: Add the labels API import block (after existing task API imports)
3. **Step 3**: Add `labels: Label[]` and the three method signatures to `BoardContextValue` interface
4. **Step 4**: Add `const [labels, setLabels] = useState<Label[]>([])` state declaration
5. **Step 5**: Modify `loadBoard` to fetch labels in parallel with tasks using `Promise.all`
6. **Step 6**: Add `addLabel`, `updateLabel`, and `removeLabel` callback implementations
7. **Step 7**: Add the four new fields to the `Provider` value object
8. **Step 8**: Verify TypeScript compilation

These steps are ordered by file position (top to bottom) for a clean, sequential edit flow.

---

## 7. Verification Commands

```bash
# 1. Build the shared package (dependency for client)
npm run build --workspace=@taskboard/shared

# 2. Verify client package compiles with the modified board-context.tsx
cd packages/client && npx tsc --noEmit

# 3. Verify the new exports are present in the context interface
grep -n "labels\|addLabel\|updateLabel\|removeLabel" packages/client/src/context/board-context.tsx

# 4. Verify the labels API import is present
grep -n "from.*api/labels" packages/client/src/context/board-context.tsx

# 5. Verify Promise.all is used in loadBoard for parallel fetching
grep -n "Promise.all" packages/client/src/context/board-context.tsx
```