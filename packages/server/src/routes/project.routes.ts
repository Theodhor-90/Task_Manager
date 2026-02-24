import type { FastifyPluginAsync } from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { BoardModel, ProjectModel } from "../models/index.js";

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
};
