import type { LoginResponse, ApiSuccessResponse } from "@taskboard/shared";
import { apiClient } from "./client";

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>("/api/auth/login", { email, password });
}

export async function getMe(): Promise<
  ApiSuccessResponse<{ id: string; email: string; name: string }>
> {
  return apiClient.get("/api/auth/me");
}
