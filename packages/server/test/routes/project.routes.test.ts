import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { BoardModel, UserModel, hashPassword } from "../../src/models/index.js";
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

describe("project routes", () => {
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

  describe("POST /api/projects", () => {
    it("creates a project with name and description", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Test Project", description: "A description" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: Record<string, unknown>;
      };

      expect(body.data.name).toBe("Test Project");
      expect(body.data.description).toBe("A description");
      expect(body.data.owner).toBeDefined();
      expect(body.data._id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    it("creates a project with only name", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Minimal" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: Record<string, unknown>;
      };

      expect(body.data.name).toBe("Minimal");
      expect(body.data.description).toBe("");
    });

    it("auto-creates a board with 4 default columns", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Board Test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: { _id: unknown };
      };

      let board = await BoardModel.findOne({ project: body.data._id as never });

      if (!board) {
        const projectResponse = await httpRequest({
          method: "get",
          path: "/api/projects",
          expectedStatus: 200,
          headers: { authorization: `Bearer ${token}` },
        });
        const projectsBody = projectResponse.body as {
          data: Array<{ _id: unknown; name: string }>;
        };
        const project = projectsBody.data.find((item) => item.name === "Board Test");
        board = await BoardModel.findOne({ project: project?._id as never });
      }

      expect(board).not.toBeNull();
      expect(board?.columns).toHaveLength(4);
      expect(board?.columns.map((column) => column.name)).toEqual([
        "To Do",
        "In Progress",
        "In Review",
        "Done",
      ]);
      expect(board?.columns.map((column) => column.position)).toEqual([0, 1, 2, 3]);
    });

    it("returns 400 when name is missing", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 400,
        payload: { description: "no name" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Project name");
    });

    it("returns 400 when name is empty string", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 400,
        payload: { name: "" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Project name");
    });

    it("returns 400 when name is whitespace only", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 400,
        payload: { name: "   " },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Project name");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 401,
        payload: { name: "Test" },
      });

      expect(response.body).toEqual({ error: "Unauthorized" });
    });
  });

  describe("GET /api/projects", () => {
    it("returns empty array when no projects exist", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects",
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: unknown[];
      };

      expect(body.data).toEqual([]);
    });

    it("returns all projects owned by the user", async () => {
      await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Project 1" },
        headers: { authorization: `Bearer ${token}` },
      });
      await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Project 2" },
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await httpRequest({
        method: "get",
        path: "/api/projects",
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: Array<{ name: string }>;
      };

      expect(body.data).toHaveLength(2);
      expect(body.data.map((project) => project.name)).toEqual(
        expect.arrayContaining(["Project 1", "Project 2"]),
      );
    });

    it("returns projects sorted by createdAt descending", async () => {
      await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "First" },
        headers: { authorization: `Bearer ${token}` },
      });

      await new Promise((resolve) => setTimeout(resolve, 5));

      await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Second" },
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await httpRequest({
        method: "get",
        path: "/api/projects",
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: Array<{ name: string }>;
      };

      expect(body.data[0].name).toBe("Second");
      expect(body.data[1].name).toBe("First");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects",
        expectedStatus: 401,
      });

      expect(response.body).toEqual({ error: "Unauthorized" });
    });
  });

  describe("GET /api/projects/:id", () => {
    it("returns a project by ID", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Get Test", description: "desc" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      const response = await httpRequest({
        method: "get",
        path: `/api/projects/${projectId}`,
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Record<string, unknown> };

      expect(body.data.name).toBe("Get Test");
      expect(body.data.description).toBe("desc");
      expect(normalizeId(body.data._id)).toBe(projectId);
      expect(body.data.owner).toBeDefined();
    });

    it("returns 404 for non-existent project ID", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Project not found");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/not-a-valid-id",
        expectedStatus: 400,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid project ID");
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/projects/:id", () => {
    it("updates project name", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Original" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 200,
        payload: { name: "Updated" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Record<string, unknown> };

      expect(body.data.name).toBe("Updated");
      expect(normalizeId(body.data._id)).toBe(projectId);
    });

    it("updates project description", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Test", description: "old" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 200,
        payload: { description: "new" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Record<string, unknown> };

      expect(body.data.description).toBe("new");
      expect(body.data.name).toBe("Test");
    });

    it("updates both name and description", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Before", description: "Before Desc" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 200,
        payload: { name: "New Name", description: "New Desc" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Record<string, unknown> };

      expect(body.data.name).toBe("New Name");
      expect(body.data.description).toBe("New Desc");
    });

    it("ignores extraneous fields", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Security Test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as {
        data: { _id: unknown; owner: string };
      };
      const projectId = normalizeId(createBody.data._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 200,
        payload: { name: "Renamed", owner: "aaaaaaaaaaaaaaaaaaaaaaaa" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { data: Record<string, unknown> };

      expect(body.data.name).toBe("Renamed");
      expect(body.data.owner).toBe(createBody.data.owner);
    });

    it("returns 404 for non-existent project ID", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 404,
        payload: { name: "Test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Project not found");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/projects/not-a-valid-id",
        expectedStatus: 400,
        payload: { name: "Test" },
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Invalid project ID");
    });

    it("returns 400 when no valid update fields provided", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "No Update Fields" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      const response = await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 400,
        payload: {},
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as { error: string };

      expect(body.error).toContain("Name or description");
    });

    it("returns 400 when name is empty string", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Empty Name Check" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 400,
        payload: { name: "" },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 400 when name is whitespace only", async () => {
      const createResponse = await httpRequest({
        method: "post",
        path: "/api/projects",
        expectedStatus: 201,
        payload: { name: "Whitespace Check" },
        headers: { authorization: `Bearer ${token}` },
      });
      const createBody = createResponse.body as { data: { _id: unknown } };
      const projectId = normalizeId(createBody.data._id);

      await httpRequest({
        method: "put",
        path: `/api/projects/${projectId}`,
        expectedStatus: 400,
        payload: { name: "   " },
        headers: { authorization: `Bearer ${token}` },
      });
    });

    it("returns 401 without auth token", async () => {
      const response = await httpRequest({
        method: "put",
        path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa",
        expectedStatus: 401,
        payload: { name: "Test" },
      });
      const body = response.body as { error: string };

      expect(body.error).toBe("Unauthorized");
    });
  });
});
