# Task 7: LabelManager Component

## Objective

Build an inline management UI for creating, editing, and deleting project labels.

## Deliverables

1. **New file: `packages/client/src/components/label-manager.tsx`** — `LabelManager` component:
   - Renders as a popover or expandable section.
   - Displays existing labels as a list, each showing:
     - A color swatch (small rectangle or circle filled with the label's color)
     - The label name
     - An edit button that opens inline edit mode with a name text input and `<input type="color">` for the color
     - A delete button that triggers a `ConfirmDialog` warning that the label will be removed from all tasks
   - A "New label" form (at the top or bottom) with:
     - A name text input
     - An `<input type="color">` defaulting to a random color
     - A "Create" button
   - Uses `addLabel`, `updateLabel`, and `removeLabel` from `useBoard()`.

2. **Integration**:
   - Accessible from the `LabelPicker`'s "Manage labels" link.
   - Optionally accessible from a button in the board header area.

## Implementation Details

- Use the existing `ConfirmDialog` component for delete confirmation.
- Random default color: generate a random hex color for the color input's default value.
- Inline edit mode: clicking edit on a label replaces its display with input fields; saving calls `updateLabel` and exits edit mode.
- Deleting a label calls `removeLabel` from BoardContext, which handles both the API call and local state cleanup.

## Dependencies

- **Task 4 (Labels in BoardContext)** — `labels`, `addLabel`, `updateLabel`, `removeLabel` must be available.
- **Task 6 (LabelPicker)** — for the "Manage labels" link integration.
- Existing `ConfirmDialog` component.

## Verification

- The label manager displays all existing project labels.
- Creating a new label with a name and color adds it to the list and it appears in the LabelPicker.
- Editing a label's name or color saves the change and reflects everywhere (TaskCard dots, LabelPicker).
- Deleting a label shows a confirmation dialog, removes it from the list, and removes it from all tasks.
- TypeScript compilation passes with no errors.