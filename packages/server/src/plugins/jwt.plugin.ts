import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { config } from "../config.js";

export const jwtPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: "24h",
    },
  });
});
