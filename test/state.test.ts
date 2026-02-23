import { describe, it, expect } from "vitest";
import {
  type PipelineState,
  transitionMilestone,
  transitionPhase,
  transitionTask,
  findResumePoint,
  makeDefaultMilestoneState,
  makeDefaultPhaseState,
  makeDefaultTaskState,
  makeDefaultIterationState,
} from "../src/state.js";

function makeState(overrides?: Partial<PipelineState>): PipelineState {
  return {
    project: "test",
    currentMilestone: null,
    milestones: {},
    ...overrides,
  };
}

describe("transitionMilestone", () => {
  it("allows pending → planning", () => {
    const state = makeState({
      milestones: { m01: makeDefaultMilestoneState() },
    });
    transitionMilestone(state, "m01", "planning");
    expect(state.milestones.m01.status).toBe("planning");
  });

  it("allows planning → spec_locked", () => {
    const state = makeState({
      milestones: { m01: { ...makeDefaultMilestoneState(), status: "planning" } },
    });
    transitionMilestone(state, "m01", "spec_locked");
    expect(state.milestones.m01.status).toBe("spec_locked");
  });

  it("allows spec_locked → in_progress", () => {
    const state = makeState({
      milestones: { m01: { ...makeDefaultMilestoneState(), status: "spec_locked" } },
    });
    transitionMilestone(state, "m01", "in_progress");
    expect(state.milestones.m01.status).toBe("in_progress");
  });

  it("allows in_progress → completed", () => {
    const state = makeState({
      milestones: { m01: { ...makeDefaultMilestoneState(), status: "in_progress" } },
    });
    transitionMilestone(state, "m01", "completed");
    expect(state.milestones.m01.status).toBe("completed");
  });

  it("rejects invalid transitions", () => {
    const state = makeState({
      milestones: { m01: makeDefaultMilestoneState() },
    });
    expect(() => transitionMilestone(state, "m01", "completed")).toThrow(
      "Invalid milestone transition",
    );
  });

  it("rejects transitions from completed", () => {
    const state = makeState({
      milestones: { m01: { ...makeDefaultMilestoneState(), status: "completed" } },
    });
    expect(() => transitionMilestone(state, "m01", "planning")).toThrow(
      "Invalid milestone transition",
    );
  });
});

describe("transitionPhase", () => {
  it("allows full lifecycle", () => {
    const ms = makeDefaultMilestoneState();
    ms.phases.p01 = makeDefaultPhaseState();
    const state = makeState({ milestones: { m01: ms } });

    transitionPhase(state, "m01", "p01", "planning");
    expect(state.milestones.m01.phases.p01.status).toBe("planning");

    transitionPhase(state, "m01", "p01", "spec_locked");
    expect(state.milestones.m01.phases.p01.status).toBe("spec_locked");

    transitionPhase(state, "m01", "p01", "in_progress");
    expect(state.milestones.m01.phases.p01.status).toBe("in_progress");

    transitionPhase(state, "m01", "p01", "completed");
    expect(state.milestones.m01.phases.p01.status).toBe("completed");
  });

  it("rejects invalid transitions", () => {
    const ms = makeDefaultMilestoneState();
    ms.phases.p01 = makeDefaultPhaseState();
    const state = makeState({ milestones: { m01: ms } });

    expect(() => transitionPhase(state, "m01", "p01", "completed")).toThrow(
      "Invalid phase transition",
    );
  });
});

describe("transitionTask", () => {
  it("allows full lifecycle", () => {
    const ms = makeDefaultMilestoneState();
    const ps = makeDefaultPhaseState();
    ps.tasks.t01 = makeDefaultTaskState();
    ms.phases.p01 = ps;
    const state = makeState({ milestones: { m01: ms } });

    transitionTask(state, "m01", "p01", "t01", "planning");
    expect(state.milestones.m01.phases.p01.tasks.t01.status).toBe("planning");

    transitionTask(state, "m01", "p01", "t01", "plan_locked");
    expect(state.milestones.m01.phases.p01.tasks.t01.status).toBe("plan_locked");

    transitionTask(state, "m01", "p01", "t01", "implementing");
    expect(state.milestones.m01.phases.p01.tasks.t01.status).toBe("implementing");

    transitionTask(state, "m01", "p01", "t01", "completed");
    expect(state.milestones.m01.phases.p01.tasks.t01.status).toBe("completed");
  });

  it("rejects invalid transitions", () => {
    const ms = makeDefaultMilestoneState();
    const ps = makeDefaultPhaseState();
    ps.tasks.t01 = makeDefaultTaskState();
    ms.phases.p01 = ps;
    const state = makeState({ milestones: { m01: ms } });

    expect(() => transitionTask(state, "m01", "p01", "t01", "implementing")).toThrow(
      "Invalid task transition",
    );
  });

  it("has no blocked state", () => {
    const ms = makeDefaultMilestoneState();
    const ps = makeDefaultPhaseState();
    ps.tasks.t01 = { ...makeDefaultTaskState(), status: "planning" };
    ms.phases.p01 = ps;
    const state = makeState({ milestones: { m01: ms } });

    // "blocked" is not a valid status in the new pipeline
    expect(() =>
      transitionTask(state, "m01", "p01", "t01", "blocked" as any),
    ).toThrow("Invalid task transition");
  });
});

describe("findResumePoint", () => {
  it("returns null for empty state", () => {
    const state = makeState();
    expect(findResumePoint(state)).toBeNull();
  });

  it("returns null when all milestones completed", () => {
    const state = makeState({
      milestones: {
        m01: { ...makeDefaultMilestoneState(), status: "completed" },
      },
    });
    expect(findResumePoint(state)).toBeNull();
  });

  it("returns milestone needing planning", () => {
    const state = makeState({
      milestones: { m01: makeDefaultMilestoneState() },
    });
    const point = findResumePoint(state);
    expect(point).toEqual({ milestoneId: "m01" });
  });

  it("returns phase needing planning", () => {
    const ms = { ...makeDefaultMilestoneState(), status: "in_progress" as const };
    ms.phases.p01 = makeDefaultPhaseState();
    const state = makeState({ milestones: { m01: ms } });
    const point = findResumePoint(state);
    expect(point).toEqual({ milestoneId: "m01", phaseId: "p01" });
  });

  it("returns task needing work", () => {
    const ms = { ...makeDefaultMilestoneState(), status: "in_progress" as const };
    const ps = { ...makeDefaultPhaseState(), status: "in_progress" as const };
    ps.tasks.t01 = makeDefaultTaskState();
    ms.phases.p01 = ps;
    const state = makeState({ milestones: { m01: ms } });
    const point = findResumePoint(state);
    expect(point).toEqual({ milestoneId: "m01", phaseId: "p01", taskId: "t01" });
  });

  it("skips completed tasks", () => {
    const ms = { ...makeDefaultMilestoneState(), status: "in_progress" as const };
    const ps = { ...makeDefaultPhaseState(), status: "in_progress" as const };
    ps.tasks.t01 = { ...makeDefaultTaskState(), status: "completed" };
    ps.tasks.t02 = makeDefaultTaskState();
    ms.phases.p01 = ps;
    const state = makeState({ milestones: { m01: ms } });
    const point = findResumePoint(state);
    expect(point).toEqual({ milestoneId: "m01", phaseId: "p01", taskId: "t02" });
  });

  it("uses currentMilestone pointer", () => {
    const m01 = { ...makeDefaultMilestoneState(), status: "in_progress" as const };
    const m02 = makeDefaultMilestoneState();
    m01.phases.p01 = { ...makeDefaultPhaseState(), status: "in_progress" as const };
    m01.phases.p01.tasks.t01 = makeDefaultTaskState();
    const state = makeState({
      currentMilestone: "m01",
      milestones: { m01, m02 },
    });
    const point = findResumePoint(state);
    expect(point?.milestoneId).toBe("m01");
  });
});
