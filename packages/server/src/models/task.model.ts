import { model, Schema, type Document, type Types } from "mongoose";
import { PRIORITIES } from "@taskboard/shared";

export interface TaskDocument extends Document {
  title: string;
  description: string;
  status: string;
  priority: string;
  position: number;
  dueDate: Date | null;
  labels: Types.ObjectId[];
  board: Types.ObjectId;
  project: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "medium",
    },
    position: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    labels: [
      {
        type: Schema.Types.ObjectId,
        ref: "Label",
      },
    ],
    board: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TaskModel = model<TaskDocument>("Task", taskSchema);
