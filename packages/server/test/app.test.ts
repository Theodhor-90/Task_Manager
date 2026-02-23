import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";
import { config } from "../src/config.js";

describe("buildApp", () => {
  it("returns a Fastify instance", async () => {
    const app = buildApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
    expect(typeof app.close).toBe("function");
    await app.close();
  });

  it("registers the health endpoint", async () => {
    const app = buildApp();
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

describe("config", () => {
  it("has expected default values", () => {
    expect(config.port).toBe(3001);
    expect(config.mongodbUri).toBe("mongodb://localhost:27017/taskboard");
    expect(typeof config.jwtSecret).toBe("string");
    expect(config.jwtSecret.length).toBeGreaterThan(0);
  });
});
