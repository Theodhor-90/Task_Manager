import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { boardRoutes } from "./routes/board.routes.js";
import { projectRoutes } from "./routes/project.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(jwtPlugin);
  await app.register(corsPlugin);
  await app.register(authMiddleware);

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(boardRoutes, { prefix: "/api/projects" });

  return app;
}
