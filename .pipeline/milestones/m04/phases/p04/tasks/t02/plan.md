# Task 2 Plan: Comment UI Components

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | packages/client/src/components/comment-form.tsx | Created | Textarea + submit button for adding new comments |
| 2 | packages/client/src/components/comment-list.tsx | Created | Chronological comment list with inline edit and delete per comment |
| 3 | packages/client/src/components/task-detail-panel.tsx | Modified | Integrate CommentList and CommentForm into the panel |

---

## 2. Dependencies

- **Task 1 (completed)** — packages/client/src/api/comments.ts exists with fetchComments, createComment, updateComment, deleteComment functions
- **PopulatedComment type** — already defined in packages/shared/src/types/index.ts (lines 57-64): author is { _id: string; name: string; email: string }
- **Comment type** — already defined in packages/shared/src/types/index.ts (lines 48-55): author is string (ObjectId)
- **useAuth() hook** — packages/client/src/context/auth-context.tsx exports useAuth() returning { user: { id, email, name } | null, ... }
- **ConfirmDialog component** — packages/client/src/components/ui/confirm-dialog.tsx, props: { isOpen, message, confirmLabel?, onConfirm, onCancel }
- **TaskDetailPanel** — packages/client/src/components/task-detail-panel.tsx (397 lines) — the integration point for comments

### Server endpoint behavior (critical for type handling)

- GET /api/tasks/:taskId/comments — returns PopulatedComment[] (author is { _id, name, email }) sorted by createdAt ascending
- POST /api/tasks/:taskId/comments — returns Comment (author is a raw ObjectId string, NOT populated)
- PUT /api/comments/:id — returns Comment (author is a raw ObjectId string, NOT populated)
- DELETE /api/comments/:id — returns { data: { message: "Comment deleted" } }

---

## 3. Implementation Details

### Deliverable 1: packages/client/src/components/comment-form.tsx

**Purpose**: A textarea + submit button for adding new comments to a task.

**Exports**: CommentForm

**Props interface**:

    interface CommentFormProps {
      taskId: string;
      onCommentAdded: (comment: PopulatedComment) => void;
    }

**Imports**:

    import { useState } from "react";
    import type { PopulatedComment } from "@taskboard/shared";
    import { createComment } from "../api/comments";
    import { useAuth } from "../context/auth-context";

**State**:

    const [body, setBody] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

**Key logic**:

1. **Submit handler**: On button click:
   - Trim body, return early if empty
   - Set isSubmitting = true, clear error
   - Call createComment(taskId, body.trim())
   - On success: convert the returned Comment to a PopulatedComment by replacing author (a string ID) with the current user info from useAuth():
     const { user } = useAuth();
     const populatedComment: PopulatedComment = {
       ...response.data,
       author: { _id: user!.id, name: user!.name, email: user!.email },
     };
   - Call onCommentAdded(populatedComment)
   - Clear the textarea (setBody(""))
   - On error: set error message
   - Finally: set isSubmitting = false

2. **Disabled state**: The textarea and submit button should be disabled while isSubmitting is true. The button should show "Commenting..." text while submitting. The button should also be disabled when body.trim() is empty.

**Rendering**: A div containing a textarea (3 rows, placeholder "Add a comment..."), an error message if present, and a flex-end div with the submit button. Use Tailwind classes matching existing codebase patterns (rounded border border-gray-300, blue-600 button, etc.).

---

### Deliverable 2: packages/client/src/components/comment-list.tsx

**Purpose**: Render a list of comments for a task in chronological order. Each comment displays the author name, a relative timestamp, the body text, and inline edit/delete controls.

**Exports**: CommentList

**Props interface**:

    interface CommentListProps {
      taskId: string;
    }

**Imports**:

    import { useState, useEffect } from "react";
    import type { PopulatedComment } from "@taskboard/shared";
    import { fetchComments, updateComment, deleteComment } from "../api/comments";
    import { ConfirmDialog } from "./ui/confirm-dialog";
    import { CommentForm } from "./comment-form";

**State**:

    const [comments, setComments] = useState<PopulatedComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editBody, setEditBody] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);

**Key logic**:

1. **Data fetching**: On mount (and when taskId changes), call fetchComments(taskId). Store the data array in comments state. Set isLoading and error appropriately. Use a cancelled flag to prevent state updates on unmounted components (same pattern as TaskDetailPanel).

2. **Relative timestamp helper**: A function formatRelativeTime(dateString: string): string defined at module scope:
   - Less than 60 seconds: "just now"
   - Less than 60 minutes: "X minutes ago" (or "1 minute ago")
   - Less than 24 hours: "X hours ago" (or "1 hour ago")
   - Less than 30 days: "X days ago" (or "1 day ago")
   - Otherwise: formatted date via new Date(dateString).toLocaleDateString()
   No external library needed — use Date.now() - new Date(dateString).getTime().

3. **Rendering each comment**: Map over comments and render:
   - Author name (font-medium) + relative timestamp (text-xs text-gray-500) on one line
   - Body text below (text-sm text-gray-700)
   - Edit and Delete text buttons below the body
   - If editingId === comment._id: render a textarea pre-filled with editBody and Save/Cancel buttons instead of the body text and action buttons

4. **Inline edit flow**:
   - Clicking "Edit" sets editingId to the comment _id and editBody to the comment body
   - Clicking "Save": calls updateComment(editingId, editBody.trim()). On success, update the comment in comments state — **preserve the existing PopulatedComment author field** and only update body and updatedAt from the response (the PUT response returns Comment with unpopulated author). Clear editingId.
   - Clicking "Cancel": clears editingId and editBody

5. **Delete flow**:
   - Clicking "Delete" sets deleteId to the comment _id
   - ConfirmDialog renders with isOpen={deleteId !== null}, message "Are you sure you want to delete this comment?", confirmLabel="Delete"
   - On confirm: calls deleteComment(deleteId!), removes the comment from comments state, clears deleteId
   - On cancel: clears deleteId

6. **Adding new comments**: Render CommentForm at the bottom of the list. Pass a callback onCommentAdded that appends the new comment to the comments array (maintaining chronological ascending order).

**Important type handling**:
- **New comment**: CommentForm converts the Comment response to PopulatedComment using useAuth() before calling onCommentAdded. CommentList appends it directly.
- **Edited comment**: After updateComment succeeds, map over comments and for the matching _id, spread the existing comment then override body and updatedAt from the response. Do NOT replace the whole object (would lose populated author).

**Styling**: Use Tailwind classes consistent with the existing codebase. Each comment gets border-b border-gray-100 py-3. Author name: text-sm font-medium text-gray-900. Timestamp: text-xs text-gray-500. Body: text-sm text-gray-700. Action buttons: text-xs text-gray-500 hover:text-gray-700 for edit, text-xs text-red-500 hover:text-red-700 for delete.

---

### Deliverable 3: Modify packages/client/src/components/task-detail-panel.tsx

**Purpose**: Add a "Comments" section below the metadata (priority/due date) and above the delete section.

**Changes**:

1. **Add import** (after existing component imports, around line 9):
   import { CommentList } from "./comment-list";

2. **Insert Comments section** between the metadata grid closing div (line 362) and the delete error block {deleteError && ( (line 365):

   {/* Comments section */}
   <div className="mt-6">
     <h3 className="text-sm font-medium text-gray-700">Comments</h3>
     <CommentList taskId={taskId} />
   </div>

**Placement**: After the metadata grid div (className="mt-6 grid grid-cols-2 gap-4") and before the deleteError block. This positions comments below priority/due date and above the delete button.

**No other changes** to TaskDetailPanel. CommentList is self-contained.

---

## 4. Contracts

### CommentList Component

**Input (props)**:
- taskId: string — the MongoDB ObjectId of the task whose comments to display

**Behavior**:
- Fetches comments on mount via fetchComments(taskId)
- Displays loading state, then comment list (or "No comments yet." if empty)
- Each comment shows: author name, relative timestamp, body text, edit/delete controls
- Inline edit: Edit -> textarea -> Save/Cancel
- Delete: Delete -> ConfirmDialog -> removes on confirm
- Includes CommentForm at the bottom for adding new comments

### CommentForm Component

**Input (props)**:
- taskId: string — the task to add a comment to
- onCommentAdded: (comment: PopulatedComment) => void — callback invoked after successful creation

**Behavior**:
- Textarea input + "Comment" submit button
- On submit: calls createComment(taskId, body), converts response to PopulatedComment using current user from useAuth(), calls onCommentAdded, clears textarea
- Shows "Commenting..." while submitting, disables button when empty or submitting

### Server Response Shapes

**GET /api/tasks/:taskId/comments** returns PopulatedComment[]:

    {
      "data": [
        {
          "_id": "...",
          "body": "Comment text",
          "task": "...",
          "author": { "_id": "...", "name": "Admin", "email": "admin@taskboard.local" },
          "createdAt": "2024-06-01T10:30:00.000Z",
          "updatedAt": "2024-06-01T10:30:00.000Z"
        }
      ]
    }

**POST /api/tasks/:taskId/comments** returns Comment (unpopulated author):

    {
      "data": {
        "_id": "...",
        "body": "New comment",
        "task": "...",
        "author": "665f1a2b3c4d5e6f7a8b9c00",
        "createdAt": "2024-06-01T10:35:00.000Z",
        "updatedAt": "2024-06-01T10:35:00.000Z"
      }
    }

**PUT /api/comments/:id** returns Comment (unpopulated author):

    {
      "data": {
        "_id": "...",
        "body": "Updated text",
        "task": "...",
        "author": "665f1a2b3c4d5e6f7a8b9c00",
        "createdAt": "2024-06-01T10:35:00.000Z",
        "updatedAt": "2024-06-01T10:40:00.000Z"
      }
    }

**DELETE /api/comments/:id**:

    { "data": { "message": "Comment deleted" } }

---

## 5. Test Plan

No dedicated test files are specified in the task spec. Verification is through TypeScript compilation and manual interaction (see Section 7).

If tests were desired:
- **CommentList**: Mock fetchComments, render with React Testing Library, assert comments appear with author names and timestamps. Test edit flow: click edit, textarea appears, type, save, verify updateComment called. Test delete flow: click delete, confirm dialog, verify deleteComment called.
- **CommentForm**: Mock createComment and useAuth, render, type in textarea, click submit, verify API called and onCommentAdded invoked with a PopulatedComment.

---

## 6. Implementation Order

1. **Step 1**: Create packages/client/src/components/comment-form.tsx
   - Implement the CommentForm component
   - No dependency on CommentList, so can be created first

2. **Step 2**: Create packages/client/src/components/comment-list.tsx
   - Implement the CommentList component
   - Imports CommentForm (from Step 1)
   - Includes fetch logic, relative timestamps, inline edit, delete with ConfirmDialog

3. **Step 3**: Modify packages/client/src/components/task-detail-panel.tsx
   - Add import for CommentList
   - Insert the Comments section between the metadata grid and the delete error section

4. **Step 4**: Verify TypeScript compilation

---

## 7. Verification Commands

    # 1. Verify client package compiles with new components
    cd packages/client && npx tsc --noEmit

    # 2. If a root-level typecheck exists
    npm run typecheck 2>/dev/null || true

    # 3. Verify the dev server builds without errors
    cd packages/client && npx vite build

### Manual verification checklist (against running app)

1. Open a task detail panel -> "Comments" section heading visible below priority/due date
2. No comments -> "No comments yet." message shown
3. Type in textarea and click "Comment" -> comment appears with author name and "just now" timestamp
4. Click "Edit" -> textarea pre-filled -> modify -> "Save" -> body updates
5. Click "Cancel" during edit -> reverts to original text
6. Click "Delete" -> ConfirmDialog -> "Delete" -> comment removed
7. Click "Cancel" in delete dialog -> comment remains
