## Implementation Summary

I've successfully implemented Task 4 according to the locked plan. Here's what was done:

### Modified Files:

1. **`packages/client/src/components/app-layout.tsx`**:
   - Added `useState` import from React
   - Added `ProjectFormModal` import
   - Added `isCreateModalOpen` state variable (initialized to `false`)
   - Updated `handleCreateProject` to set `isCreateModalOpen` to `true` (replacing the no-op comment)
   - Wrapped the return in a React fragment (`<>...</>`)
   - Added `ProjectFormModal` rendering with `isOpen={isCreateModalOpen}` and `onClose={() => setIsCreateModalOpen(false)}`
   - Modal is rendered in create mode (no `project` prop)

2. **`packages/client/src/components/__tests__/app-layout.test.tsx`**:
   - Added `fireEvent` to the `@testing-library/react` import
   - Added 3 new test cases:
     - Test that clicking the sidebar "New Project" button opens the modal
     - Test that the modal can be closed by clicking "Cancel"
     - Test that the sidebar create button works on the board route (verifying it works on all authenticated routes)

### Verification Results:
✅ All 12 AppLayout tests pass (including 3 new tests)  
✅ All 129 client tests pass (no regressions)  
✅ TypeScript compilation passes with no errors  

The sidebar "New Project" button is now fully wired and will open the `ProjectFormModal` in create mode from any authenticated route in the application.