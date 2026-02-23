import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { setDryRun } from "../src/config.js";
import { setMockDecisions } from "../src/agents.js";
import { runIterationCycle, type CycleContext } from "../src/cycle.js";
import { initLogger } from "../src/logger.js";

const TEST_DIR = join(import.meta.dirname ?? ".", ".test-artifacts");
const ARTIFACT_DIR = join(TEST_DIR, "artifacts");

function makeCycleContext(overrides?: Partial<CycleContext>): CycleContext {
  return {
    label: "test",
    level: "task",
    levelConfig: {
      agents: { creator: "opus", challenger: "codex", tiebreaker: "opus" },
      maxIterations: 3,
      templates: {
        draft: "task/draft",
        challenge: "task/challenge",
        refine: "task/refine",
        tiebreak: "task/tiebreak",
      },
      creatorOptions: { tools: ["Read", "Glob", "Grep"] },
      challengerOptions: { tools: ["Read", "Glob", "Grep"], schema: "challenge-decision.json" },
      tiebreakerOptions: { tools: ["Read", "Glob", "Grep"] },
    },
    artifactDir: ARTIFACT_DIR,
    templateVars: {
      MASTER_PLAN_PATH: "MASTER_PLAN.md",
      MILESTONE_SPEC_PATH: join(ARTIFACT_DIR, "milestone-spec.md"),
      PHASE_SPEC_PATH: join(ARTIFACT_DIR, "phase-spec.md"),
      SPEC_PATH: join(ARTIFACT_DIR, "spec.md"),
      COMPLETED_SIBLINGS_SECTION: "",
    },
    artifactNames: {
      draftPrefix: "plan-v",
      feedbackPrefix: "feedback-v",
      lockedName: "plan-locked.md",
    },
    ...overrides,
  };
}

beforeEach(() => {
  setDryRun(true);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, "logs"), { recursive: true });
  initLogger(join(TEST_DIR, "logs"));
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("runIterationCycle", () => {
  it("approves on first iteration", () => {
    setMockDecisions([{ verdict: "approved", feedback: "" }]);

    const result = runIterationCycle(makeCycleContext());

    expect(result.tiebreakerUsed).toBe(false);
    expect(result.iterations).toBe(1);
    expect(existsSync(join(ARTIFACT_DIR, "plan-v1.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "feedback-v1.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "plan-locked.md"))).toBe(true);
  });

  it("approves on second iteration after one rejection", () => {
    setMockDecisions([
      { verdict: "needs_revision", feedback: "Fix section X" },
      { verdict: "approved", feedback: "" },
    ]);

    const result = runIterationCycle(makeCycleContext());

    expect(result.tiebreakerUsed).toBe(false);
    expect(result.iterations).toBe(2);
    expect(existsSync(join(ARTIFACT_DIR, "plan-v1.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "plan-v2.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "plan-locked.md"))).toBe(true);
  });

  it("invokes tiebreaker after 3 rejections", () => {
    setMockDecisions([
      { verdict: "needs_revision", feedback: "Issue 1" },
      { verdict: "needs_revision", feedback: "Issue 2" },
      { verdict: "needs_revision", feedback: "Issue 3" },
    ]);

    const result = runIterationCycle(makeCycleContext());

    expect(result.tiebreakerUsed).toBe(true);
    expect(result.iterations).toBe(3);
    expect(existsSync(join(ARTIFACT_DIR, "plan-v1.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "plan-v2.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "plan-v3.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "feedback-v3.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "tiebreak.md"))).toBe(true);
    expect(existsSync(join(ARTIFACT_DIR, "plan-locked.md"))).toBe(true);
  });

  it("skips cycle if locked artifact already exists", () => {
    writeFileSync(join(ARTIFACT_DIR, "plan-locked.md"), "already locked", "utf-8");

    const result = runIterationCycle(makeCycleContext());

    expect(result.tiebreakerUsed).toBe(false);
    expect(result.iterations).toBe(0);
    expect(result.artifact).toBe("already locked");
  });

  it("resumes from existing draft on disk", () => {
    // Simulate a crash after draft v1 was written but before challenge
    writeFileSync(join(ARTIFACT_DIR, "plan-v1.md"), "existing draft", "utf-8");
    setMockDecisions([{ verdict: "approved", feedback: "" }]);

    const result = runIterationCycle(makeCycleContext());

    expect(result.tiebreakerUsed).toBe(false);
    expect(result.iterations).toBe(1);
    // The existing draft should have been kept, not overwritten
    const draft = readFileSync(join(ARTIFACT_DIR, "plan-v1.md"), "utf-8");
    expect(draft).toBe("existing draft");
  });

  it("resumes from existing approved feedback on disk", () => {
    writeFileSync(join(ARTIFACT_DIR, "plan-v1.md"), "existing draft", "utf-8");
    writeFileSync(
      join(ARTIFACT_DIR, "feedback-v1.md"),
      JSON.stringify({ verdict: "approved", feedback: "" }),
      "utf-8",
    );

    const result = runIterationCycle(makeCycleContext());

    expect(result.tiebreakerUsed).toBe(false);
    expect(result.iterations).toBe(1);
    expect(existsSync(join(ARTIFACT_DIR, "plan-locked.md"))).toBe(true);
  });
});
