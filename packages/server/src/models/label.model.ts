import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface LabelDocument extends Document {
  name: string;
  color: string;
  project: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const labelSchema = new Schema<LabelDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
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

export const LabelModel = mongoose.model<LabelDocument>("Label", labelSchema);
