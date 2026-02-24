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

  app.post("/:boardId/tasks", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
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
