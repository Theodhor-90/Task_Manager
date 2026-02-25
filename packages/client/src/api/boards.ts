import type { ApiSuccessResponse, Board, Column, Task } from "@taskboard/shared";
import { apiClient } from "./client";

export async function fetchBoard(
  projectId: string,
): Promise<ApiSuccessResponse<Board>> {
  return apiClient.get<ApiSuccessResponse<Board>>(
    `/api/projects/${projectId}/board`,
  );
}

export async function fetchBoardTasks(
  boardId: string,
): Promise<ApiSuccessResponse<Task[]>> {
  return apiClient.get<ApiSuccessResponse<Task[]>>(
    `/api/boards/${boardId}/tasks`,
  );
}

export async function addColumn(
  boardId: string,
  name: string,
): Promise<ApiSuccessResponse<Column>> {
  return apiClient.post<ApiSuccessResponse<Column>>(
    `/api/boards/${boardId}/columns`,
    { name },
  );
}

export async function renameColumn(
  boardId: string,
  columnId: string,
  name: string,
): Promise<ApiSuccessResponse<Column>> {
  return apiClient.put<ApiSuccessResponse<Column>>(
    `/api/boards/${boardId}/columns/${columnId}`,
    { name },
  );
}

export async function deleteColumn(
  boardId: string,
  columnId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/boards/${boardId}/columns/${columnId}`,
  );
}

export async function reorderColumns(
  boardId: string,
  columnIds: string[],
): Promise<ApiSuccessResponse<Board>> {
  return apiClient.put<ApiSuccessResponse<Board>>(
    `/api/boards/${boardId}/columns/reorder`,
    { columnIds },
  );
}
