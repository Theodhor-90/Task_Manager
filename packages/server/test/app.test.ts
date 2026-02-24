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
