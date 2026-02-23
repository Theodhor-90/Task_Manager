import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PRIORITIES } from "@taskboard/shared";
import { TaskModel } from "../../src/models/index.js";
import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db.js";

function validTaskData(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Task",
    status: "To Do",
    board: new mongoose.Types.ObjectId(),
    project: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

describe("Task model", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("creates a task with all fields", async () => {
    const dueDate = new Date();
    const labelId = new mongoose.Types.ObjectId();

    const task = await TaskModel.create(
      validTaskData({
        description: "Task description",
        priority: "high",
        position: 2,
        dueDate,
        labels: [labelId],
      })
    );

    expect(task.title).toBe("Test Task");
    expect(task.description).toBe("Task description");
    expect(task.status).toBe("To Do");
    expect(task.priority).toBe("high");
    expect(task.position).toBe(2);
    expect(task.dueDate?.toISOString()).toBe(dueDate.toISOString());
    expect(task.labels).toHaveLength(1);
    expect(task.labels[0]?.toString()).toBe(labelId.toString());
    expect(task._id).toBeDefined();
  });

  it("creates a task with only required fields and applies defaults", async () => {
    const task = await TaskModel.create(validTaskData());

    expect(task.priority).toBe("medium");
    expect(task.position).toBe(0);
    expect(task.description).toBe("");
    expect(task.dueDate).toBeNull();
    expect(task.labels).toEqual([]);
  });

  it("rejects missing title", async () => {
    await expect(TaskModel.create(validTaskData({ title: undefined }))).rejects.toThrow();
  });

  it("rejects missing status", async () => {
    await expect(TaskModel.create(validTaskData({ status: undefined }))).rejects.toThrow();
  });

  it("rejects missing board", async () => {
    await expect(TaskModel.create(validTaskData({ board: undefined }))).rejects.toThrow();
  });

  it("rejects missing project", async () => {
    await expect(TaskModel.create(validTaskData({ project: undefined }))).rejects.toThrow();
  });

  it("rejects invalid priority value", async () => {
    await expect(TaskModel.create(validTaskData({ priority: "critical" }))).rejects.toThrow();
  });

  it("accepts all valid priority values", async () => {
    for (const priority of PRIORITIES) {
      const task = await TaskModel.create(validTaskData({ priority }));
      expect(task.priority).toBe(priority);
    }
  });

  it("has index on board field", () => {
    const boardDefinition = TaskModel.schema.definition.board as { index?: boolean };
    expect(boardDefinition.index).toBe(true);
  });

  it("has index on project field", () => {
    const projectDefinition = TaskModel.schema.definition.project as { index?: boolean };
    expect(projectDefinition.index).toBe(true);
  });

  it("supports read, update, and delete operations", async () => {
    const created = await TaskModel.create(validTaskData({ title: "CRUD Task" }));

    const read = await TaskModel.findOne({ _id: created._id });
    expect(read).not.toBeNull();
    expect(read?.title).toBe("CRUD Task");

    if (read && typeof (read as any).save === "function") {
      read.title = "Updated Task";
      await (read as any).save();
    } else if (read) {
      read.title = "Updated Task";
    }

    const updated = await TaskModel.findOne({ _id: created._id });
    expect(updated?.title).toBe("Updated Task");

    const deleted = await TaskModel.deleteMany({ _id: created._id });
    expect(deleted.deletedCount).toBe(1);
    const afterDelete = await TaskModel.findOne({ _id: created._id });
    expect(afterDelete).toBeNull();
  });
});
