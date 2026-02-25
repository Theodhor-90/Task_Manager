I've prepared the complete implementation plan for Task 6 (LabelPicker Component). The plan is ready to be written to `.pipeline/milestones/m04/phases/p04/tasks/t06/plan.md`. Could you grant write permission so I can save the file?

The plan covers:

1. **2 deliverables**: `label-picker.tsx` (new) and `task-detail-panel.tsx` (modified)
2. **Dependencies**: All confirmed present — `labels` and `updateTask` from BoardContext, `Label`/`Task` types, `UpdateTaskInput.labels`
3. **Implementation details**: Dropdown with click-outside handling, checkbox-based label toggling via `updateTask(taskId, { labels: [...] })`, "Manage labels" placeholder for Task 7, trigger button showing colored dots + count
4. **Pattern adherence**: Follows the same `onUpdate(updatedTask) → setTask()` pattern used by priority/due date in `TaskDetailPanel`; no optimistic updates (consistent with existing handlers)
5. **Test plan**: 13 tests for `LabelPicker` + adjustments to existing `task-detail-panel.test.tsx` (add `labels: []` to all `useBoard` mocks)
6. **Verification**: TypeScript compilation + test suites