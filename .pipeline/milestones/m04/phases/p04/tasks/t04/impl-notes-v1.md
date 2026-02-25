Perfect! The implementation is complete and matches the locked plan exactly. Let me provide a summary:

## Implementation Summary

Successfully implemented Task 4: Labels in BoardContext according to the locked plan. All changes were made to `packages/client/src/context/board-context.tsx`:

### Changes Made:

1. **Added Label type import** - Added `Label` to the existing type imports from `@taskboard/shared` (line 8)

2. **Added labels API imports** - Imported `fetchLabels`, `createLabel`, `updateLabel`, and `deleteLabel` from `../api/labels` with the `api*` alias pattern (lines 24-29)

3. **Extended BoardContextValue interface** - Added 4 new fields:
   - `labels: Label[]` - Array of all project labels
   - `addLabel(name: string, color: string): Promise<Label>` - Create a new label
   - `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<Label>` - Update a label
   - `removeLabel(labelId: string): Promise<void>` - Delete a label

4. **Added labels state** - Initialized `labels` state as an empty array using `useState<Label[]>([])` (line 59)

5. **Extended loadBoard** - Modified to fetch labels in parallel with tasks using `Promise.all`, fetching from `loadedBoard.project` (lines 69-74)

6. **Implemented addLabel callback** - Creates a label via API, appends to state, returns the new label (lines 258-267)

7. **Implemented updateLabel callback** - Updates a label via API, patches it in state, returns the updated label (lines 269-279)

8. **Implemented removeLabel callback** - Deletes label via API, removes from labels state, and strips the label ID from all tasks that reference it (lines 281-294)

9. **Added to Provider value** - Exposed `labels`, `addLabel`, `updateLabel`, and `removeLabel` through the context provider (lines 301, 314-316)

### Verification:
- ✅ TypeScript compilation passes with no errors
- ✅ All label-related exports are present in the context
- ✅ Labels API import is correctly added
- ✅ `Promise.all` is used for parallel fetching in `loadBoard`
- ✅ All implementation follows existing codebase patterns and conventions

The `BoardContext` now provides full label management capabilities that will be consumed by `TaskCard`, `LabelPicker`, `LabelManager`, and `FilterBar` components in subsequent tasks.