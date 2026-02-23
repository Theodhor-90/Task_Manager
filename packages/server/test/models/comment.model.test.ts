import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CommentModel } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("Comment model", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates a comment with valid fields", async () => {
    const comment = await CommentModel.create({
      body: "A comment",
      task: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(),
    });

    expect(comment._id).toBeDefined();
    expect(comment.createdAt).toBeInstanceOf(Date);
    expect(comment.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects missing body", async () => {
    await expect(
      CommentModel.create({
        task: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it("rejects missing task", async () => {
    await expect(
      CommentModel.create({
        body: "A comment",
        author: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it("rejects missing author", async () => {
    await expect(
      CommentModel.create({
        body: "A comment",
        task: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  it("has index on task field", () => {
    const taskDefinition = CommentModel.schema.definition.task as { index?: boolean };
    expect(taskDefinition.index).toBe(true);
  });

  it("supports read, update, and delete operations", async () => {
    const created = await CommentModel.create({
      body: "CRUD Comment",
      task: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(),
    });

    const read = await CommentModel.findOne({ _id: created._id });
    expect(read).not.toBeNull();
    expect(read?.body).toBe("CRUD Comment");

    if (read && typeof (read as any).save === "function") {
      read.body = "Updated Comment";
      await (read as any).save();
    } else if (read) {
      read.body = "Updated Comment";
    }

    const updated = await CommentModel.findOne({ _id: created._id });
    expect(updated?.body).toBe("Updated Comment");

    const deleted = await CommentModel.deleteMany({ _id: created._id });
    expect(deleted.deletedCount).toBe(1);
    const afterDelete = await CommentModel.findOne({ _id: created._id });
    expect(afterDelete).toBeNull();
  });
});
