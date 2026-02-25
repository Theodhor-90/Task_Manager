import type { ApiSuccessResponse, Priority, Task } from "@taskboard/shared";
import { apiClient } from "./client";

export interface CreateTaskInput {
  title: string;
  status?: string;
  priority?: Priority;
  description?: string;
  dueDate?: string;
  labels?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
}

export interface MoveTaskInput {
  status?: string;
  position: number;
}

export async function fetchTask(
  taskId: string,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.get<ApiSuccessResponse<Task>>(`/api/tasks/${taskId}`);
}

export async function createTask(
  boardId: string,
  input: CreateTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.post<ApiSuccessResponse<Task>>(
    `/api/boards/${boardId}/tasks`,
    input,
  );
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.put<ApiSuccessResponse<Task>>(
    `/api/tasks/${taskId}`,
    input,
  );
}

export async function deleteTask(
  taskId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/tasks/${taskId}`,
  );
}

export async function moveTask(
  taskId: string,
  body: MoveTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.put<ApiSuccessResponse<Task>>(
    `/api/tasks/${taskId}/move`,
    body,
  );
}
