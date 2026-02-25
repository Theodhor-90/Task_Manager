# Task 3: Labels API Client

## Objective

Create the API client module for all label endpoints, following the established `apiClient` pattern.

## Deliverables

1. **New file: `packages/client/src/api/labels.ts`** with the following functions:
   - `fetchLabels(projectId: string): Promise<ApiSuccessResponse<Label[]>>` — calls `GET /api/projects/:projectId/labels`
   - `createLabel(projectId: string, input: { name: string; color: string }): Promise<ApiSuccessResponse<Label>>` — calls `POST /api/projects/:projectId/labels`
   - `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<ApiSuccessResponse<Label>>` — calls `PUT /api/labels/:labelId`
   - `deleteLabel(labelId: string): Promise<ApiSuccessResponse<{ message: string }>>` — calls `DELETE /api/labels/:labelId`

## Implementation Details

- Follow the same pattern used in `packages/client/src/api/client.ts` and the existing API modules (e.g., `tasks.ts`, `boards.ts`).
- Import and use `ApiSuccessResponse`, `Label` from `@taskboard/shared`.
- All functions should use the `apiClient` utility for making HTTP requests.

## Dependencies

- None within this phase (can be done in parallel with Tasks 1–2).
- Requires the existing `apiClient` utility in `packages/client/src/api/client.ts`.
- Requires `Label` type in `packages/shared/src/types/index.ts`.
- Server endpoints `GET /api/projects/:projectId/labels`, `POST /api/projects/:projectId/labels`, `PUT /api/labels/:id`, `DELETE /api/labels/:id` must be operational (Milestone 2).

## Verification

- `packages/client/src/api/labels.ts` exports all four functions.
- TypeScript compilation passes with no errors.
- Functions match the endpoint contracts defined in the Master Plan (Section 5.7).