## Objective

Build a reusable modal form component (`ProjectFormModal`) for creating and editing projects. This is the foundational UI component that Tasks 3 and 4 depend on.

## Deliverables

- **New file**: `packages/client/src/components/project-form-modal.tsx`
- **Named export**: `ProjectFormModal`
- **Test file**: `packages/client/src/components/__tests__/project-form-modal.test.tsx`

## Props Interface

```typescript
interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;  // if provided → edit mode; if absent → create mode
}
```

## Implementation Details

- Uses the existing `Modal` component (built in Phase 1, located at `packages/client/src/components/modal.tsx`)
- Modal title: **"New Project"** in create mode, **"Edit Project"** in edit mode
- Form fields:
  - `name`: text input, **required** (client-side validation: non-empty string)
  - `description`: textarea, **optional**
- When `project` prop is provided, pre-fill both fields with `project.name` and `project.description`
- On submit:
  - **Create mode**: call `useProjects().addProject()` from `ProjectsContext`
  - **Edit mode**: call `useProjects().updateProject()` from `ProjectsContext`
- Submit button shows disabled state with text "Creating..." (create mode) or "Saving..." (edit mode) during API call
- On API failure: display inline `ErrorMessage` component inside the modal, above form buttons
- On success: clear form fields, close modal via `onClose()`
- Form resets when modal opens (clear stale state from previous interactions)

## Dependencies

- Phase 1 components: `Modal`, `ErrorMessage`
- `ProjectsContext` with `addProject()` and `updateProject()` methods
- `Project` type from `@taskboard/shared`

## Verification Criteria

1. Component renders in create mode with empty fields and title "New Project"
2. Component renders in edit mode with pre-filled fields and title "Edit Project"
3. Submit button is disabled and shows loading text during API call
4. Successful create calls `addProject()` and closes modal
5. Successful edit calls `updateProject()` and closes modal
6. API errors display an `ErrorMessage` inside the modal without closing it
7. Name field validation prevents submission of empty name
8. All unit tests pass