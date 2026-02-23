import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedDefaultUser } from "../../src/seed.js";
import { UserModel, verifyPassword } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("seedDefaultUser", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates admin user when no users exist", async () => {
    await seedDefaultUser();

    const count = await UserModel.countDocuments();
    const user = await UserModel.findOne({ email: "admin@taskboard.local" });

    expect(count).toBe(1);
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Admin");
    expect(typeof user?.passwordHash).toBe("string");
    expect(user?.passwordHash.length).toBeGreaterThan(0);
  });

  it("does not create duplicate when users already exist", async () => {
    await seedDefaultUser();
    await seedDefaultUser();

    const count = await UserModel.countDocuments();

    expect(count).toBe(1);
  });

  it("created user has a valid password hash", async () => {
    await seedDefaultUser();

    const user = await UserModel.findOne({ email: "admin@taskboard.local" });

    expect(user).not.toBeNull();

    const isValid = await verifyPassword("admin123", user!.passwordHash);
    const isInvalid = await verifyPassword("wrongpassword", user!.passwordHash);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });
});
