import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ProjectModel } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("Project model", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates a project with valid fields", async () => {
    const project = await ProjectModel.create({
      name: "Test Project",
      description: "A project",
      owner: new mongoose.Types.ObjectId().toString(),
    });

    expect(project._id).toBeDefined();
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a project with only required fields", async () => {
    const project = await ProjectModel.create({
      name: "Minimal",
      owner: new mongoose.Types.ObjectId().toString(),
    });

    expect(project.description).toBe("");
  });

  it("rejects missing name", async () => {
    await expect(
      ProjectModel.create({
        owner: new mongoose.Types.ObjectId().toString(),
      })
    ).rejects.toThrow();
  });

  it("rejects missing owner", async () => {
    await expect(
      ProjectModel.create({
        name: "No Owner",
      })
    ).rejects.toThrow();
  });

  it("trims the name", async () => {
    const project = await ProjectModel.create({
      name: "  Spaced Name  ",
      owner: new mongoose.Types.ObjectId().toString(),
    });

    expect(project.name).toBe("Spaced Name");
  });

  it("supports read, update, and delete operations", async () => {
    const created = await ProjectModel.create({
      name: "CRUD Project",
      description: "Initial description",
      owner: new mongoose.Types.ObjectId().toString(),
    });

    const read = await ProjectModel.findOne({ _id: created._id });
    expect(read).not.toBeNull();
    expect(read?.name).toBe("CRUD Project");

    if (read && typeof (read as any).save === "function") {
      read.description = "Updated description";
      await (read as any).save();
    } else if (read) {
      read.description = "Updated description";
    }

    const updated = await ProjectModel.findOne({ _id: created._id });
    expect(updated?.description).toBe("Updated description");

    const deleted = await ProjectModel.deleteMany({ _id: created._id });
    expect(deleted.deletedCount).toBe(1);
    const afterDelete = await ProjectModel.findOne({ _id: created._id });
    expect(afterDelete).toBeNull();
  });
});
