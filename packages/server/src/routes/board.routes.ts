import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { ProjectModel, BoardModel } from "../models/index.js";

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

export const columnRoutes: FastifyPluginAsync = async (_app) => {
  // Column endpoints will be added in Tasks 2-5
};
