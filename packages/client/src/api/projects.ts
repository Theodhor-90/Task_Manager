import type { ApiSuccessResponse, Project } from "@taskboard/shared";
import { apiClient } from "./client";

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export async function fetchProjects(): Promise<ApiSuccessResponse<Project[]>> {
  return apiClient.get<ApiSuccessResponse<Project[]>>("/api/projects");
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ApiSuccessResponse<Project>> {
  return apiClient.post<ApiSuccessResponse<Project>>("/api/projects", input);
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<ApiSuccessResponse<Project>> {
  return apiClient.put<ApiSuccessResponse<Project>>(`/api/projects/${id}`, input);
}

export async function deleteProject(
  id: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(`/api/projects/${id}`);
}
