# Task 5: TaskCard Label Colors

## Objective

Replace the placeholder gray dots on `TaskCard` with actual label colors by looking up each label ID against the labels stored in `BoardContext`.

## Deliverables

1. **Modified file: `packages/client/src/components/task-card.tsx`**:
   - Consume `labels` from `useBoard()` (or receive them as a prop from the parent component).
   - For each ID in `task.labels`, find the matching `Label` object in the labels array.
   - Render a colored dot using the label's `color` field as `backgroundColor` (replacing any placeholder gray dots).
   - If a label ID is not found (e.g., stale data), skip rendering that dot.
   - Add a `title` attribute to each dot showing the label name on hover.

## Implementation Details

- Use a lookup map or `.find()` to match label IDs efficiently.
- The colored dots should be small circles (matching existing placeholder dot styling) with the label's hex color.
- The hover tooltip (`title` attribute) should display the label's `name`.

## Dependencies

- **Task 4 (Labels in BoardContext)** — `labels` must be available via `useBoard()`.
- Existing `TaskCard` at `packages/client/src/components/task-card.tsx` with placeholder label dot rendering.

## Verification

- Task cards display colored dots matching their assigned labels' colors.
- Hovering over a label dot shows the label name as a tooltip.
- Label dots for deleted/missing labels are not rendered (no errors).
- TypeScript compilation passes with no errors.