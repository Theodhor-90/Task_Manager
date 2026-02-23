import { describe, it, expect } from "vitest";
import { PRIORITIES, DEFAULT_COLUMNS } from "../constants/index.js";

describe("PRIORITIES", () => {
  it("has exactly 4 priority levels", () => {
    expect(PRIORITIES).toHaveLength(4);
  });

  it("contains the expected values in order", () => {
    expect(PRIORITIES).toEqual(["low", "medium", "high", "urgent"]);
  });
});

describe("DEFAULT_COLUMNS", () => {
  it("has exactly 4 default columns", () => {
    expect(DEFAULT_COLUMNS).toHaveLength(4);
  });

  it("contains the expected values in order", () => {
    expect(DEFAULT_COLUMNS).toEqual([
      "To Do",
      "In Progress",
      "In Review",
      "Done",
    ]);
  });
});
