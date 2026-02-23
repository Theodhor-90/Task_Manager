import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LabelModel } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("Label model", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates a label with valid fields", async () => {
    const label = await LabelModel.create({
      name: "Bug",
      color: "#ef4444",
      project: new mongoose.Types.ObjectId(),
    });

    expect(label._id).toBeDefined();
    expect(label.createdAt).toBeInstanceOf(Date);
    expect(label.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects missing name", async () => {
    await expect(
      LabelModel.create({
        color: "#ef4444",
        project: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it("rejects missing color", async () => {
    await expect(
      LabelModel.create({
        name: "Bug",
        project: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it("rejects missing project", async () => {
    await expect(
      LabelModel.create({
        name: "Bug",
        color: "#ef4444",
      })
    ).rejects.toThrow();
  });

  it("has index on project field", () => {
    const projectDefinition = LabelModel.schema.definition.project as {
      index?: boolean;
    };
    expect(projectDefinition.index).toBe(true);
  });

  it("supports read, update, and delete operations", async () => {
    const created = await LabelModel.create({
      name: "CRUD Label",
      color: "#111111",
      project: new mongoose.Types.ObjectId(),
    });

    const read = await LabelModel.findOne({ _id: created._id });
    expect(read).not.toBeNull();
    expect(read?.name).toBe("CRUD Label");

    if (read && typeof (read as any).save === "function") {
      read.color = "#222222";
      await (read as any).save();
    } else if (read) {
      read.color = "#222222";
    }

    const updated = await LabelModel.findOne({ _id: created._id });
    expect(updated?.color).toBe("#222222");

    const deleted = await LabelModel.deleteMany({ _id: created._id });
    expect(deleted.deletedCount).toBe(1);
    const afterDelete = await LabelModel.findOne({ _id: created._id });
    expect(afterDelete).toBeNull();
  });
});
