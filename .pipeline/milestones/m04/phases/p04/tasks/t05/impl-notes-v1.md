## Summary

Implementation completed successfully! Here's what was done:

### Modified Files

1. **`packages/client/src/components/task-card.tsx`**:
   - Added `Label` type import from `@taskboard/shared`
   - Added `useBoard` hook import from board context
   - Added label lookup map using `Map<string, Label>` for O(1) lookups
   - Replaced placeholder gray dots (`bg-gray-400`) with actual colored dots using `backgroundColor` inline style
   - Added `title` attribute to show label name on hover
   - Updated `aria-label` to use the actual label name instead of generic "Label"
   - Added null-check to skip rendering dots for missing/stale label IDs

2. **`packages/client/src/components/__tests__/task-card.test.tsx`**:
   - Added mock for `useBoard` hook with test label data
   - Updated existing label tests to use specific label names instead of generic "Label"
   - Added 3 new tests:
     - Verifies colored dots render with correct `backgroundColor`
     - Verifies tooltips show label name via `title` attribute
     - Verifies missing label IDs are skipped (no rendering)

3. **`packages/client/src/context/__tests__/board-context.test.tsx`**:
   - Added mock for labels API (`fetchLabels`)
   - Added default empty labels response in `beforeEach` to prevent errors

### Verification Results

✅ Shared package builds successfully  
✅ TypeScript compilation passes with no errors  
✅ All 19 task-card tests pass  
✅ All 27 board-context tests pass  
✅ All 286 client tests pass  
✅ `useBoard` import is present in task-card.tsx  
✅ Placeholder `bg-gray-400` class has been removed  

The implementation follows the locked plan exactly, with label colors now displayed on task cards using the actual hex color values from the BoardContext labels array.