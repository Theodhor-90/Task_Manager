import { buildApp } from "./app.js";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import { seedDefaultUser } from "./seed.js";

const app = buildApp();

try {
  await connectDb();
  await seedDefaultUser();
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
