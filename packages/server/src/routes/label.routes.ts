import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { LabelModel, TaskModel, ProjectModel } from "../models/index.js";

function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}

function isValidCreateLabelBody(
  body: unknown,
): body is { name: string; color: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name, color } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return false;
  }

  if (typeof color !== "string" || color.trim().length === 0) {
    return false;
  }

  return true;
}

function isValidUpdateLabelBody(
  body: unknown,
): body is { name?: string; color?: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name, color } = body as Record<string, unknown>;

  if (name === undefined && color === undefined) {
    return false;
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return false;
  }

  if (color !== undefined && (typeof color !== "string" || color.trim().length === 0)) {
    return false;
  }

  return true;
}

export const projectLabelRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:projectId/labels", async (request, reply) => {
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

    const labels = await (LabelModel as unknown as {
      find(filter: Record<string, unknown>): {
        sort(sortObj: Record<string, number>): Promise<unknown[]>;
      };
    }).find({ project: projectId }).sort({ createdAt: 1 });

    return reply.code(200).send({ data: labels });
  });

  app.post("/:projectId/labels", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    if (!isValidObjectId(projectId)) {
      return reply.code(400).send({ error: "Invalid project ID" });
    }

    if (!isValidCreateLabelBody(request.body)) {
      return reply.code(400).send({ error: "Label name and color are required" });
    }

    const project = await ProjectModel.findOne({
      _id: projectId,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const label = await LabelModel.create({
      name: request.body.name,
      color: request.body.color,
      project: projectId,
    });

    return reply.code(201).send({ data: label });
  });
};

export const labelRoutes: FastifyPluginAsync = async (app) => {
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid label ID" });
    }

    if (!isValidUpdateLabelBody(request.body)) {
      return reply.code(400).send({ error: "At least one valid field is required" });
    }

    const label = await LabelModel.findOne({ _id: id });

    if (!label) {
      return reply.code(404).send({ error: "Label not found" });
    }

    const project = await ProjectModel.findOne({
      _id: label.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Label not found" });
    }

    const { name, color } = request.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;

    const updatedLabel = await (LabelModel as unknown as {
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

    return reply.code(200).send({ data: updatedLabel });
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid label ID" });
    }

    const label = await LabelModel.findOne({ _id: id });

    if (!label) {
      return reply.code(404).send({ error: "Label not found" });
    }

    const project = await ProjectModel.findOne({
      _id: label.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Label not found" });
    }

    await (TaskModel as unknown as {
      updateMany(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
      ): Promise<unknown>;
    }).updateMany(
      { labels: id },
      { $pull: { labels: id } },
    );

    await (LabelModel as unknown as {
      deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }>;
    }).deleteOne({ _id: id });

    return reply.code(200).send({ data: { message: "Label deleted" } });
  });
};
