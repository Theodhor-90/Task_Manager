import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { UserModel, hashPassword } from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";

type HttpMethod = "get" | "post";

async function canBindTcpPort(): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.listen(0, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

describe("auth routes", () => {
  let app: FastifyInstance;
  let useSupertest = true;

  async function seedAdminUser(): Promise<void> {
    const passwordHash = await hashPassword("admin123");
    await UserModel.create({
      email: "admin@taskboard.local",
      name: "Admin",
      passwordHash,
    });
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
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  describe("POST /api/auth/login", () => {
    it("returns token and user for valid credentials", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/auth/login",
        expectedStatus: 200,
        payload: { email: "admin@taskboard.local", password: "admin123" },
      });
      const body = response.body as {
        data: { token: string; user: Record<string, unknown> };
      };

      expect(body.data.token).toBeDefined();
      expect(typeof body.data.token).toBe("string");
      expect(body.data.token.split(".")).toHaveLength(3);
      expect(body.data.user.email).toBe("admin@taskboard.local");
      expect(body.data.user.name).toBe("Admin");
      expect(body.data.user.id).toBeDefined();
      expect(body.data.user).not.toHaveProperty("passwordHash");
    });

    it("returns 401 for wrong password", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/auth/login",
        expectedStatus: 401,
        payload: { email: "admin@taskboard.local", password: "wrongpassword" },
      });

      expect(response.body).toEqual({ error: "Invalid credentials" });
    });

    it("returns 401 for non-existent email", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/auth/login",
        expectedStatus: 401,
        payload: { email: "nobody@example.com", password: "admin123" },
      });

      expect(response.body).toEqual({ error: "Invalid credentials" });
    });

    it("returns 400 for missing fields", async () => {
      const response = await httpRequest({
        method: "post",
        path: "/api/auth/login",
        expectedStatus: 400,
        payload: {},
      });

      expect(response.body).toEqual({
        error: "Email and password are required",
      });
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 without token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/auth/me",
        expectedStatus: 401,
      });

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 with invalid token", async () => {
      const response = await httpRequest({
        method: "get",
        path: "/api/auth/me",
        expectedStatus: 401,
        headers: { authorization: "Bearer garbage" },
      });

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("returns user data with valid token", async () => {
      const loginResponse = await httpRequest({
        method: "post",
        path: "/api/auth/login",
        expectedStatus: 200,
        payload: { email: "admin@taskboard.local", password: "admin123" },
      });
      const loginBody = loginResponse.body as {
        data: { token: string; user: { id: string } };
      };

      const { token, user: loginUser } = loginBody.data;

      const response = await httpRequest({
        method: "get",
        path: "/api/auth/me",
        expectedStatus: 200,
        headers: { authorization: `Bearer ${token}` },
      });
      const body = response.body as {
        data: { id: string; email: string; name: string };
      };

      expect(body.data.id).toBe(loginUser.id);
      expect(body.data.email).toBe("admin@taskboard.local");
      expect(body.data.name).toBe("Admin");
      expect(body.data).not.toHaveProperty("passwordHash");
    });

    it("health endpoint remains accessible without token", async () => {
      await httpRequest({
        method: "get",
        path: "/api/health",
        expectedStatus: 200,
      });
    });
  });
});
