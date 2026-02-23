import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UserModel, hashPassword, verifyPassword } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("User model", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates a user with valid fields", async () => {
    const user = await UserModel.create({
      email: "test@example.com",
      passwordHash: "hashed",
      name: "Test",
    });

    expect(user._id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate email", async () => {
    await UserModel.create({
      email: "dupe@example.com",
      passwordHash: "hashed",
      name: "First",
    });

    try {
      await UserModel.create({
        email: "dupe@example.com",
        passwordHash: "hashed2",
        name: "Second",
      });
      expect.fail("Should have thrown duplicate key error");
    } catch (err: any) {
      expect(err.code).toBe(11000);
    }
  });

  it("rejects missing email", async () => {
    await expect(
      UserModel.create({
        passwordHash: "hashed",
        name: "Test",
      })
    ).rejects.toThrow();
  });

  it("rejects missing passwordHash", async () => {
    await expect(
      UserModel.create({
        email: "test@example.com",
        name: "Test",
      })
    ).rejects.toThrow();
  });

  it("rejects missing name", async () => {
    await expect(
      UserModel.create({
        email: "test@example.com",
        passwordHash: "hashed",
      })
    ).rejects.toThrow();
  });

  it("stores email as lowercase and trimmed", async () => {
    const user = await UserModel.create({
      email: "  ADMIN@Example.COM  ",
      passwordHash: "hashed",
      name: "Admin",
    });

    expect(user.email).toBe("admin@example.com");
  });

  it("supports read, update, and delete operations", async () => {
    const created = await UserModel.create({
      email: "crud@example.com",
      passwordHash: "hashed",
      name: "CRUD User",
    });

    const read = await UserModel.findOne({ _id: created._id });
    expect(read).not.toBeNull();
    expect(read?.email).toBe("crud@example.com");

    if (read && typeof (read as any).save === "function") {
      read.name = "Updated User";
      await (read as any).save();
    } else if (read) {
      read.name = "Updated User";
    }

    const updated = await UserModel.findOne({ _id: created._id });
    expect(updated?.name).toBe("Updated User");

    const deleted = await UserModel.deleteMany({ _id: created._id });
    expect(deleted.deletedCount).toBe(1);
    const afterDelete = await UserModel.findOne({ _id: created._id });
    expect(afterDelete).toBeNull();
  });

  describe("password utilities", () => {
    it("hashPassword produces a valid bcrypt hash", async () => {
      const hash = await hashPassword("mypassword");

      expect(typeof hash).toBe("string");
      expect(hash.startsWith("$2")).toBe(true);
      expect(hash.length).toBeGreaterThan(50);
    });

    it("verifyPassword returns true for correct password", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("mypassword", hash);

      expect(result).toBe(true);
    });

    it("verifyPassword returns false for wrong password", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("wrongpassword", hash);

      expect(result).toBe(false);
    });
  });
});
