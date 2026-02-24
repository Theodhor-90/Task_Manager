import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { ProjectModel, BoardModel, TaskModel } from "../models/index.js";

function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:projectId/board", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    if (!isValidObjectId(projectId)) {
      return reply.code(400).send({ error: "Invalid project ID" });
    }

    const project = await ProjectModel.findOne({
      _id: projectId,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const board = await BoardModel.findOne({ project: projectId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const boardWithToJson = board as unknown as Partial<{ toJSON(): Record<string, unknown> }>;
    const boardJson = typeof boardWithToJson.toJSON === "function"
      ? boardWithToJson.toJSON()
      : (board as unknown as Record<string, unknown>);
    const columns = boardJson.columns as Array<{ position: number }>;
    columns.sort((a, b) => a.position - b.position);

    return reply.code(200).send({ data: boardJson });
  });
};

function isValidCreateColumnBody(
  body: unknown,
): body is { name: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return false;
  }

  return true;
}

function isValidReorderBody(
  body: unknown,
): body is { columnIds: string[] } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { columnIds } = body as Record<string, unknown>;

  if (!Array.isArray(columnIds)) {
    return false;
  }

  if (columnIds.length === 0) {
    return false;
  }

  for (const id of columnIds) {
    if (typeof id !== "string") {
      return false;
    }
  }

  return true;
}

export const columnRoutes: FastifyPluginAsync = async (app) => {
  app.post("/:boardId/columns", async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
    }

    if (!isValidCreateColumnBody(request.body)) {
      return reply.code(400).send({ error: "Column name is required" });
    }

    const { name } = request.body;
    const board = await BoardModel.findOne({ _id: boardId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const position = board.columns.length;
    const columns = board.columns as unknown as Array<{
      _id?: unknown;
      name: string;
      position: number;
    }>;
    columns.push({
      name,
      position,
    });
    const newColumn = columns[columns.length - 1] as {
      _id?: unknown;
      name: string;
      position: number;
      toJSON?: () => Record<string, unknown>;
    };

    if (newColumn._id === undefined) {
      newColumn._id = new (mongoose as unknown as {
        Types: { ObjectId: new () => { toString(): string } };
      }).Types.ObjectId();
    }
    const boardWithSave = board as unknown as {
      save?: () => Promise<void>;
      columns: unknown;
    };

    if (typeof boardWithSave.save === "function") {
      await boardWithSave.save();
    } else {
      await (BoardModel as unknown as {
        findOneAndUpdate(
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
        ): Promise<Record<string, unknown> | null>;
      }).findOneAndUpdate(
        { _id: boardId },
        { columns: boardWithSave.columns as Record<string, unknown>[] },
      );
    }

    const columnWithToJson = newColumn as unknown as Partial<{ toJSON(): Record<string, unknown> }>;
    const columnData = typeof columnWithToJson.toJSON === "function"
      ? columnWithToJson.toJSON()
      : newColumn;

    return reply.code(201).send({ data: columnData });
  });

  app.put("/:boardId/columns/reorder", async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
    }

    if (!isValidReorderBody(request.body)) {
      return reply.code(400).send({ error: "columnIds must be a non-empty array of strings" });
    }

    const { columnIds } = request.body;
    const board = await BoardModel.findOne({ _id: boardId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const columns = board.columns as unknown as Array<{
      _id: unknown;
      name: string;
      position: number;
    }>;

    if (columnIds.length !== columns.length) {
      return reply.code(400).send({ error: "columnIds must include every column exactly once" });
    }

    const uniqueIds = new Set(columnIds);
    if (uniqueIds.size !== columnIds.length) {
      return reply.code(400).send({ error: "columnIds must include every column exactly once" });
    }

    const columnMap = new Map<string, typeof columns[number]>();
    for (const col of columns) {
      columnMap.set(String(col._id), col);
    }

    for (const id of columnIds) {
      if (!columnMap.has(id)) {
        return reply.code(400).send({ error: "columnIds must include every column exactly once" });
      }
    }

    for (let i = 0; i < columnIds.length; i++) {
      const column = columnMap.get(columnIds[i]);
      if (!column) {
        return reply.code(400).send({ error: "columnIds must include every column exactly once" });
      }
      column.position = i;
    }

    const boardWithSave = board as unknown as {
      save?: () => Promise<void>;
      columns: unknown;
    };

    if (typeof boardWithSave.save === "function") {
      await boardWithSave.save();
    } else {
      await (BoardModel as unknown as {
        findOneAndUpdate(
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
        ): Promise<Record<string, unknown> | null>;
      }).findOneAndUpdate(
        { _id: boardId },
        { columns: boardWithSave.columns as Record<string, unknown>[] },
      );
    }

    const boardWithToJson = board as unknown as Partial<{ toJSON(): Record<string, unknown> }>;
    const boardJson = typeof boardWithToJson.toJSON === "function"
      ? boardWithToJson.toJSON()
      : (board as unknown as Record<string, unknown>);
    const sortedColumns = boardJson.columns as Array<{ position: number }>;
    sortedColumns.sort((a, b) => a.position - b.position);

    return reply.code(200).send({ data: boardJson });
  });

  app.put("/:boardId/columns/:columnId", async (request, reply) => {
    const { boardId, columnId } = request.params as {
      boardId: string;
      columnId: string;
    };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
    }

    if (!isValidObjectId(columnId)) {
      return reply.code(400).send({ error: "Invalid column ID" });
    }

    if (!isValidCreateColumnBody(request.body)) {
      return reply.code(400).send({ error: "Column name is required" });
    }

    const { name } = request.body;
    const board = await BoardModel.findOne({ _id: boardId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const columns = board.columns as unknown as Array<{
      _id: unknown;
      name: string;
      position: number;
      toJSON?: () => Record<string, unknown>;
    }>;
    const column = columns.find((col) => String(col._id) === columnId);

    if (!column) {
      return reply.code(404).send({ error: "Column not found" });
    }

    column.name = name;

    const boardWithSave = board as unknown as {
      save?: () => Promise<void>;
      columns: unknown;
    };

    if (typeof boardWithSave.save === "function") {
      await boardWithSave.save();
    } else {
      await (BoardModel as unknown as {
        findOneAndUpdate(
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
        ): Promise<Record<string, unknown> | null>;
      }).findOneAndUpdate(
        { _id: boardId },
        { columns: boardWithSave.columns as Record<string, unknown>[] },
      );
    }

    const columnWithToJson = column as unknown as Partial<{ toJSON(): Record<string, unknown> }>;
    const columnData = typeof columnWithToJson.toJSON === "function"
      ? columnWithToJson.toJSON()
      : column;

    return reply.code(200).send({ data: columnData });
  });

  app.delete("/:boardId/columns/:columnId", async (request, reply) => {
    const { boardId, columnId } = request.params as {
      boardId: string;
      columnId: string;
    };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
    }

    if (!isValidObjectId(columnId)) {
      return reply.code(400).send({ error: "Invalid column ID" });
    }

    const board = await BoardModel.findOne({ _id: boardId });

    if (!board) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Board not found" });
    }

    const columns = board.columns as unknown as Array<{
      _id: unknown;
      name: string;
      position: number;
    }>;
    const column = columns.find((col) => String(col._id) === columnId);

    if (!column) {
      return reply.code(404).send({ error: "Column not found" });
    }

    const taskCount = await (TaskModel as unknown as {
      countDocuments(filter: Record<string, unknown>): Promise<number>;
    }).countDocuments({ board: boardId, status: column.name });

    if (taskCount > 0) {
      return reply.code(400).send({ error: "Cannot delete column that contains tasks" });
    }

    const remaining = columns.filter((col) => String(col._id) !== columnId);
    remaining.forEach((col, index) => {
      col.position = index;
    });

    (board as unknown as { columns: typeof remaining }).columns = remaining;

    const boardWithSave = board as unknown as {
      save?: () => Promise<void>;
      columns: unknown;
    };

    if (typeof boardWithSave.save === "function") {
      await boardWithSave.save();
    } else {
      await (BoardModel as unknown as {
        findOneAndUpdate(
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
        ): Promise<Record<string, unknown> | null>;
      }).findOneAndUpdate(
        { _id: boardId },
        { columns: boardWithSave.columns as Record<string, unknown>[] },
      );
    }

    return reply.code(200).send({ data: { message: "Column deleted" } });
  });
};
