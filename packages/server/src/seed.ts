import { UserModel, hashPassword } from "./models/index.js";

export async function seedDefaultUser(): Promise<void> {
  const count = await UserModel.countDocuments();

  if (count > 0) {
    console.log("Seed: users already exist, skipping");
    return;
  }

  const passwordHash = await hashPassword("testtest");
  await UserModel.create({
    email: "admin@email.com",
    name: "Admin",
    passwordHash,
  });
  console.log("Seed: created default admin user (admin@email.com)");
}
