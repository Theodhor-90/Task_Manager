import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import {
  UserModel,
  hashPassword,
  CommentModel,
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

describe("comment routes", () => {
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

  async function createComment(
    taskId: string,
    commentBody: string,
  ): Promise<Record<string, unknown>> {
    const response = await httpRequest({
      method: "post",
      path: `/api/tasks/${taskId}/comments`,
      expectedStatus: 201,
      payload: { body: commentBody },
      headers: { authorization: `Bearer ${token}` },
    });
    const responseBody = response.body as { data: Record<string, unknown> };
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

  describe("POST /api/tasks/:taskId/comments", () => {
    it("creates comment with correct shape and sets author from JWT", async () => {
      const { boardId } = await createProject("Comment Create");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);

      const comment = await createComment(taskId, "This is a comment");

      expect(comment._id).toBeDefined();
      expect(comment.body).toBe("This is a comment");
      expect(normalizeId(comment.task)).toBe(taskId);
      expect(comment.author).toBeDefined();
      expect(comment.createdAt).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
    });

    it("returns 400 when body is missing", async () => {
      const { boardId } = await createProject("Comment Missing Body");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);

      const response = await httpRequest({
        method: "post",
        path: `/api/tasks/${taskId}/comments`,
        expectedStatus: 400,
        payload: {},
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Comment body is required");
    });

    it("returns 400 when body is empty string", async () => {
      const { boardId } = await createProject("Comment Empty Body");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);

      const response = await httpRequest({
        method: "post",
        path: `/api/tasks/${taskId}/comments`,
        expectedStatus: 400,
        payload: { body: "" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Comment body is required");
    });

    it("returns 404 for non-existent task ID", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments",
        expectedStatus: 404,
        payload: { body: "test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Task not found");
    });

    it("returns 400 for invalid task ID format", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/tasks/not-valid/comments",
        expectedStatus: 400,
        payload: { body: "test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid task ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments",
        expectedStatus: 401,
        payload: { body: "test" },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/tasks/:taskId/comments", () => {
    it("returns comments sorted by createdAt ascending with populated author", async () => {
      const { boardId } = await createProject("Comment List Sorted");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);

      await createComment(taskId, "First");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createComment(taskId, "Second");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createComment(taskId, "Third");

      const response = await httpRequest({
        method: "get",
        path: `/api/tasks/${taskId}/comments`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Array<Record<string, unknown>> };
      const comments = body.data;

      expect(comments).toHaveLength(3);
      expect(comments[0].body).toBe("First");
      expect(comments[1].body).toBe("Second");
      expect(comments[2].body).toBe("Third");
      expect(comments[0].author).toEqual(
        expect.objectContaining({ name: "Admin", email: "admin@taskboard.local" }),
      );
      expect(
        (comments[0].author as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it("returns empty array when task has no comments", async () => {
      const { boardId } = await createProject("Comment List Empty");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);

      const response = await httpRequest({
        method: "get",
        path: `/api/tasks/${taskId}/comments`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: unknown[] };

      expect(body.data).toEqual([]);
    });

    it("returns 404 for non-existent task", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Task not found");
    });

    it("returns 400 for invalid task ID format", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/tasks/not-valid/comments",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid task ID");
    });
  });

  describe("PUT /api/comments/:id", () => {
    it("updates comment body", async () => {
      const { boardId } = await createProject("Comment Update");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);
      const comment = await createComment(taskId, "Original body");
      const commentId = normalizeId(comment._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/comments/${commentId}`,
        expectedStatus: 200,
        payload: { body: "Updated body" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { body: string } };

      expect(body.data.body).toBe("Updated body");
    });

    it("returns 400 when body is missing", async () => {
      const { boardId } = await createProject("Comment Update Missing");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);
      const comment = await createComment(taskId, "Original");
      const commentId = normalizeId(comment._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/comments/${commentId}`,
        expectedStatus: 400,
        payload: {},
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Comment body is required");
    });

    it("returns 400 when body is empty string", async () => {
      const { boardId } = await createProject("Comment Update Empty");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);
      const comment = await createComment(taskId, "Original");
      const commentId = normalizeId(comment._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/comments/${commentId}`,
        expectedStatus: 400,
        payload: { body: "" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Comment body is required");
    });

    it("returns 404 for non-existent comment", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        payload: { body: "test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Comment not found");
    });

    it("returns 400 for invalid comment ID format", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/comments/not-valid",
        expectedStatus: 400,
        payload: { body: "test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid comment ID");
    });
  });

  describe("DELETE /api/comments/:id", () => {
    it("deletes comment and returns success message", async () => {
      const { boardId } = await createProject("Comment Delete");
      const task = await createTask(boardId, { title: "Task" });
      const taskId = normalizeId(task._id);
      const comment = await createComment(taskId, "To delete");
      const commentId = normalizeId(comment._id);

      const response = await httpRequest({
        method: "delete",
        path: `/api/comments/${commentId}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { message: string } };

      expect(body.data.message).toBe("Comment deleted");

      const count = await CommentModel.countDocuments({ _id: commentId });
      expect(count).toBe(0);
    });

    it("returns 404 for non-existent comment", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Comment not found");
    });

    it("returns 400 for invalid comment ID format", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/comments/not-valid",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid comment ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });
});
