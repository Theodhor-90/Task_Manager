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
