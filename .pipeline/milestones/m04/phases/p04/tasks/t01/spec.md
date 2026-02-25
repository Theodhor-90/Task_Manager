# Task 1: Comments API Client

## Objective

Create the API client module for all comment endpoints, following the established `apiClient` pattern, and add a `PopulatedComment` shared type.

## Deliverables

1. **New file: `packages/client/src/api/comments.ts`** with the following functions:
   - `fetchComments(taskId: string): Promise<ApiSuccessResponse<PopulatedComment[]>>` — calls `GET /api/tasks/:taskId/comments`
   - `createComment(taskId: string, body: string): Promise<ApiSuccessResponse<Comment>>` — calls `POST /api/tasks/:taskId/comments` with `{ body }`
   - `updateComment(commentId: string, body: string): Promise<ApiSuccessResponse<Comment>>` — calls `PUT /api/comments/:commentId` with `{ body }`
   - `deleteComment(commentId: string): Promise<ApiSuccessResponse<{ message: string }>>` — calls `DELETE /api/comments/:commentId`

2. **Modified file: `packages/shared/src/types/index.ts`** — add a `PopulatedComment` interface identical to `Comment` but with `author` typed as `{ _id: string; name: string; email: string }` instead of `string`.

## Implementation Details

- Follow the existing API client pattern used in `packages/client/src/api/client.ts` (e.g., how `apiClient` wraps fetch with auth headers and base URL).
- Import and use `ApiSuccessResponse`, `Comment` from `@taskboard/shared`.
- All functions should use the `apiClient` utility for making HTTP requests.

## Dependencies

- None within this phase (this is the first task).
- Requires the existing `apiClient` utility in `packages/client/src/api/client.ts`.
- Requires `Comment` type in `packages/shared/src/types/index.ts`.
- Server endpoints `GET /api/tasks/:taskId/comments`, `POST /api/tasks/:taskId/comments`, `PUT /api/comments/:id`, `DELETE /api/comments/:id` must be operational (Milestone 2).

## Verification

- `packages/client/src/api/comments.ts` exports all four functions.
- `PopulatedComment` is exported from `packages/shared/src/types/index.ts`.
- TypeScript compilation passes with no errors.
- Functions match the endpoint contracts defined in the Master Plan (Section 5.6).