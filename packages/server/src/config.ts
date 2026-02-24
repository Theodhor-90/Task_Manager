export interface Config {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  corsOrigin: string;
}

export const config: Config = {
  port: Number(process.env["PORT"]) || 3001,
  mongodbUri: process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/taskboard",
  jwtSecret: process.env["JWT_SECRET"] ?? "dev-jwt-secret-change-in-production",
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
};
