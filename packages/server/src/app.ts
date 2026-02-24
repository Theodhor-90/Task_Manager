import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { boardRoutes, columnRoutes } from "./routes/board.routes.js";
import { projectRoutes } from "./routes/project.routes.js";
import { boardTaskRoutes, taskRoutes } from "./routes/task.routes.js";
import { taskCommentRoutes, commentRoutes } from "./routes/comment.routes.js";
import { projectLabelRoutes, labelRoutes } from "./routes/label.routes.js";

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
  await app.register(columnRoutes, { prefix: "/api/boards" });
  await app.register(boardTaskRoutes, { prefix: "/api/boards" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(taskCommentRoutes, { prefix: "/api/tasks" });
  await app.register(commentRoutes, { prefix: "/api/comments" });
  await app.register(projectLabelRoutes, { prefix: "/api/projects" });
  await app.register(labelRoutes, { prefix: "/api/labels" });

  return app;
}
