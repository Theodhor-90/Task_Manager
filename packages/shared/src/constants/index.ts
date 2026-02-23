import type { Priority } from "../types/index.js";

export const PRIORITIES: readonly Priority[] = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const DEFAULT_COLUMNS: readonly string[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
] as const;
