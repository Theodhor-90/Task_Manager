import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";
import { config } from "../src/config.js";

describe("buildApp", () => {
  it("returns a Fastify instance", async () => {
    const app = await buildApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
    expect(typeof app.close).toBe("function");
    await app.close();
  });

  it("registers the health endpoint", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.defaultColumns).toEqual([
      "To Do",
      "In Progress",
      "In Review",
      "Done",
    ]);
    await app.close();
  });
});

describe("plugins", () => {
  it("registers the JWT plugin (app.jwt is available)", async () => {
    const app = await buildApp();
    expect(app.jwt).toBeDefined();
    expect(typeof app.jwt.sign).toBe("function");
    expect(typeof app.jwt.verify).toBe("function");
    await app.close();
  });

  it("app.jwt.sign() produces a valid token string", async () => {
    const app = await buildApp();
    const token = app.jwt.sign({ test: true });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    await app.close();
  });

  it("CORS headers are present on responses", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        origin: "http://localhost:5173",
      },
    });
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    await app.close();
  });

  it("CORS rejects disallowed origins", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        origin: "http://evil.example.com",
      },
    });
    expect(response.headers["access-control-allow-origin"]).not.toBe(
      "http://evil.example.com",
    );
    await app.close();
  });
});

describe("config", () => {
  it("has expected default values", () => {
    expect(config.port).toBe(3001);
    expect(config.mongodbUri).toBe("mongodb://localhost:27017/taskboard");
    expect(typeof config.jwtSecret).toBe("string");
    expect(config.jwtSecret.length).toBeGreaterThan(0);
    expect(config.corsOrigin).toBe("http://localhost:5173");
  });
});

describe("auth middleware", () => {
  it("allows access to health endpoint without token (allow-listed)", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("rejects requests to protected routes without a token", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/protected-resource",
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
    await app.close();
  });

  it("rejects requests with an invalid token", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/protected-resource",
      headers: {
        authorization: "Bearer invalid.token.garbage",
      },
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
    await app.close();
  });

  it("allows access with a valid token and populates request.user", async () => {
    const app = await buildApp();

    app.get("/api/test-user", async (request) => {
      return { data: request.user };
    });

    const payload = { id: "user123", email: "test@test.com", name: "Test" };
    const token = app.jwt.sign(payload);

    const response = await app.inject({
      method: "GET",
      url: "/api/test-user",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.id).toBe("user123");
    expect(body.data.email).toBe("test@test.com");
    expect(body.data.name).toBe("Test");
    await app.close();
  });

  it("rejects requests with a tampered token", async () => {
    const app = await buildApp();

    const token = app.jwt.sign({ id: "user123", email: "a@b.com", name: "A" });
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");

    const response = await app.inject({
      method: "GET",
      url: "/api/protected-resource",
      headers: {
        authorization: `Bearer ${tampered}`,
      },
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
    await app.close();
  });
});
