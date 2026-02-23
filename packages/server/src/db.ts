import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDb(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}
