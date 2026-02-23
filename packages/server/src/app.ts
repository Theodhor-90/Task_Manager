import Fastify from "fastify";
import type { Task } from "@taskboard/shared";
import { DEFAULT_COLUMNS } from "@taskboard/shared";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  return app;
}
