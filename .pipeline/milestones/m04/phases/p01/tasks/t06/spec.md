## Objective

Replace the current placeholder content in `BoardPage` with the fully functional `BoardProvider` + `BoardView`, completing the phase and enabling end-to-end board interaction.

## Deliverables

- Update `packages/client/src/pages/board-page.tsx`:
  - Wrap content in `BoardProvider`
  - Replace the placeholder `<div>` with `<BoardView />`
  - Keep the project name heading (or integrate it into the board header area)
  - Retain the existing guard for project-not-found
- Update the board page test file `packages/client/src/pages/__tests__/board-page.test.tsx` to reflect the new structure

## Files to Modify

| File | Action |
|------|--------|
| `packages/client/src/pages/board-page.tsx` | Modified |
| `packages/client/src/pages/__tests__/board-page.test.tsx` | Modified |

## Implementation Details

- Import `BoardProvider` from `packages/client/src/context/board-context.tsx`
- Import `BoardView` from `packages/client/src/components/board-view.tsx`
- The `BoardProvider` should be scoped to the `BoardPage` component tree so it mounts/unmounts with navigation
- The `projectId` from URL params should be passed to or read by the `BoardProvider` (depending on Task 3's implementation) to trigger `loadBoard`
- Existing tests need to be updated to mock the `BoardContext` or the API calls, and verify that `BoardView` renders within the page

## Dependencies

- **Task 3** — `BoardContext` / `BoardProvider` must be complete
- **Task 5** — `BoardView` component must be complete
- Existing file: `packages/client/src/pages/board-page.tsx` (current placeholder)

## Verification

1. Navigating to `/projects/:id/board` loads the board from the API and renders columns with task counts
2. Column CRUD works: add, rename (double-click inline edit), delete (with confirmation and error guard)
3. Column reorder works via drag-and-drop using the drag handle and persists to the server
4. Tasks appear as title-only stubs within their respective columns
5. Page refresh preserves the board state (all data fetched fresh from API)
6. Updated tests pass
7. Existing functionality is not broken: login, dashboard, project CRUD, sidebar navigation all continue to work