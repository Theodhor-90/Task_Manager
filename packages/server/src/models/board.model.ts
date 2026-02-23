import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ColumnDocument {
  _id: Types.ObjectId;
  name: string;
  position: number;
}

export interface BoardDocument extends Document {
  project: Types.ObjectId;
  columns: Types.DocumentArray<ColumnDocument>;
  createdAt: Date;
  updatedAt: Date;
}

const columnSchema = new Schema<ColumnDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
  }
);

const boardSchema = new Schema<BoardDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    columns: [columnSchema],
  },
  {
    timestamps: true,
  }
);

export const BoardModel = mongoose.model<BoardDocument>("Board", boardSchema);
