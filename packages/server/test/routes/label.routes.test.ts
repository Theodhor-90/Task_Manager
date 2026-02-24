import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import {
  UserModel,
  hashPassword,
  LabelModel,
  TaskModel,
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

describe("label routes", () => {
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

  async function createLabel(
    projectId: string,
    name: string,
    color: string,
  ): Promise<Record<string, unknown>> {
    const response = await httpRequest({
      method: "post",
      path: `/api/projects/${projectId}/labels`,
      expectedStatus: 201,
      payload: { name, color },
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

  describe("POST /api/projects/:projectId/labels", () => {
    it("creates label with correct shape", async () => {
      const { projectId } = await createProject("Label Create");

      const label = await createLabel(projectId, "Bug", "#ef4444");

      expect(label._id).toBeDefined();
      expect(label.name).toBe("Bug");
      expect(label.color).toBe("#ef4444");
      expect(normalizeId(label.project)).toBe(projectId);
      expect(label.createdAt).toBeDefined();
      expect(label.updatedAt).toBeDefined();
    });

    it("returns 400 when name is missing", async () => {
      const { projectId } = await createProject("Label Missing Name");

      const response = await httpRequest({
        method: "post",
        path: `/api/projects/${projectId}/labels`,
        expectedStatus: 400,
        payload: { color: "#ef4444" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Label name and color are required");
    });

    it("returns 400 when color is missing", async () => {
      const { projectId } = await createProject("Label Missing Color");

      const response = await httpRequest({
        method: "post",
        path: `/api/projects/${projectId}/labels`,
        expectedStatus: 400,
        payload: { name: "Bug" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Label name and color are required");
    });

    it("returns 400 when name is empty string", async () => {
      const { projectId } = await createProject("Label Empty Name");

      const response = await httpRequest({
        method: "post",
        path: `/api/projects/${projectId}/labels`,
        expectedStatus: 400,
        payload: { name: "", color: "#ef4444" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Label name and color are required");
    });

    it("returns 404 for non-existent project ID", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels",
        expectedStatus: 404,
        payload: { name: "Bug", color: "#ef4444" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Project not found");
    });

    it("returns 400 for invalid project ID format", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects/not-valid/labels",
        expectedStatus: 400,
        payload: { name: "Bug", color: "#ef4444" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid project ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels",
        expectedStatus: 401,
        payload: { name: "Bug", color: "#ef4444" },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/projects/:projectId/labels", () => {
    it("returns labels sorted by createdAt ascending", async () => {
      const { projectId } = await createProject("Label List Sorted");
      await createLabel(projectId, "First", "#111111");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createLabel(projectId, "Second", "#222222");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createLabel(projectId, "Third", "#333333");

      const response = await httpRequest({
        method: "get",
        path: `/api/projects/${projectId}/labels`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Array<Record<string, unknown>> };
      const labels = body.data;

      expect(labels).toHaveLength(3);
      expect(labels[0].name).toBe("First");
      expect(labels[1].name).toBe("Second");
      expect(labels[2].name).toBe("Third");
    });

    it("returns empty array when project has no labels", async () => {
      const { projectId } = await createProject("Label List Empty");

      const response = await httpRequest({
        method: "get",
        path: `/api/projects/${projectId}/labels`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: unknown[] };

      expect(body.data).toEqual([]);
    });

    it("returns 404 for non-existent project", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Project not found");
    });

    it("returns 400 for invalid project ID format", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/not-valid/labels",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid project ID");
    });
  });

  describe("PUT /api/labels/:id", () => {
    it("updates label name", async () => {
      const { projectId } = await createProject("Label Update Name");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/labels/${labelId}`,
        expectedStatus: 200,
        payload: { name: "Feature" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { name: string; color: string } };

      expect(body.data.name).toBe("Feature");
      expect(body.data.color).toBe("#ef4444");
    });

    it("updates label color", async () => {
      const { projectId } = await createProject("Label Update Color");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/labels/${labelId}`,
        expectedStatus: 200,
        payload: { color: "#22c55e" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { name: string; color: string } };

      expect(body.data.color).toBe("#22c55e");
      expect(body.data.name).toBe("Bug");
    });

    it("updates both name and color", async () => {
      const { projectId } = await createProject("Label Update Both");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/labels/${labelId}`,
        expectedStatus: 200,
        payload: { name: "Feature", color: "#22c55e" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { name: string; color: string } };

      expect(body.data.name).toBe("Feature");
      expect(body.data.color).toBe("#22c55e");
    });

    it("returns 400 when no valid fields provided", async () => {
      const { projectId } = await createProject("Label Update Empty");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/labels/${labelId}`,
        expectedStatus: 400,
        payload: {},
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("At least one valid field is required");
    });

    it("returns 400 when name is empty string", async () => {
      const { projectId } = await createProject("Label Update Empty Name");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/labels/${labelId}`,
        expectedStatus: 400,
        payload: { name: "" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("At least one valid field is required");
    });

    it("returns 404 for non-existent label", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        payload: { name: "X" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Label not found");
    });

    it("returns 400 for invalid label ID format", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/labels/not-valid",
        expectedStatus: 400,
        payload: { name: "X" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid label ID");
    });
  });

  describe("DELETE /api/labels/:id", () => {
    it("deletes label and returns success message", async () => {
      const { projectId } = await createProject("Label Delete");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const response = await httpRequest({
        method: "delete",
        path: `/api/labels/${labelId}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { message: string } };

      expect(body.data.message).toBe("Label deleted");

      const count = await LabelModel.countDocuments({ _id: labelId });
      expect(count).toBe(0);
    });

    it("removes label reference from all tasks that had it", async () => {
      const { projectId, boardId } = await createProject("Label Delete Cleanup");
      const label = await createLabel(projectId, "Bug", "#ef4444");
      const labelId = normalizeId(label._id);

      const task1 = await createTask(boardId, { title: "Task 1" });
      const task2 = await createTask(boardId, { title: "Task 2" });

      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task1._id)}`,
        expectedStatus: 200,
        payload: { labels: [labelId] },
        headers: { authorization: `Bearer ${token}` },
      });
      await httpRequest({
        method: "put",
        path: `/api/tasks/${normalizeId(task2._id)}`,
        expectedStatus: 200,
        payload: { labels: [labelId] },
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await httpRequest({
        method: "delete",
        path: `/api/labels/${labelId}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: { message: string } };

      expect(body.data.message).toBe("Label deleted");

      const updatedTask1 = await TaskModel.findOne({ _id: normalizeId(task1._id) });
      const task1Labels = (updatedTask1 as unknown as { labels: unknown[] }).labels.map(normalizeId);
      expect(task1Labels).not.toContain(labelId);

      const updatedTask2 = await TaskModel.findOne({ _id: normalizeId(task2._id) });
      const task2Labels = (updatedTask2 as unknown as { labels: unknown[] }).labels.map(normalizeId);
      expect(task2Labels).not.toContain(labelId);
    });

    it("returns 404 for non-existent label", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Label not found");
    });

    it("returns 400 for invalid label ID format", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/labels/not-valid",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid label ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "delete",
        path: "/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });
});
