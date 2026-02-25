Perfect! All tests pass, including the 4 new tests we added. The warnings about `act()` are from existing tests and not related to our changes. Let me verify the test count increase:

The board-context tests now show 27 tests (previously 23), which confirms our 4 new tests were added successfully:
- `updateTask calls API and patches task in state`
- `updateTask does not modify state on API failure`
- `removeTask calls API and removes task from state`
- `removeTask does not modify state on API failure`

Let me create a brief summary of what was implemented:

## Implementation Summary

Successfully implemented `updateTask` and `removeTask` methods in the Board Context according to the locked plan:

### Files Modified

1. **`packages/client/src/context/board-context.tsx`**
   - Added imports for `apiUpdateTask`, `apiDeleteTask`, and `UpdateTaskInput` type
   - Extended `BoardContextValue` interface with two new methods:
     - `updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task>`
     - `removeTask(taskId: string): Promise<void>`
   - Implemented `updateTask` method that calls the API and patches the task in state
   - Implemented `removeTask` method that calls the API and filters out the deleted task
   - Added both methods to the Provider value

2. **`packages/client/src/context/__tests__/board-context.test.tsx`**
   - Extended mock imports to include `apiUpdateTask` and `apiDeleteTask`
   - Updated vi.mock factory to mock the new API functions
   - Added 4 new test cases covering success and failure scenarios for both methods

### Verification Results

✅ Both methods are exported from the context (verified with grep)  
✅ TypeScript compiles without errors  
✅ All 235 tests pass (27 tests in board-context suite, including 4 new tests)

The implementation follows the existing patterns in the codebase:
- No optimistic updates (errors propagate to caller)
- Empty dependency arrays (only use stable imports and setters)
- Replace entire task object on update (preserves server-computed values)
- Simple state mutations after API confirmation