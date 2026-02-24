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
  app.get("/:boardId/tasks", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
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
  app.get("/:id", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  app.put("/:id/move", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  app.put("/:id", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });

  app.delete("/:id", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });
};
