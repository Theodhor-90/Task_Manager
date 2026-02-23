import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BoardModel } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("Board model", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates a board with columns linked to a project", async () => {
    const board = await BoardModel.create({
      project: new mongoose.Types.ObjectId(),
      columns: [
        { name: "To Do", position: 0 },
        { name: "Done", position: 1 },
      ],
    });

    expect(board._id).toBeDefined();
    expect(board.columns).toHaveLength(2);
    expect(board.columns[0]?._id).toBeDefined();
    expect(board.columns[0]?.name).toBe("To Do");
    expect(board.columns[0]?.position).toBe(0);
    expect(board.columns[1]?._id).toBeDefined();
    expect(board.columns[1]?.name).toBe("Done");
    expect(board.columns[1]?.position).toBe(1);
  });

  it("rejects duplicate board for same project", async () => {
    const project = new mongoose.Types.ObjectId();

    await BoardModel.create({
      project,
      columns: [{ name: "To Do", position: 0 }],
    });

    try {
      await BoardModel.create({
        project,
        columns: [{ name: "Done", position: 1 }],
      });
      expect.fail("Should have thrown duplicate key error");
    } catch (err: any) {
      expect(err.code).toBe(11000);
    }
  });

  it("rejects missing project", async () => {
    await expect(
      BoardModel.create({
        columns: [{ name: "To Do", position: 0 }],
      })
    ).rejects.toThrow();
  });

  it("columns have auto-generated _id", async () => {
    const board = await BoardModel.create({
      project: new mongoose.Types.ObjectId(),
      columns: [{ name: "Test", position: 0 }],
    });

    expect(board.columns[0]?._id).toBeDefined();
    expect(board.columns[0]?._id.toString().length).toBeGreaterThan(0);
  });

  it("rejects column without name", async () => {
    await expect(
      BoardModel.create({
        project: new mongoose.Types.ObjectId(),
        columns: [{ position: 0 }],
      })
    ).rejects.toThrow();
  });

  it("rejects column without position", async () => {
    await expect(
      BoardModel.create({
        project: new mongoose.Types.ObjectId(),
        columns: [{ name: "Test" }],
      })
    ).rejects.toThrow();
  });

  it("supports read, update, and delete operations", async () => {
    const created = await BoardModel.create({
      project: new mongoose.Types.ObjectId(),
      columns: [{ name: "Backlog", position: 0 }],
    });

    const read = await BoardModel.findOne({ _id: created._id });
    expect(read).not.toBeNull();
    expect(read?.columns[0]?.name).toBe("Backlog");

    if (read && typeof (read as any).save === "function") {
      read.columns[0]!.name = "Updated Backlog";
      await (read as any).save();
    } else if (read) {
      read.columns[0]!.name = "Updated Backlog";
    }

    const updated = await BoardModel.findOne({ _id: created._id });
    expect(updated?.columns[0]?.name).toBe("Updated Backlog");

    const deleted = await BoardModel.deleteMany({ _id: created._id });
    expect(deleted.deletedCount).toBe(1);
    const afterDelete = await BoardModel.findOne({ _id: created._id });
    expect(afterDelete).toBeNull();
  });
});
