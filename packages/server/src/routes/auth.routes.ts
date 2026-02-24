import type { FastifyPluginAsync } from "fastify";
import type { LoginRequest } from "@taskboard/shared";
import { UserModel, verifyPassword } from "../models/index.js";

function isValidLoginRequest(body: unknown): body is LoginRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { email, password } = body as Partial<LoginRequest>;

  return (
    typeof email === "string" &&
    typeof password === "string" &&
    email.trim().length > 0 &&
    password.trim().length > 0
  );
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    if (!isValidLoginRequest(request.body)) {
      return reply
        .code(400)
        .send({ error: "Email and password are required" });
    }

    const { email, password } = request.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const userId = (user._id as { toString(): string }).toString();

    const token = app.jwt.sign({
      id: userId,
      email: user.email,
      name: user.name,
    });

    return {
      data: {
        token,
        user: {
          id: userId,
          email: user.email,
          name: user.name,
        },
      },
    };
  });

  app.get("/me", async (request) => {
    return {
      data: {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
      },
    };
  });
};
