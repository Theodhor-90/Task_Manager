import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { BoardModel, ProjectModel, TaskModel, CommentModel, LabelModel } from "../models/index.js";

type FindProjectsModel = {
  find(filter: Record<string, unknown>): {
    sort(sortObj: Record<string, unknown>): Promise<unknown[]>;
  };
};

type JsonSerializable = {
  toJSON(): unknown;
};

function isValidCreateProjectBody(
  body: unknown,
): body is { name: string; description?: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name, description } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return false;
  }

  if (description !== undefined && typeof description !== "string") {
    return false;
  }

  return true;
}

function isValidUpdateProjectBody(
  body: unknown,
): body is { name?: string; description?: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name, description } = body as Record<string, unknown>;
  const hasName = name !== undefined;
  const hasDescription = description !== undefined;

  if (!hasName && !hasDescription) {
    return false;
  }

  if (hasName && (typeof name !== "string" || name.trim().length === 0)) {
    return false;
  }

  if (hasDescription && typeof description !== "string") {
    return false;
  }

  return true;
}

function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => {
    if (!isValidCreateProjectBody(request.body)) {
      return reply.code(400).send({ error: "Project name is required" });
    }

    const { name, description = "" } = request.body;

    const project = await ProjectModel.create({
      name,
      description,
      owner: request.user.id,
    });

    const columns = DEFAULT_COLUMNS.map((columnName, index) => ({
      name: columnName,
      position: index,
    }));

    try {
      await BoardModel.create({
        project: project._id as string,
        columns,
      } as Record<string, unknown>);
    } catch {
      await ProjectModel.deleteMany({ _id: project._id });
      return reply.code(500).send({ error: "Failed to create project" });
    }

    const projectWithToJson = project as unknown as Partial<JsonSerializable>;
    const projectData = typeof projectWithToJson.toJSON === "function"
      ? projectWithToJson.toJSON()
      : project;

    return reply.code(201).send({ data: projectData });
  });

  app.get("/", async (request, reply) => {
    const projects = await (ProjectModel as unknown as FindProjectsModel)
      .find({ owner: request.user.id })
      .sort({ createdAt: -1 });

    return reply.code(200).send({ data: projects });
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid project ID" });
    }

    const project = await ProjectModel.findOne({
      _id: id,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    return reply.code(200).send({ data: project });
  });

  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid project ID" });
    }

    if (!isValidUpdateProjectBody(request.body)) {
      return reply.code(400).send({ error: "Name or description is required" });
    }

    const { name, description } = request.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const updatedProject = await (ProjectModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: id, owner: request.user.id },
      updates,
      { new: true },
    );

    if (!updatedProject) {
      return reply.code(404).send({ error: "Project not found" });
    }

    return reply.code(200).send({ data: updatedProject });
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid project ID" });
    }

    const project = await ProjectModel.findOne({
      _id: id,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const board = await BoardModel.findOne({ project: id });

    if (board) {
      const tasks = await (TaskModel as unknown as FindProjectsModel)
        .find({ board: board._id })
        .sort({ createdAt: 1 });

      const taskIds = (tasks as Record<string, unknown>[]).map((task) => task._id);

      if (taskIds.length > 0) {
        await CommentModel.deleteMany({ task: { $in: taskIds } } as Record<string, unknown>);
      }
      await TaskModel.deleteMany({ board: board._id } as Record<string, unknown>);
      await LabelModel.deleteMany({ project: id } as Record<string, unknown>);
      await (BoardModel as unknown as { deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> })
        .deleteOne({ _id: board._id });
    } else {
      await LabelModel.deleteMany({ project: id } as Record<string, unknown>);
    }

    await (ProjectModel as unknown as { deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> })
      .deleteOne({ _id: id });

    return reply.code(200).send({ data: { message: "Project deleted" } });
  });
};
