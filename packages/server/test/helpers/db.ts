import mongoose from "mongoose";
import {
  BoardModel,
  CommentModel,
  LabelModel,
  ProjectModel,
  TaskModel,
  UserModel,
} from "../../src/models/index.js";

const TEST_DB_URI = "mongodb://localhost:27017/taskboard_test";
const TEST_MODELS = [
  UserModel,
  ProjectModel,
  BoardModel,
  TaskModel,
  CommentModel,
  LabelModel,
];

export async function setupTestDb(): Promise<void> {
  await mongoose.connect(TEST_DB_URI);
}

export async function teardownTestDb(): Promise<void> {
  const connection = mongoose.connection as any;
  if (typeof connection.dropDatabase === "function") {
    await connection.dropDatabase();
  } else {
    await clearCollections();
  }
  await mongoose.disconnect();
}

export async function clearCollections(): Promise<void> {
  const connection = mongoose.connection as any;
  if (connection.collections) {
    const collections = connection.collections as Record<
      string,
      { deleteMany: (filter: Record<string, unknown>) => Promise<unknown> }
    >;

    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    return;
  }

  await Promise.all(TEST_MODELS.map((model) => model.deleteMany({})));
}
