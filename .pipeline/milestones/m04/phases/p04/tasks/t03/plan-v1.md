Now I have all the context. Let me write the plan.

# Task 3 Plan: Labels API Client

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/api/labels.ts` | Created | API client functions for all label CRUD endpoints |

---

## 2. Dependencies

- **Existing `apiClient` utility** at `packages/client/src/api/client.ts` — provides `get`, `post`, `put`, `del` methods with automatic JWT auth headers and error handling
- **Existing shared types** at `packages/shared/src/types/index.ts` — `Label` (line 66-72) and `ApiSuccessResponse` (line 92-94) are both already defined and available via `@taskboard/shared`
- **Server endpoints** — all four label endpoints are implemented and operational (confirmed in `packages/server/src/routes/label.routes.ts`):
  - `GET /api/projects/:projectId/labels` — returns labels sorted by `createdAt` asc
  - `POST /api/projects/:projectId/labels` — requires `{ name: string; color: string }`, returns the new label (HTTP 201)
  - `PUT /api/labels/:id` — requires at least one of `{ name?: string; color?: string }`, returns the updated label
  - `DELETE /api/labels/:id` — removes the label from all tasks via `$pull`, deletes the label, returns `{ data: { message: "Label deleted" } }`

**No shared type modifications needed** — unlike Task 1, the `Label` interface already covers the server response shape exactly. Labels are not populated; they return flat fields (`_id`, `name`, `color`, `project`, `createdAt`).

---

## 3. Implementation Details

### Deliverable 1: `packages/client/src/api/labels.ts`

**Purpose**: API client module exporting four async functions for label CRUD operations.

**Exports**:
- `fetchLabels`
- `createLabel`
- `updateLabel`
- `deleteLabel`

**Imports**:
```typescript
import type { ApiSuccessResponse, Label } from "@taskboard/shared";
import { apiClient } from "./client";
```

**Function specifications**:

#### `fetchLabels(projectId: string): Promise<ApiSuccessResponse<Label[]>>`

- Calls `apiClient.get<ApiSuccessResponse<Label[]>>(`/api/projects/${projectId}/labels`)`
- Returns the response directly (array of labels sorted by `createdAt` ascending)
- The server validates that the project exists and belongs to the authenticated user

#### `createLabel(projectId: string, input: { name: string; color: string }): Promise<ApiSuccessResponse<Label>>`

- Calls `apiClient.post<ApiSuccessResponse<Label>>(`/api/projects/${projectId}/labels`, input)`
- The `input` parameter is an object with `name` and `color` fields, matching the server's validation (`isValidCreateLabelBody`)
- Uses an object parameter (not separate arguments) because both `name` and `color` are required together — this matches the server's expected request body shape directly
- Returns the newly created label

#### `updateLabel(labelId: string, input: { name?: string; color?: string }): Promise<ApiSuccessResponse<Label>>`

- Calls `apiClient.put<ApiSuccessResponse<Label>>(`/api/labels/${labelId}`, input)`
- The `input` parameter accepts optional `name` and/or `color` — at least one must be provided (server validates via `isValidUpdateLabelBody`)
- Returns the updated label with `{ new: true }` (the latest state)

#### `deleteLabel(labelId: string): Promise<ApiSuccessResponse<{ message: string }>>`

- Calls `apiClient.del<ApiSuccessResponse<{ message: string }>>(`/api/labels/${labelId}`)`
- The server removes the label ID from all tasks' `labels` arrays (via `$pull`) before deleting the label document
- Returns `{ data: { message: "Label deleted" } }`

**Pattern adherence**: This file follows the exact same pattern as:
- `packages/client/src/api/comments.ts` (Task 1) — same import structure, same `apiClient` usage, same return type wrapping
- `packages/client/src/api/projects.ts` — same structure for simple CRUD
- `packages/client/src/api/tasks.ts` — uses object `input` parameter for create/update, same pattern we follow here

**Full file content**:

```typescript
import type { ApiSuccessResponse, Label } from "@taskboard/shared";
import { apiClient } from "./client";

export async function fetchLabels(
  projectId: string,
): Promise<ApiSuccessResponse<Label[]>> {
  return apiClient.get<ApiSuccessResponse<Label[]>>(
    `/api/projects/${projectId}/labels`,
  );
}

export async function createLabel(
  projectId: string,
  input: { name: string; color: string },
): Promise<ApiSuccessResponse<Label>> {
  return apiClient.post<ApiSuccessResponse<Label>>(
    `/api/projects/${projectId}/labels`,
    input,
  );
}

export async function updateLabel(
  labelId: string,
  input: { name?: string; color?: string },
): Promise<ApiSuccessResponse<Label>> {
  return apiClient.put<ApiSuccessResponse<Label>>(
    `/api/labels/${labelId}`,
    input,
  );
}

export async function deleteLabel(
  labelId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/labels/${labelId}`,
  );
}
```

---

## 4. Contracts

### `fetchLabels`

**Input**: `projectId: string` (MongoDB ObjectId as string)

**Output** (from server):
```json
{
  "data": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "name": "Bug",
      "color": "#ef4444",
      "project": "665f1a2b3c4d5e6f7a8b9c01",
      "createdAt": "2024-06-01T10:30:00.000Z"
    },
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0e",
      "name": "Feature",
      "color": "#3b82f6",
      "project": "665f1a2b3c4d5e6f7a8b9c01",
      "createdAt": "2024-06-01T10:31:00.000Z"
    }
  ]
}
```

### `createLabel`

**Input**: `projectId: string`, `input: { name: "Enhancement", color: "#10b981" }`

**Output** (from server, HTTP 201):
```json
{
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0f",
    "name": "Enhancement",
    "color": "#10b981",
    "project": "665f1a2b3c4d5e6f7a8b9c01",
    "createdAt": "2024-06-01T10:35:00.000Z"
  }
}
```

### `updateLabel`

**Input**: `labelId: string`, `input: { name: "Critical Bug", color: "#dc2626" }`

**Output** (from server):
```json
{
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "name": "Critical Bug",
    "color": "#dc2626",
    "project": "665f1a2b3c4d5e6f7a8b9c01",
    "createdAt": "2024-06-01T10:30:00.000Z"
  }
}
```

Note: The server uses `findOneAndUpdate` with `{ new: true }`, so the response reflects the updated state.

### `deleteLabel`

**Input**: `labelId: string`

**Output** (from server):
```json
{
  "data": {
    "message": "Label deleted"
  }
}
```

Note: Before deletion, the server runs `TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })` to remove the label from all tasks.

---

## 5. Test Plan

No dedicated test files are required by the task spec. Verification is through TypeScript compilation and export checking (see Section 7).

The task spec explicitly states: "TypeScript compilation passes with no errors" and "Functions match the endpoint contracts" — compilation is the verification gate.

---

## 6. Implementation Order

1. **Step 1**: Create `packages/client/src/api/labels.ts`
   - Write the full file with all four exported functions
   - Import `Label` and `ApiSuccessResponse` from `@taskboard/shared`
   - Import `apiClient` from `./client`

2. **Step 2**: Verify TypeScript compilation

This is a single-step task (one file to create). No shared type modifications are needed since `Label` already exists.

---

## 7. Verification Commands

```bash
# 1. Build the shared package first (labels.ts imports from @taskboard/shared)
npm run build --workspace=@taskboard/shared

# 2. Verify client package compiles with the new labels.ts module
cd packages/client && npx tsc --noEmit

# 3. Verify the exports exist by checking with grep
grep -n "export async function" packages/client/src/api/labels.ts
# Expected: 4 exported functions (fetchLabels, createLabel, updateLabel, deleteLabel)
```