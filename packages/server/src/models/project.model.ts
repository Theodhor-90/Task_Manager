import mongoose, { Schema, type Document } from "mongoose";

export interface ProjectDocument extends Document {
  name: string;
  description: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      type: String,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = mongoose.model<ProjectDocument>(
  "Project",
  projectSchema
);
