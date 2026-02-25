# Task 2: Comment UI Components

## Objective

Build the comments section inside `TaskDetailPanel`: a chronological list of comments and a form to add new comments, with inline edit and delete on each comment.

## Deliverables

1. **New file: `packages/client/src/components/comment-list.tsx`** — `CommentList` component:
   - Accepts a `taskId` prop.
   - Fetches comments on mount via `fetchComments(taskId)` from `api/comments.ts`.
   - Renders each comment showing: author name, relative timestamp (e.g., "2 hours ago"), and body text.
   - Inline edit: clicking an edit control toggles a textarea pre-filled with the comment body; saving calls `updateComment` and updates the list.
   - Delete: a delete button triggers a `ConfirmDialog`; on confirmation calls `deleteComment` and removes from the list.

2. **New file: `packages/client/src/components/comment-form.tsx`** — `CommentForm` component:
   - A textarea with a "Comment" submit button.
   - On submit, calls `createComment(taskId, body)`, prepends the new comment to the list, and clears the textarea.
   - Displays a loading/disabled state while submitting.
   - For newly created comments, uses the current user's name from `useAuth()` to display the author inline (since the POST response returns an unpopulated author ID).

3. **Modified file: `packages/client/src/components/task-detail-panel.tsx`**:
   - Integrate `CommentList` and `CommentForm` below the existing metadata section (priority/due date) and above the delete button.
   - Separated by a section heading "Comments".

## Implementation Details

- Relative timestamps can be computed with simple date math or a small helper (no external library required — use `Intl.RelativeTimeFormat` or manual calculation).
- Comments are managed in local component state within `CommentList`, not in `BoardContext` (per design decision #1).
- Use the existing `ConfirmDialog` component for delete confirmations.

## Dependencies

- **Task 1 (Comments API Client)** — `fetchComments`, `createComment`, `updateComment`, `deleteComment` functions and `PopulatedComment` type must be available.
- Existing `TaskDetailPanel` at `packages/client/src/components/task-detail-panel.tsx`.
- Existing `ConfirmDialog` component.
- `useAuth()` hook for current user info.

## Verification

- Opening a task detail panel fetches and displays comments in chronological order.
- Author name and relative timestamp are visible on each comment.
- Submitting the comment form adds a new comment that appears immediately.
- Editing a comment inline saves the change and reflects immediately.
- Deleting a comment shows a confirmation dialog and removes the comment on confirm.
- TypeScript compilation passes with no errors.