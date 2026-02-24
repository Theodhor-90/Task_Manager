import fastifyCors from "@fastify/cors";
import fp from "fastify-plugin";
import { config } from "../config.js";

export const corsPlugin = fp(async (app) => {
  await app.register(fastifyCors, {
    origin: config.corsOrigin,
    credentials: true,
  });
});
