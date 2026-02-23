import { UserModel, hashPassword } from "./models/index.js";

export async function seedDefaultUser(): Promise<void> {
  const count = await UserModel.countDocuments();

  if (count > 0) {
    console.log("Seed: users already exist, skipping");
    return;
  }

  const passwordHash = await hashPassword("admin123");
  await UserModel.create({
    email: "admin@taskboard.local",
    name: "Admin",
    passwordHash,
  });
  console.log("Seed: created default admin user (admin@taskboard.local)");
}
