## Objective

Build a dedicated `ProjectCard` component that renders a single project as a clickable card with edit and delete action buttons, used in the dashboard project grid.

## Deliverables

- **New file**: `packages/client/src/components/project-card.tsx`
- **Named export**: `ProjectCard`
- **Test file**: `packages/client/src/components/__tests__/project-card.test.tsx`

## Props Interface

```typescript
interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}
```

## Implementation Details

- Renders:
  - Project **name** as heading
  - **Truncated description** using Tailwind `line-clamp-2`
  - **Creation date** (formatted)
- Wraps card content in `<Link to={`/projects/${project._id}/board`}>` for navigation to the board view
- **Edit button** (pencil icon) and **delete button** (trash icon):
  - Both call their respective callbacks (`onEdit` / `onDelete`) with the `project` object
  - Both use `e.preventDefault()` and `e.stopPropagation()` to prevent the `<Link>` navigation from firing
- Tailwind styling: `rounded-lg border border-gray-200 bg-white p-4 shadow-sm` (consistent with existing patterns)
- Hover state on action buttons for discoverability

## Dependencies

- `Project` type from `@taskboard/shared`
- React Router `Link` component
- No dependency on other Phase 2 tasks

## Verification Criteria

1. Card renders project name, truncated description, and creation date
2. Clicking the card navigates to `/projects/:id/board`
3. Clicking the edit button calls `onEdit` with the project and does NOT navigate
4. Clicking the delete button calls `onDelete` with the project and does NOT navigate
5. Action buttons show hover styles
6. All unit tests pass