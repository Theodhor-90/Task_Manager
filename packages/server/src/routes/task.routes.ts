import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { PRIORITIES } from "@taskboard/shared";
import { TaskModel, BoardModel, ProjectModel, CommentModel } from "../models/index.js";

function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}

function isValidDateString(value: string): boolean {
  return Number.isNaN(Date.parse(value)) === false;
}

function isValidCreateTaskBody(
  body: unknown,
): body is {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  labels?: string[];
  status?: string;
} {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { title, description, priority, dueDate, labels, status } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return false;
  }

  if (description !== undefined && typeof description !== "string") {
    return false;
  }

  if (
    priority !== undefined
    && (typeof priority !== "string" || !(PRIORITIES as readonly string[]).includes(priority))
  ) {
    return false;
  }

  if (
    dueDate !== undefined
    && (typeof dueDate !== "string" || !isValidDateString(dueDate))
  ) {
    return false;
  }

  if (labels !== undefined) {
    if (!Array.isArray(labels)) {
      return false;
    }

    for (const label of labels) {
      if (typeof label !== "string") {
        return false;
      }
    }
  }

  if (status !== undefined && (typeof status !== "string" || status.trim().length === 0)) {
    return false;
  }

  return true;
}

function isValidUpdateTaskBody(
  body: unknown,
): body is {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  labels?: string[];
} {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { title, description, priority, dueDate, labels } = body as Record<string, unknown>;

  if (
    title === undefined
    && description === undefined
    && priority === undefined
    && dueDate === undefined
    && labels === undefined
  ) {
    return false;
  }

  if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
    return false;
  }

  if (description !== undefined && typeof description !== "string") {
    return false;
  }

  if (
    priority !== undefined
    && (typeof priority !== "string" || !(PRIORITIES as readonly string[]).includes(priority))
  ) {
    return false;
  }

  if (
    dueDate !== undefined
    && dueDate !== null
    && (typeof dueDate !== "string" || !isValidDateString(dueDate))
  ) {
    return false;
  }

  if (labels !== undefined) {
    if (!Array.isArray(labels)) {
      return false;
    }

    for (const label of labels) {
      if (typeof label !== "string") {
        return false;
      }
    }
  }

  return true;
}

function isValidMoveTaskBody(
  body: unknown,
): body is {
  position: number;
  status?: string;
} {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { position, status } = body as Record<string, unknown>;

  if (typeof position !== "number" || !Number.isInteger(position) || position < 0) {
    return false;
  }

  if (status !== undefined && (typeof status !== "string" || status.trim().length === 0)) {
    return false;
  }

  return true;
}

export const boardTaskRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:boardId/tasks", async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
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

    const query = request.query as Record<string, string | undefined>;
    const { status, priority, label, sort, order } = query;
    const filter: Record<string, unknown> = { board: boardId };

    if (status !== undefined) {
      filter.status = status;
    }

    if (priority !== undefined) {
      filter.priority = priority;
    }

    if (label !== undefined) {
      filter.labels = label;
    }

    const allowedSortFields = ["createdAt", "dueDate", "position"];
    const sortField = sort !== undefined && allowedSortFields.includes(sort) ? sort : "position";
    const sortDirection = order === "desc" ? -1 : 1;
    const sortObj: Record<string, number> = { [sortField]: sortDirection };

    const tasks = await (TaskModel as unknown as {
      find(filter: Record<string, unknown>): {
        sort(sortObj: Record<string, number>): Promise<unknown[]>;
      };
    }).find(filter).sort(sortObj);

    return reply.code(200).send({ data: tasks });
  });

  app.post("/:boardId/tasks", async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    if (!isValidObjectId(boardId)) {
      return reply.code(400).send({ error: "Invalid board ID" });
    }

    if (!isValidCreateTaskBody(request.body)) {
      return reply.code(400).send({ error: "Title is required" });
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

    const { title, description, priority, dueDate, labels, status } = request.body;
    const columns = board.columns as unknown as Array<{
      _id: unknown;
      name: string;
      position: number;
    }>;
    const columnNames = columns.map((column) => column.name);

    if (status !== undefined && !columnNames.includes(status)) {
      return reply.code(400).send({ error: "Invalid status: does not match any column" });
    }

    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const resolvedStatus = status ?? sortedColumns[0].name;
    const resolvedPriority = priority ?? "medium";
    const position = await (TaskModel as unknown as {
      countDocuments(filter: Record<string, unknown>): Promise<number>;
    }).countDocuments({ board: boardId, status: resolvedStatus });

    const task = await TaskModel.create({
      title,
      description,
      status: resolvedStatus,
      priority: resolvedPriority,
      position,
      dueDate: dueDate ?? null,
      labels: labels ?? [],
      board: boardId,
      project: board.project,
    } as Record<string, unknown>);

    return reply.code(201).send({ data: task });
  });
};

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid task ID" });
    }

    const task = await (TaskModel as unknown as {
      findOne(filter: Record<string, unknown>): {
        populate(field: string): Promise<Record<string, unknown> | null>;
      };
    }).findOne({ _id: id }).populate("labels");

    if (!task) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const board = await BoardModel.findOne({ _id: task.board });

    if (!board) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Task not found" });
    }

    return reply.code(200).send({ data: task });
  });

  app.put("/:id/move", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid task ID" });
    }

    if (!isValidMoveTaskBody(request.body)) {
      return reply.code(400).send({ error: "Position is required and must be a non-negative integer" });
    }

    const { position, status } = request.body;
    const task = await TaskModel.findOne({ _id: id });

    if (!task) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const board = await BoardModel.findOne({ _id: task.board });

    if (!board) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const columns = board.columns as unknown as Array<{
      _id: unknown;
      name: string;
      position: number;
    }>;
    const columnNames = columns.map((col) => col.name);
    const sourceStatus = task.status as string;
    const targetStatus = status ?? sourceStatus;

    if (!columnNames.includes(targetStatus)) {
      return reply.code(400).send({ error: "Invalid status: does not match any column" });
    }

    const isCrossColumnMove = targetStatus !== sourceStatus;
    const sourceTasks = await (TaskModel as unknown as {
      find(filter: Record<string, unknown>): {
        sort(sortObj: Record<string, number>): Promise<Array<{ _id: unknown; position: number }>>;
      };
    }).find({ board: task.board, status: sourceStatus, _id: { $ne: id } }).sort({ position: 1 });

    for (let i = 0; i < sourceTasks.length; i++) {
      if (sourceTasks[i].position !== i) {
        await (TaskModel as unknown as {
          findOneAndUpdate(
            filter: Record<string, unknown>,
            update: Record<string, unknown>,
            options: Record<string, unknown>,
          ): Promise<Record<string, unknown> | null>;
        }).findOneAndUpdate(
          { _id: sourceTasks[i]._id },
          { position: i },
          { new: true },
        );
      }
    }

    let destinationCount: number;

    if (isCrossColumnMove) {
      destinationCount = await (TaskModel as unknown as {
        countDocuments(filter: Record<string, unknown>): Promise<number>;
      }).countDocuments({ board: task.board, status: targetStatus });
    } else {
      destinationCount = sourceTasks.length;
    }

    const clampedPosition = Math.min(position, destinationCount);

    if (isCrossColumnMove) {
      const destTasks = await (TaskModel as unknown as {
        find(filter: Record<string, unknown>): {
          sort(sortObj: Record<string, number>): Promise<Array<{ _id: unknown; position: number }>>;
        };
      }).find({ board: task.board, status: targetStatus, position: { $gte: clampedPosition } }).sort({
        position: 1,
      });

      for (const destTask of destTasks) {
        await (TaskModel as unknown as {
          findOneAndUpdate(
            filter: Record<string, unknown>,
            update: Record<string, unknown>,
            options: Record<string, unknown>,
          ): Promise<Record<string, unknown> | null>;
        }).findOneAndUpdate(
          { _id: destTask._id },
          { position: destTask.position + 1 },
          { new: true },
        );
      }
    } else {
      for (let i = sourceTasks.length - 1; i >= clampedPosition; i--) {
        await (TaskModel as unknown as {
          findOneAndUpdate(
            filter: Record<string, unknown>,
            update: Record<string, unknown>,
            options: Record<string, unknown>,
          ): Promise<Record<string, unknown> | null>;
        }).findOneAndUpdate(
          { _id: sourceTasks[i]._id },
          { position: i + 1 },
          { new: true },
        );
      }
    }

    const updatedTask = await (TaskModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: id },
      { status: targetStatus, position: clampedPosition },
      { new: true },
    );

    return reply.code(200).send({ data: updatedTask });
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid task ID" });
    }

    if (!isValidUpdateTaskBody(request.body)) {
      return reply.code(400).send({ error: "At least one valid field is required" });
    }

    const task = await TaskModel.findOne({ _id: id });

    if (!task) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const board = await BoardModel.findOne({ _id: task.board });

    if (!board) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const { title, description, priority, dueDate, labels } = request.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (labels !== undefined) updates.labels = labels;

    const updatedTask = await (TaskModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: id },
      updates,
      { new: true },
    );

    return reply.code(200).send({ data: updatedTask });
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid task ID" });
    }

    const task = await TaskModel.findOne({ _id: id });

    if (!task) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const board = await BoardModel.findOne({ _id: task.board });

    if (!board) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Task not found" });
    }

    const taskBoard = task.board;
    const taskStatus = task.status;

    await CommentModel.deleteMany({ task: id } as Record<string, unknown>);
    await (TaskModel as unknown as {
      deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }>;
    }).deleteOne({ _id: id } as Record<string, unknown>);

    const remainingTasks = await (TaskModel as unknown as {
      find(filter: Record<string, unknown>): {
        sort(
          sortObj: Record<string, number>,
        ): Promise<Array<{ _id: unknown; position: number; save?: () => Promise<void> }>>;
      };
    }).find({ board: taskBoard, status: taskStatus }).sort({ position: 1 });

    for (let i = 0; i < remainingTasks.length; i++) {
      if (remainingTasks[i].position !== i) {
        await (TaskModel as unknown as {
          findOneAndUpdate(
            filter: Record<string, unknown>,
            update: Record<string, unknown>,
            options: Record<string, unknown>,
          ): Promise<Record<string, unknown> | null>;
        }).findOneAndUpdate(
          { _id: remainingTasks[i]._id },
          { position: i },
          { new: true },
        );
      }
    }

    return reply.code(200).send({ data: { message: "Task deleted" } });
  });
};
