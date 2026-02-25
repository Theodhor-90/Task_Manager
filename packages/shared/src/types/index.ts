export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  _id: string;
  project: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  _id: string;
  name: string;
  position: number;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: Priority;
  position: number;
  dueDate?: string;
  labels: string[];
  board: string;
  project: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  body: string;
  task: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedComment {
  _id: string;
  body: string;
  task: string;
  author: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  _id: string;
  name: string;
  color: string;
  project: string;
  createdAt: string;
}

export type Priority = "low" | "medium" | "high" | "urgent";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

export interface ApiErrorResponse {
  error: string;
}
