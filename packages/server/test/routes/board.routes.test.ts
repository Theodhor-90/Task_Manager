import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { UserModel, hashPassword } from "../../src/models/index.js";
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

describe("board routes", () => {
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

  describe("GET /api/projects/:projectId/board", () => {
    it("returns board with columns sorted by position", async () => {
      const { projectId } = await createProject("Board Test");

      const response = await httpRequest({
        method: "get",
        path: `/api/projects/${projectId}/board`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: {
          _id: string;
          project: unknown;
          columns: Array<{ name: string; position: number }>;
        };
      };

      expect(body.data._id).toBeDefined();
      expect(normalizeId(body.data.project)).toBe(projectId);
      expect(body.data.columns).toHaveLength(4);
      expect(body.data.columns.map((column) => column.name)).toEqual([
        "To Do",
        "In Progress",
        "In Review",
        "Done",
      ]);
      expect(body.data.columns.map((column) => column.position)).toEqual([0, 1, 2, 3]);
    });

    it("returns 404 for non-existent project", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/board",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Project not found");
    });

    it("returns 400 for invalid projectId format", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/not-a-valid-id/board",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid project ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/board",
        expectedStatus: 401,
      });

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("board contains correct project reference", async () => {
      const { projectId, boardId } = await createProject("Project Ref Test");
      expect(boardId).toBeDefined();

      const response = await httpRequest({
        method: "get",
        path: `/api/projects/${projectId}/board`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: { project: unknown };
      };

      expect(normalizeId(body.data.project)).toBe(projectId);
    });

    it("board has timestamps", async () => {
      const { projectId } = await createProject("Timestamp Test");

      const response = await httpRequest({
        method: "get",
        path: `/api/projects/${projectId}/board`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: { createdAt: string; updatedAt: string };
      };

      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });
  });
});
