Now I have all the information needed. Let me produce the implementation plan.

# Task 1 Plan: Comments API Client

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/shared/src/types/index.ts` | Modified | Add `PopulatedComment` interface |
| 2 | `packages/client/src/api/comments.ts` | Created | API client functions for all comment CRUD endpoints |

---

## 2. Dependencies

- **Existing `apiClient` utility** at `packages/client/src/api/client.ts` — provides `get`, `post`, `put`, `del` methods with automatic JWT auth headers and error handling
- **Existing shared types** at `packages/shared/src/types/index.ts` — `Comment`, `ApiSuccessResponse` must be available (confirmed present)
- **Server endpoints** — all four comment endpoints are implemented and operational (confirmed in `packages/server/src/routes/comment.routes.ts`):
  - `GET /api/tasks/:taskId/comments` — returns comments sorted by `createdAt` asc, with `author` populated as `{ _id, name, email }`
  - `POST /api/tasks/:taskId/comments` — returns the new comment with `author` as a raw ObjectId string (NOT populated)
  - `PUT /api/comments/:id` — returns the updated comment with `author` as a raw ObjectId string (NOT populated)
  - `DELETE /api/comments/:id` — returns `{ data: { message: "Comment deleted" } }`

---

## 3. Implementation Details

### Deliverable 1: `PopulatedComment` in `packages/shared/src/types/index.ts`

**Purpose**: Provide a type for comment objects returned by `GET /api/tasks/:taskId/comments`, where the `author` field is populated with user details instead of being a plain ID string.

**What to add**: Insert a new exported interface after the existing `Comment` interface (currently at approximately line 53-60).

**Interface definition**:

```typescript
export interface PopulatedComment {
  _id: string;
  body: string;
  task: string;
  author: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}
```

**Notes**:
- This is identical to `Comment` except `author` is an object instead of `string`.
- Uses an inline object type for `author` rather than referencing a separate `PopulatedAuthor` type — keeps it simple and avoids unnecessary abstractions.
- Do NOT modify the existing `Comment` interface; both types are needed (the POST/PUT endpoints return `Comment` with `author: string`).

**Placement**: Add immediately after the existing `Comment` interface (after line 60), before the `Label` interface.

---

### Deliverable 2: `packages/client/src/api/comments.ts`

**Purpose**: API client module exporting four async functions for comment CRUD operations.

**Exports**:
- `fetchComments`
- `createComment`
- `updateComment`
- `deleteComment`

**Imports**:
```typescript
import type { ApiSuccessResponse, Comment, PopulatedComment } from "@taskboard/shared";
import { apiClient } from "./client";
```

**Function specifications**:

#### `fetchComments(taskId: string): Promise<ApiSuccessResponse<PopulatedComment[]>>`

- Calls `apiClient.get<ApiSuccessResponse<PopulatedComment[]>>(`/api/tasks/${taskId}/comments`)`
- Returns the response directly (array of comments with populated authors)
- Uses `PopulatedComment` because the server populates the `author` field with `{ _id, name, email }` via `.populate("author", "name email")`

#### `createComment(taskId: string, body: string): Promise<ApiSuccessResponse<Comment>>`

- Calls `apiClient.post<ApiSuccessResponse<Comment>>(`/api/tasks/${taskId}/comments`, { body })`
- Returns `Comment` (not `PopulatedComment`) because the server's POST handler does NOT populate the author field — it returns the raw document with `author` as an ObjectId string
- The calling component (Task 2's `CommentForm`) will need to handle this by using the current user's details from `useAuth()` to display the new comment without a refetch

#### `updateComment(commentId: string, body: string): Promise<ApiSuccessResponse<Comment>>`

- Calls `apiClient.put<ApiSuccessResponse<Comment>>(`/api/comments/${commentId}`, { body })`
- Returns `Comment` (not `PopulatedComment`) because the server's PUT handler does NOT populate the author field

#### `deleteComment(commentId: string): Promise<ApiSuccessResponse<{ message: string }>>`

- Calls `apiClient.del<ApiSuccessResponse<{ message: string }>>(`/api/comments/${commentId}`)`
- Returns the deletion confirmation message

**Pattern adherence**: This file follows the exact same pattern as:
- `packages/client/src/api/projects.ts` — same import structure, same `apiClient` usage, same return type wrapping
- `packages/client/src/api/tasks.ts` — same structure for CRUD with path params
- `packages/client/src/api/boards.ts` — same pattern for nested resource endpoints

**Full file content**:

```typescript
import type { ApiSuccessResponse, Comment, PopulatedComment } from "@taskboard/shared";
import { apiClient } from "./client";

export async function fetchComments(
  taskId: string,
): Promise<ApiSuccessResponse<PopulatedComment[]>> {
  return apiClient.get<ApiSuccessResponse<PopulatedComment[]>>(
    `/api/tasks/${taskId}/comments`,
  );
}

export async function createComment(
  taskId: string,
  body: string,
): Promise<ApiSuccessResponse<Comment>> {
  return apiClient.post<ApiSuccessResponse<Comment>>(
    `/api/tasks/${taskId}/comments`,
    { body },
  );
}

export async function updateComment(
  commentId: string,
  body: string,
): Promise<ApiSuccessResponse<Comment>> {
  return apiClient.put<ApiSuccessResponse<Comment>>(
    `/api/comments/${commentId}`,
    { body },
  );
}

export async function deleteComment(
  commentId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/comments/${commentId}`,
  );
}
```

---

## 4. Contracts

### `fetchComments`

**Input**: `taskId: string` (MongoDB ObjectId as string)

**Output** (from server):
```json
{
  "data": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "body": "This looks good, just one minor issue...",
      "task": "665f1a2b3c4d5e6f7a8b9c01",
      "author": {
        "_id": "665f1a2b3c4d5e6f7a8b9c00",
        "name": "Admin",
        "email": "admin@taskboard.local"
      },
      "createdAt": "2024-06-01T10:30:00.000Z",
      "updatedAt": "2024-06-01T10:30:00.000Z"
    }
  ]
}
```

### `createComment`

**Input**: `taskId: string`, `body: string`

**Output** (from server):
```json
{
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0e",
    "body": "Agreed, let me fix that.",
    "task": "665f1a2b3c4d5e6f7a8b9c01",
    "author": "665f1a2b3c4d5e6f7a8b9c00",
    "createdAt": "2024-06-01T10:35:00.000Z",
    "updatedAt": "2024-06-01T10:35:00.000Z"
  }
}
```

Note: `author` is a string (ObjectId), not a populated object.

### `updateComment`

**Input**: `commentId: string`, `body: string`

**Output** (from server):
```json
{
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0e",
    "body": "Updated comment text.",
    "task": "665f1a2b3c4d5e6f7a8b9c01",
    "author": "665f1a2b3c4d5e6f7a8b9c00",
    "createdAt": "2024-06-01T10:35:00.000Z",
    "updatedAt": "2024-06-01T10:40:00.000Z"
  }
}
```

### `deleteComment`

**Input**: `commentId: string`

**Output** (from server):
```json
{
  "data": {
    "message": "Comment deleted"
  }
}
```

---

## 5. Test Plan

No dedicated test files are required by the task spec. Verification is through TypeScript compilation and export checking (see Section 7).

If tests were desired, the appropriate approach would be mocking `apiClient` and asserting correct URLs/bodies, but the task spec explicitly limits scope to creating the module and type — compilation is the verification gate.

---

## 6. Implementation Order

1. **Step 1**: Add `PopulatedComment` interface to `packages/shared/src/types/index.ts`
   - Insert after the existing `Comment` interface (after line ~60)
   - Ensure the export is accessible from `@taskboard/shared`

2. **Step 2**: Create `packages/client/src/api/comments.ts`
   - Write the full file with all four exported functions
   - Import `Comment`, `PopulatedComment`, and `ApiSuccessResponse` from `@taskboard/shared`
   - Import `apiClient` from `./client`

3. **Step 3**: Verify TypeScript compilation

---

## 7. Verification Commands

```bash
# 1. Verify shared package compiles with the new PopulatedComment type
cd packages/shared && npx tsc --noEmit

# 2. Verify client package compiles with the new comments.ts module
cd packages/client && npx tsc --noEmit

# 3. Verify the exports are correct by checking the built output
# (Alternative: run from the root)
npm run build --workspace=packages/shared
npm run build --workspace=packages/client
```

If the project uses a root-level typecheck script:
```bash
npm run typecheck
```