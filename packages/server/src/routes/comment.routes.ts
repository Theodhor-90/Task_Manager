import type { FastifyPluginAsync } from "fastify";
import mongoose from "mongoose";
import { CommentModel, TaskModel, BoardModel, ProjectModel } from "../models/index.js";

function isValidObjectId(value: unknown): boolean {
  return (mongoose as unknown as {
    Types: { ObjectId: { isValid(input: string): boolean } };
  }).Types.ObjectId.isValid(value as string);
}

function isValidCreateCommentBody(
  body: unknown,
): body is { body: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { body: commentBody } = body as Record<string, unknown>;

  if (typeof commentBody !== "string" || commentBody.trim().length === 0) {
    return false;
  }

  return true;
}

function isValidUpdateCommentBody(
  body: unknown,
): body is { body: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { body: commentBody } = body as Record<string, unknown>;

  if (typeof commentBody !== "string" || commentBody.trim().length === 0) {
    return false;
  }

  return true;
}

export const taskCommentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:taskId/comments", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };

    if (!isValidObjectId(taskId)) {
      return reply.code(400).send({ error: "Invalid task ID" });
    }

    const task = await TaskModel.findOne({ _id: taskId });

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

    const comments = await (CommentModel as unknown as {
      find(filter: Record<string, unknown>): {
        sort(sortObj: Record<string, number>): {
          populate(
            path: string,
            select: string,
          ): Promise<unknown[]>;
        };
      };
    }).find({ task: taskId }).sort({ createdAt: 1 }).populate("author", "name email");

    return reply.code(200).send({ data: comments });
  });

  app.post("/:taskId/comments", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };

    if (!isValidObjectId(taskId)) {
      return reply.code(400).send({ error: "Invalid task ID" });
    }

    if (!isValidCreateCommentBody(request.body)) {
      return reply.code(400).send({ error: "Comment body is required" });
    }

    const task = await TaskModel.findOne({ _id: taskId });

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

    const comment = await CommentModel.create({
      body: request.body.body,
      task: taskId,
      author: request.user.id,
    });

    return reply.code(201).send({ data: comment });
  });
};

export const commentRoutes: FastifyPluginAsync = async (app) => {
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid comment ID" });
    }

    if (!isValidUpdateCommentBody(request.body)) {
      return reply.code(400).send({ error: "Comment body is required" });
    }

    const comment = await CommentModel.findOne({ _id: id });

    if (!comment) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const task = await TaskModel.findOne({ _id: comment.task });

    if (!task) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const board = await BoardModel.findOne({ _id: task.board });

    if (!board) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const updatedComment = await (CommentModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: id },
      { body: request.body.body },
      { new: true },
    );

    return reply.code(200).send({ data: updatedComment });
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid comment ID" });
    }

    const comment = await CommentModel.findOne({ _id: id });

    if (!comment) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const task = await TaskModel.findOne({ _id: comment.task });

    if (!task) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const board = await BoardModel.findOne({ _id: task.board });

    if (!board) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    const project = await ProjectModel.findOne({
      _id: board.project,
      owner: request.user.id,
    });

    if (!project) {
      return reply.code(404).send({ error: "Comment not found" });
    }

    await (CommentModel as unknown as {
      deleteOne(filter: Record<string, unknown>): Promise<unknown>;
    }).deleteOne({ _id: id });

    return reply.code(200).send({ data: { message: "Comment deleted" } });
  });
};
