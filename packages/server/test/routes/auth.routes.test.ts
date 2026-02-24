import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../src/app.js";
import { UserModel, hashPassword } from "../../src/models/index.js";
import { setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("auth routes", () => {
  beforeAll(async () => {
    await setupTestDb();
    const passwordHash = await hashPassword("admin123");
    await UserModel.create({
      email: "admin@taskboard.local",
      name: "Admin",
      passwordHash,
    });
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe("POST /api/auth/login", () => {
    it("returns token and user for valid credentials", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "admin@taskboard.local",
          password: "admin123",
        },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.token).toBeDefined();
      expect(typeof body.data.token).toBe("string");
      expect(body.data.token.split(".")).toHaveLength(3);
      expect(body.data.user.email).toBe("admin@taskboard.local");
      expect(body.data.user.name).toBe("Admin");
      expect(body.data.user.id).toBeDefined();
      expect(body.data.user).not.toHaveProperty("passwordHash");
      await app.close();
    });

    it("returns 401 for wrong password", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "admin@taskboard.local",
          password: "wrongpassword",
        },
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Invalid credentials" });
      await app.close();
    });

    it("returns 401 for non-existent email", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "nobody@example.com",
          password: "admin123",
        },
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Invalid credentials" });
      await app.close();
    });

    it("returns 400 for missing or invalid credential fields", async () => {
      const app = await buildApp();
      const missingFieldsResponse = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {},
      });
      expect(missingFieldsResponse.statusCode).toBe(400);
      expect(JSON.parse(missingFieldsResponse.body)).toEqual({
        error: "Email and password are required",
      });

      const missingBodyResponse = await app.inject({
        method: "POST",
        url: "/api/auth/login",
      });
      expect(missingBodyResponse.statusCode).toBe(400);
      expect(JSON.parse(missingBodyResponse.body)).toEqual({
        error: "Email and password are required",
      });

      const invalidTypeResponse = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: 123,
          password: true,
        },
      });
      expect(invalidTypeResponse.statusCode).toBe(400);
      expect(JSON.parse(invalidTypeResponse.body)).toEqual({
        error: "Email and password are required",
      });
      await app.close();
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 without token", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
      await app.close();
    });

    it("returns 401 with invalid token", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: {
          authorization: "Bearer garbage",
        },
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
      await app.close();
    });

    it("returns user data with valid token", async () => {
      const app = await buildApp();

      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "admin@taskboard.local",
          password: "admin123",
        },
      });
      const { data } = JSON.parse(loginResponse.body);

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: {
          authorization: `Bearer ${data.token}`,
        },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(data.user.id);
      expect(body.data.email).toBe("admin@taskboard.local");
      expect(body.data.name).toBe("Admin");
      expect(body.data).not.toHaveProperty("passwordHash");
      await app.close();
    });

    it("health endpoint remains accessible without token", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });
      expect(response.statusCode).toBe(200);
      await app.close();
    });
  });
});
