# Task 4: Labels in BoardContext

## Objective

Extend `BoardContext` to fetch, store, and manage labels as shared state, making them accessible to `TaskCard`, `LabelPicker`, `LabelManager`, and `FilterBar`.

## Deliverables

1. **Modified file: `packages/client/src/context/board-context.tsx`**:
   - Add `labels: Label[]` to the `BoardContextValue` interface/state, initialized to `[]`.
   - Extend `loadBoard` to also call `fetchLabels(projectId)` and store the result. The project ID is available from the board response's `project` field.
   - Add `addLabel(name: string, color: string): Promise<Label>` — calls `createLabel` from `api/labels.ts`, appends the returned label to `labels` state.
   - Add `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<Label>` — calls API `updateLabel`, patches the matching label in `labels` state.
   - Add `removeLabel(labelId: string): Promise<void>` — calls `deleteLabel`, removes the label from `labels` state, and also removes the label ID from the `labels` array of any task in `tasks` state that references it (mirroring the server-side cascade behavior).

## Implementation Details

- `labels` should be fetched in parallel with existing board/task data in `loadBoard` for efficiency.
- The `removeLabel` method must update both the `labels` array and any affected tasks in `tasks` state to keep the UI consistent without a full re-fetch.
- Export `labels`, `addLabel`, `updateLabel`, `removeLabel` from the context value so consuming components can access them via `useBoard()`.

## Dependencies

- **Task 3 (Labels API Client)** — `fetchLabels`, `createLabel`, `updateLabel`, `deleteLabel` must be available.
- Existing `BoardContext` at `packages/client/src/context/board-context.tsx` with `board`, `tasks`, `updateTask`, `setTasks`.
- `Label` type from `@taskboard/shared`.

## Verification

- `useBoard()` exposes `labels`, `addLabel`, `updateLabel`, `removeLabel`.
- Loading a board also fetches and populates labels.
- Adding a label updates the context state immediately.
- Updating a label reflects the change in context state.
- Removing a label removes it from `labels` and strips its ID from any task's `labels` array.
- TypeScript compilation passes with no errors.