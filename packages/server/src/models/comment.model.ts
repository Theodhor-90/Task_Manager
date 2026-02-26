import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface CommentDocument extends Document {
  body: string;
  task: string | Types.ObjectId;
  author: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    body: {
      type: String,
      required: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CommentModel = mongoose.model<CommentDocument>(
  "Comment",
  commentSchema
);
