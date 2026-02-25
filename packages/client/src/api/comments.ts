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
