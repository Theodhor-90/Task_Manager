import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import {
  UserModel,
  hashPassword,
  TaskModel,
  CommentModel,
  LabelModel,
} from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";

type HttpMethod = "get" | "post" | "put" | "delete";

function normalizeId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value?: unknown }).value === "string"
  ) {
    return (value as { value: string }).value;
  }

  return String(value);
}

async function canBindTcpPort(): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.listen(0, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

describe("task routes", () => {
  let app: FastifyInstance;
  let useSupertest = true;
  let token = "";

  async function seedAdminUser(): Promise<void> {
    const passwordHash = await hashPassword("admin123");
    await UserModel.create({
      email: "admin@taskboard.local",
      name: "Admin",
      passwordHash,
    });
  }

  async function getAuthToken(): Promise<string> {
    const response = await httpRequest({
      method: "post",
      path: "/api/auth/login",
      expectedStatus: 200,
      payload: { email: "admin@taskboard.local", password: "admin123" },
    });
    const body = response.body as {
      data: { token: string };
    };

    return body.data.token;
  }

  async function httpRequest(options: {
    method: HttpMethod;
    path: string;
    expectedStatus: number;
    payload?: Record<string, unknown>;
    headers?: Record<string, string>;
  }): Promise<{ body: unknown }> {
    const { method, path, expectedStatus, payload, headers } = options;

    if (useSupertest) {
      let chain = request(app.server)[method](path).expect(expectedStatus);

      if (headers) {
        for (const [name, value] of Object.entries(headers)) {
          chain = chain.set(name, value);
        }
      }
      if (payload !== undefined) {
        chain = chain.send(payload);
      }

      const response = await chain.expect("content-type", /json/);
      return { body: response.body };
    }

    const response = await app.inject({
      method: method.toUpperCase(),
      url: path,
      headers,
      payload,
    });

    expect(response.statusCode).toBe(expectedStatus);
    expect(response.headers["content-type"]).toMatch(/json/);
    return { body: JSON.parse(response.body) };
  }

  async function createProject(name: string): Promise<{ projectId: string; boardId: string }> {
    const createResponse = await httpRequest({
      method: "post",
      path: "/api/projects",
      expectedStatus: 201,
      payload: { name },
      headers: { authorization: `Bearer ${token}` },
    });
    const createBody = createResponse.body as {
      data: { _id: unknown };
    };
    const projectId = normalizeId(createBody.data._id);

    const boardResponse = await httpRequest({
      method: "get",
      path: `/api/projects/${projectId}/board`,
      expectedStatus: 200,
      headers: { authorization: `Bearer ${token}` },
    });
    const boardBody = boardResponse.body as {
      data: { _id: unknown };
    };

    return {
      projectId,
      boardId: normalizeId(boardBody.data._id),
    };
  }

  async function createTask(
    boardId: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await httpRequest({
      method: "post",
      path: `/api/boards/${boardId}/tasks`,
      expectedStatus: 201,
      payload: body,
      headers: { authorization: `Bearer ${token}` },
    });
    const responseBody = response.body as { data: Record<string, unknown> };
    return responseBody.data;
  }

  async function getTasks(
    boardId: string,
    query?: string,
  ): Promise<Record<string, unknown>[]> {
    const path = query
      ? `/api/boards/${boardId}/tasks?${query}`
      : `/api/boards/${boardId}/tasks`;
    const response = await httpRequest({
      method: "get",
      path,
      expectedStatus: 200,
      headers: { authorization: `Bearer ${token}` },
    });
    const responseBody = response.body as { data: Record<string, unknown>[] };
    return responseBody.data;
  }

  beforeAll(async () => {
    await setupTestDb();
    app = await buildApp();
    await app.ready();
    useSupertest = await canBindTcpPort();
  });

  beforeEach(async () => {
    await clearCollections();
    await seedAdminUser();
    token = await getAuthToken();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  describe("POST /api/boards/:boardId/tasks", () => {
    it("creates a task with title only, verifying defaults", async () => {
      const { projectId, boardId } = await createProject("Task Defaults");

      const created = await createTask(boardId, { title: "My Task" });

      expect(created.title).toBe("My Task");
      expect(created.status).toBe("To Do");
      expect(created.priority).toBe("medium");
      expect(created.position).toBe(0);
      expect(normalizeId(created.board)).toBe(boardId);
      expect(normalizeId(created.project)).toBe(projectId);
      expect(created._id).toBeDefined();
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it("creates a task with all fields", async () => {
      const { projectId, boardId } = await createProject("Task Full");
      const label = await LabelModel.create({
        name: "Bug",
        color: "#ef4444",
        project: projectId,
      });
      const labelId = normalizeId(label._id);

      const created = await createTask(boardId, {
        title: "Full Task",
        description: "desc",
        priority: "high",
        dueDate: "2026-03-15",
        labels: [labelId],
        status: "In Progress",
      });

      expect(created.title).toBe("Full Task");
      expect(created.description).toBe("desc");
      expect(created.priority).toBe("high");
      expect(String(created.dueDate)).toContain("2026-03-15");
      expect(created.labels).toEqual([labelId]);
      expect(created.status).toBe("In Progress");
      expect(created.position).toBe(0);
    });

    it("second task in same column gets position 1", async () => {
      const { boardId } = await createProject("Task Position Same");
      await createTask(boardId, { title: "Task 1" });

      const created = await createTask(boardId, { title: "Task 2" });

      expect(created.position).toBe(1);
    });

    it("task in different column gets position 0", async () => {
      const { boardId } = await createProject("Task Position Column");
      await createTask(boardId, { title: "Task 1" });

      const created = await createTask(boardId, {
        title: "Other",
        status: "In Progress",
      });

      expect(created.status).toBe("In Progress");
      expect(created.position).toBe(0);
    });

    it("returns 400 when title is missing", async () => {
      const { boardId } = await createProject("Task Missing Title");

      const response = await httpRequest({
        method: "post",
        path: `/api/boards/${boardId}/tasks`,
        expectedStatus: 400,
        payload: { description: "no title" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Title is required");
    });

    it("returns 400 when title is empty string", async () => {
      const { boardId } = await createProject("Task Empty Title");

      await httpRequest({
        method: "post",
        path: `/api/boards/${boardId}/tasks`,
        expectedStatus: 400,
        payload: { title: "" },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 400 when status doesn't match any column name", async () => {
      const { boardId } = await createProject("Task Invalid Status");

      const response = await httpRequest({
        method: "post",
        path: `/api/boards/${boardId}/tasks`,
        expectedStatus: 400,
        payload: { title: "X", status: "Nonexistent" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Invalid status");
    });

    it("returns 404 for non-existent board ID", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/tasks",
        expectedStatus: 404,
        payload: { title: "X" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Board not found");
    });

    it("returns 400 for invalid board ID format", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/boards/not-valid/tasks",
        expectedStatus: 400,
        payload: { title: "X" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid board ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/tasks",
        expectedStatus: 401,
        payload: { title: "X" },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/boards/:boardId/tasks", () => {
    it("returns all tasks for a board", async () => {
      const { boardId } = await createProject("Task List All");
      await createTask(boardId, { title: "Task 1" });
      await createTask(boardId, { title: "Task 2" });
      await createTask(boardId, { title: "Task 3" });

      const tasks = await getTasks(boardId);

      expect(tasks).toHaveLength(3);
    });

    it("returns tasks sorted by position ascending by default", async () => {
      const { boardId } = await createProject("Task List Position");
      await createTask(boardId, { title: "Task 1" });
      await createTask(boardId, { title: "Task 2" });
      await createTask(boardId, { title: "Task 3" });

      const tasks = await getTasks(boardId);

      expect(tasks[0].position).toBe(0);
      expect(tasks[1].position).toBe(1);
      expect(tasks[2].position).toBe(2);
    });

    it("filters by status", async () => {
      const { boardId } = await createProject("Task Filter Status");
      await createTask(boardId, { title: "Task 1" });
      await createTask(boardId, { title: "Task 2", status: "In Progress" });

      const tasks = await getTasks(boardId, "status=To+Do");

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe("To Do");
    });

    it("filters by priority", async () => {
      const { boardId } = await createProject("Task Filter Priority");
      await createTask(boardId, { title: "Task 1", priority: "high" });
      await createTask(boardId, { title: "Task 2", priority: "low" });

      const tasks = await getTasks(boardId, "priority=high");

      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe("high");
    });

    it("filters by label", async () => {
      const { projectId, boardId } = await createProject("Task Filter Label");
      const label = await LabelModel.create({
        name: "Bug",
        color: "#ef4444",
        project: projectId,
      });
      const labelId = normalizeId(label._id);

      await createTask(boardId, { title: "Task with label", labels: [labelId] });
      await createTask(boardId, { title: "Task without label" });

      const tasks = await getTasks(boardId, `label=${labelId}`);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].labels).toEqual(expect.arrayContaining([labelId]));
    });

    it("sorts by createdAt ascending", async () => {
      const { boardId } = await createProject("Task Sort Created Asc");
      const first = await createTask(boardId, { title: "Task 1" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = await createTask(boardId, { title: "Task 2" });

      const tasks = await getTasks(boardId, "sort=createdAt&order=asc");

      expect(tasks).toHaveLength(2);
      expect(normalizeId(tasks[0]._id)).toBe(normalizeId(first._id));
      expect(normalizeId(tasks[1]._id)).toBe(normalizeId(second._id));
    });

    it("sorts by createdAt descending", async () => {
      const { boardId } = await createProject("Task Sort Created Desc");
      const first = await createTask(boardId, { title: "Task 1" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = await createTask(boardId, { title: "Task 2" });

      const tasks = await getTasks(boardId, "sort=createdAt&order=desc");

      expect(tasks).toHaveLength(2);
      expect(normalizeId(tasks[0]._id)).toBe(normalizeId(second._id));
      expect(normalizeId(tasks[1]._id)).toBe(normalizeId(first._id));
    });

    it("sorts by dueDate ascending", async () => {
      const { boardId } = await createProject("Task Sort Due Asc");
      await createTask(boardId, { title: "Task 1", dueDate: "2026-04-01" });
      await createTask(boardId, { title: "Task 2", dueDate: "2026-03-01" });

      const tasks = await getTasks(boardId, "sort=dueDate&order=asc");

      expect(String(tasks[0].dueDate)).toContain("2026-03-01");
      expect(String(tasks[1].dueDate)).toContain("2026-04-01");
    });

    it("sorts by dueDate descending", async () => {
      const { boardId } = await createProject("Task Sort Due Desc");
      await createTask(boardId, { title: "Task 1", dueDate: "2026-04-01" });
      await createTask(boardId, { title: "Task 2", dueDate: "2026-03-01" });

      const tasks = await getTasks(boardId, "sort=dueDate&order=desc");

      expect(String(tasks[0].dueDate)).toContain("2026-04-01");
      expect(String(tasks[1].dueDate)).toContain("2026-03-01");
    });

    it("combines filter and sort", async () => {
      const { boardId } = await createProject("Task Filter Sort");
      await createTask(boardId, { title: "In Progress", status: "In Progress" });
      const firstTodo = await createTask(boardId, { title: "To Do 1", status: "To Do" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const secondTodo = await createTask(boardId, { title: "To Do 2", status: "To Do" });

      const tasks = await getTasks(boardId, "status=To+Do&sort=createdAt&order=desc");

      expect(tasks).toHaveLength(2);
      expect(normalizeId(tasks[0]._id)).toBe(normalizeId(secondTodo._id));
      expect(normalizeId(tasks[1]._id)).toBe(normalizeId(firstTodo._id));
      expect(tasks.every((task) => task.status === "To Do")).toBe(true);
    });

    it("returns empty array for board with no tasks", async () => {
      const { boardId } = await createProject("Task Empty");

      const tasks = await getTasks(boardId);

      expect(tasks).toEqual([]);
    });

    it("returns 404 for non-existent board", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/tasks",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Board not found");
    });

    it("returns 400 for invalid board ID format", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/boards/not-valid/tasks",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid board ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/tasks",
        expectedStatus: 401,
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("returns task with populated labels", async () => {
      const { projectId, boardId } = await createProject("Task Get Label");
      const label = await LabelModel.create({
        name: "Bug",
        color: "#ef4444",
        project: projectId,
      });
      const labelId = normalizeId(label._id);
      const task = await createTask(boardId, { title: "Task", labels: [labelId] });

      const response = await httpRequest({
        method: "get",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: { labels: Array<{ _id: unknown; name: string; color: string }> };
      };

      expect(body.data.labels).toHaveLength(1);
      expect(body.data.labels[0]._id).toBeDefined();
      expect(body.data.labels[0].name).toBe("Bug");
      expect(body.data.labels[0].color).toBe("#ef4444");
    });

    it("returns task with empty labels array", async () => {
      const { boardId } = await createProject("Task Get Empty Labels");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "get",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { labels: unknown[] } };

      expect(body.data.labels).toEqual([]);
    });

    it("returns 404 for non-existent task ID", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Task not found");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/tasks/not-valid",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid task ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("updates title", async () => {
      const { boardId } = await createProject("Task Update Title");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { title: "Updated" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { title: string } };

      expect(body.data.title).toBe("Updated");
    });

    it("updates description", async () => {
      const { boardId } = await createProject("Task Update Desc");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { description: "New desc" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { description: string } };

      expect(body.data.description).toBe("New desc");
    });

    it("updates priority", async () => {
      const { boardId } = await createProject("Task Update Priority");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { priority: "high" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { priority: string } };

      expect(body.data.priority).toBe("high");
    });

    it("updates dueDate", async () => {
      const { boardId } = await createProject("Task Update Due");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { dueDate: "2026-04-01" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { dueDate: string | null } };

      expect(String(body.data.dueDate)).toContain("2026-04-01");
    });

    it("clears dueDate with null", async () => {
      const { boardId } = await createProject("Task Clear Due");
      const task = await createTask(boardId, { title: "Task", dueDate: "2026-04-01" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { dueDate: null },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { dueDate: string | null } };

      expect(body.data.dueDate).toBeNull();
    });

    it("updates labels array", async () => {
      const { projectId, boardId } = await createProject("Task Update Labels");
      const label = await LabelModel.create({
        name: "Bug",
        color: "#ef4444",
        project: projectId,
      });
      const labelId = normalizeId(label._id);
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { labels: [labelId] },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { labels: string[] } };

      expect(body.data.labels).toEqual(expect.arrayContaining([labelId]));
    });

    it("updates multiple fields at once", async () => {
      const { boardId } = await createProject("Task Update Multi");
      const task = await createTask(boardId, { title: "Task", priority: "medium" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        payload: { title: "New", priority: "low" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { title: string; priority: string } };

      expect(body.data.title).toBe("New");
      expect(body.data.priority).toBe("low");
    });

    it("returns 400 when no valid fields provided", async () => {
      const { boardId } = await createProject("Task Update Empty");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 400,
        payload: {},
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("At least one valid field");
    });

    it("returns 400 for invalid priority", async () => {
      const { boardId } = await createProject("Task Update Invalid Priority");
      const task = await createTask(boardId, { title: "Task" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 400,
        payload: { priority: "critical" },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 400 for empty title", async () => {
      const { boardId } = await createProject("Task Update Empty Title");
      const task = await createTask(boardId, { title: "Task" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 400,
        payload: { title: "" },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 404 for non-existent task", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        payload: { title: "X" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Task not found");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/tasks/not-valid",
        expectedStatus: 400,
        payload: { title: "X" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid task ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
        payload: { title: "X" },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("deletes task and returns success message", async () => {
      const { boardId } = await createProject("Task Delete Message");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "delete",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { message: string } };

      expect(body.data.message).toBe("Task deleted");
    });

    it("cascade deletes associated comments", async () => {
      const { boardId } = await createProject("Task Delete Cascade");
      const task = await createTask(boardId, { title: "Task" });
      const admin = await UserModel.findOne({ email: "admin@taskboard.local" });

      await CommentModel.create({
        body: "test",
        task: normalizeId(task._id),
        author: admin?._id,
      });

      await httpRequest({
        method: "delete",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });

      const count = await CommentModel.countDocuments({ task: normalizeId(task._id) });
      expect(count).toBe(0);
    });

    it("reindexes positions of remaining tasks", async () => {
      const { boardId } = await createProject("Task Delete Reindex Middle");
      const first = await createTask(boardId, { title: "Task 1" });
      const second = await createTask(boardId, { title: "Task 2" });
      const third = await createTask(boardId, { title: "Task 3" });

      expect(first.position).toBe(0);
      expect(second.position).toBe(1);
      expect(third.position).toBe(2);

      await httpRequest({
        method: "delete",
        path: `/api/tasks/${normalizeId(second._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });

      const remaining = await getTasks(boardId, "status=To+Do");
      const positions = remaining
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1]);
    });

    it("delete first task reindexes correctly", async () => {
      const { boardId } = await createProject("Task Delete Reindex First");
      const first = await createTask(boardId, { title: "Task 1" });
      await createTask(boardId, { title: "Task 2" });
      await createTask(boardId, { title: "Task 3" });

      await httpRequest({
        method: "delete",
        path: `/api/tasks/${normalizeId(first._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });

      const remaining = await getTasks(boardId, "status=To+Do");
      const positions = remaining
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1]);
    });

    it("delete last task leaves others unchanged", async () => {
      const { boardId } = await createProject("Task Delete Reindex Last");
      await createTask(boardId, { title: "Task 1" });
      await createTask(boardId, { title: "Task 2" });
      const third = await createTask(boardId, { title: "Task 3" });

      await httpRequest({
        method: "delete",
        path: `/api/tasks/${normalizeId(third._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });

      const remaining = await getTasks(boardId, "status=To+Do");
      const positions = remaining
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1]);
    });

    it("delete only task in column", async () => {
      const { boardId } = await createProject("Task Delete Single");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "delete",
        path: `/api/tasks/${normalizeId(task._id)}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { message: string } };

      expect(body.data.message).toBe("Task deleted");
      expect(await getTasks(boardId, "status=To+Do")).toEqual([]);
    });

    it("returns 404 for non-existent task", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Task not found");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/tasks/not-valid",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid task ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/tasks/:id/move", () => {
    it("moves task to a different column", async () => {
      const { boardId } = await createProject("Task Move Column");
      const task = await createTask(boardId, { title: "Task" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task._id)}/move`,
        expectedStatus: 200,
        payload: { position: 0, status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { status: string; position: number } };

      expect(body.data.status).toBe("In Progress");
      expect(body.data.position).toBe(0);
    });

    it("reindexes source column after move out", async () => {
      const { boardId } = await createProject("Task Move Source Reindex");
      await createTask(boardId, { title: "Task 1" });
      const middle = await createTask(boardId, { title: "Task 2" });
      await createTask(boardId, { title: "Task 3" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(middle._id)}/move`,
        expectedStatus: 200,
        payload: { position: 0, status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });

      const todoTasks = await getTasks(boardId, "status=To+Do");
      const positions = todoTasks
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1]);
    });

    it("reindexes destination column after move in", async () => {
      const { boardId } = await createProject("Task Move Dest Reindex");
      const moving = await createTask(boardId, { title: "Move me" });
      await createTask(boardId, { title: "IP 1", status: "In Progress" });
      await createTask(boardId, { title: "IP 2", status: "In Progress" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 200,
        payload: { position: 0, status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });

      const inProgressTasks = await getTasks(boardId, "status=In+Progress");
      const positions = inProgressTasks
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1, 2]);
    });

    it("reorders within the same column", async () => {
      const { boardId } = await createProject("Task Move Same Column");
      const first = await createTask(boardId, { title: "Task 1" });
      await createTask(boardId, { title: "Task 2" });
      await createTask(boardId, { title: "Task 3" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(first._id)}/move`,
        expectedStatus: 200,
        payload: { position: 2 },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { position: number } };

      expect(body.data.position).toBe(2);
      const todoTasks = await getTasks(boardId, "status=To+Do");
      const positions = todoTasks
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1, 2]);
    });

    it("moves to position 0 (beginning of column)", async () => {
      const { boardId } = await createProject("Task Move Beginning");
      const moving = await createTask(boardId, { title: "Move me" });
      await createTask(boardId, { title: "IP 1", status: "In Progress" });
      await createTask(boardId, { title: "IP 2", status: "In Progress" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 200,
        payload: { position: 0, status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { position: number } };

      expect(body.data.position).toBe(0);
      const inProgressTasks = await getTasks(boardId, "status=In+Progress");
      const positions = inProgressTasks
        .map((task) => task.position as number)
        .sort((a, b) => a - b);

      expect(positions).toEqual([0, 1, 2]);
    });

    it("moves to end of destination column", async () => {
      const { boardId } = await createProject("Task Move End");
      const moving = await createTask(boardId, { title: "Move me" });
      await createTask(boardId, { title: "IP 1", status: "In Progress" });
      await createTask(boardId, { title: "IP 2", status: "In Progress" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 200,
        payload: { position: 2, status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { position: number } };

      expect(body.data.position).toBe(2);
    });

    it("clamps position to valid range", async () => {
      const { boardId } = await createProject("Task Move Clamp");
      const moving = await createTask(boardId, { title: "Move me" });
      await createTask(boardId, { title: "IP 1", status: "In Progress" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 200,
        payload: { position: 999, status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { position: number } };

      expect(body.data.position).toBe(1);
    });

    it("move to empty column", async () => {
      const { boardId } = await createProject("Task Move Empty Column");
      const moving = await createTask(boardId, { title: "Move me" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 200,
        payload: { position: 0, status: "Done" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { status: string; position: number } };

      expect(body.data.status).toBe("Done");
      expect(body.data.position).toBe(0);
    });

    it("returns 400 for invalid status", async () => {
      const { boardId } = await createProject("Task Move Invalid Status");
      const moving = await createTask(boardId, { title: "Move me" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 400,
        payload: { position: 0, status: "Nonexistent" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Invalid status");
    });

    it("returns 400 for missing position", async () => {
      const { boardId } = await createProject("Task Move Missing Position");
      const moving = await createTask(boardId, { title: "Move me" });

      const response = await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 400,
        payload: { status: "In Progress" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Position is required");
    });

    it("returns 400 for negative position", async () => {
      const { boardId } = await createProject("Task Move Negative Position");
      const moving = await createTask(boardId, { title: "Move me" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 400,
        payload: { position: -1 },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 400 for non-integer position", async () => {
      const { boardId } = await createProject("Task Move Fractional Position");
      const moving = await createTask(boardId, { title: "Move me" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(moving._id)}/move`,
        expectedStatus: 400,
        payload: { position: 1.5 },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 404 for non-existent task", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/move",
        expectedStatus: 404,
        payload: { position: 0 },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Task not found");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/tasks/not-valid/move",
        expectedStatus: 400,
        payload: { position: 0 },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid task ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/move",
        expectedStatus: 401,
        payload: { position: 0 },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });
});
