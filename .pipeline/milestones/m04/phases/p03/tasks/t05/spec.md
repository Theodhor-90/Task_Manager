# Task 5: Markdown Description Editor with Preview Toggle

## Objective
Add a description section to the `TaskDetailPanel` with a Write/Preview toggle that allows editing raw markdown and previewing rendered output via `react-markdown`.

## Deliverables
- Description section within `TaskDetailPanel`, below the title
- Two tabs: "Write" and "Preview"
  - "Write" tab: a `<textarea>` with the current description, auto-resizing or a reasonable min-height
  - "Preview" tab: renders the textarea content via `react-markdown` with appropriate Tailwind prose styling
- Default to "Write" tab if description is empty, "Preview" tab if description exists
- Description saves on blur (when focus leaves the textarea) via `updateTask({ description })` from board context
- If description is empty/whitespace, a placeholder prompt ("Add a description...") is shown in preview mode
- Unit tests covering: renders textarea in Write mode, renders markdown in Preview mode, tab switching works

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/src/components/task-detail-panel.tsx` | Modify — add description section |
| `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | Modify — add description tests |

## Implementation Details
- Import and use `react-markdown` (installed in Task 1) for the Preview tab
- Apply Tailwind's `prose` class (from `@tailwindcss/typography` plugin if available, or manual styling) for readable markdown output
- Textarea should have a reasonable min-height (e.g., `min-h-[150px]`) and be full-width within the panel
- Save on blur means calling `updateTask({ description: textareaValue })` when the textarea loses focus
- Only trigger save if the description actually changed (compare with the originally loaded value)
- The tab state is local to the component (no need to persist which tab is active)

## Dependencies
- Task 1 (`react-markdown` installed)
- Task 4 (`TaskDetailPanel` component exists)

## Verification
1. Description section appears below the title in the panel
2. Write tab shows a textarea with the current description
3. Preview tab renders the description as formatted markdown
4. Tab switching works correctly
5. Description saves to the API on blur and updates the task
6. Empty description shows placeholder in preview mode
7. Unit tests pass