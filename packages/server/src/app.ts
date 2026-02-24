import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(jwtPlugin);
  await app.register(corsPlugin);

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  return app;
}
