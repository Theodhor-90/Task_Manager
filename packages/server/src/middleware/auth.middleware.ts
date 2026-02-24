import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/api/auth/login" },
  { method: "GET", path: "/api/health" },
];

function isPublicRoute(method: string, url: string): boolean {
  const path = url.split("?")[0];
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && route.path === path,
  );
}

export const authMiddleware = fp(async (app) => {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isPublicRoute(request.method, request.url)) {
        return;
      }

      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
});
