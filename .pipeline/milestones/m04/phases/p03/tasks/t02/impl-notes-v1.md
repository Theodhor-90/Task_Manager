Perfect! The implementation is complete and correct. Let me summarize what was accomplished:

## Implementation Summary

Successfully implemented Task 2 (`fetchTask` API Client Function) according to the locked plan:

### What was done:
1. **Added `fetchTask` function** to `packages/client/src/api/tasks.ts` (lines 26-30)
   - Signature: `fetchTask(taskId: string): Promise<ApiSuccessResponse<Task>>`
   - Implementation: Uses `apiClient.get` to call `GET /api/tasks/${taskId}`
   - Positioned before `createTask` following CRUD ordering convention (read operations before create/update/delete)

### Verification:
✅ **Function export confirmed** - `grep` found the exported function  
✅ **TypeScript compilation successful** - `npm run build` completed without errors  
✅ **All existing tests pass** - 231/231 tests passed with no regressions  

The function follows the exact same pattern as similar functions in the codebase (e.g., `fetchBoard` in `api/boards.ts`) and requires no additional imports since `Task`, `ApiSuccessResponse`, and `apiClient` were already imported. The implementation is ready to be consumed by the `TaskDetailPanel` component in Task 4.