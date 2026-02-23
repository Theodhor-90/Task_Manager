import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { log } from "./logger.js";
// ── Valid Transitions ────────────────────────────────────────
const MILESTONE_TRANSITIONS = {
    pending: ["planning"],
    planning: ["spec_locked"],
    spec_locked: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
};
const PHASE_TRANSITIONS = {
    pending: ["planning"],
    planning: ["spec_locked"],
    spec_locked: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
};
const TASK_TRANSITIONS = {
    pending: ["planning"],
    planning: ["plan_locked"],
    plan_locked: ["implementing"],
    implementing: ["completed"],
    completed: [],
};
// ── State I/O ────────────────────────────────────────────────
export function loadState(path) {
    let raw;
    try {
        raw = readFileSync(path, "utf-8");
    }
    catch {
        throw new Error(`State file not found: ${path}. Run 'init' first.`);
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error(`State file is malformed JSON: ${path}`);
    }
}
export function saveState(path, state) {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    renameSync(tmp, path);
}
// ── Checkpoint ───────────────────────────────────────────────
export function checkpoint(path, state, step) {
    saveState(path, state);
    log("", "checkpoint", `State saved after: ${step}`);
}
// ── Transition Functions ─────────────────────────────────────
export function transitionMilestone(state, milestoneId, newStatus) {
    const milestone = getMilestone(state, milestoneId);
    const allowed = MILESTONE_TRANSITIONS[milestone.status];
    if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid milestone transition: ${milestone.status} → ${newStatus} (${milestoneId}). ` +
            `Allowed: ${allowed.join(", ") || "none"}`);
    }
    milestone.status = newStatus;
    return state;
}
export function transitionPhase(state, milestoneId, phaseId, newStatus) {
    const phase = getPhase(state, milestoneId, phaseId);
    const allowed = PHASE_TRANSITIONS[phase.status];
    if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid phase transition: ${phase.status} → ${newStatus} (${milestoneId}/${phaseId}). ` +
            `Allowed: ${allowed.join(", ") || "none"}`);
    }
    phase.status = newStatus;
    return state;
}
export function transitionTask(state, milestoneId, phaseId, taskId, newStatus) {
    const task = getTask(state, milestoneId, phaseId, taskId);
    const allowed = TASK_TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid task transition: ${task.status} → ${newStatus} ` +
            `(${milestoneId}/${phaseId}/${taskId}). ` +
            `Allowed: ${allowed.join(", ") || "none"}`);
    }
    task.status = newStatus;
    return state;
}
export function findResumePoint(state) {
    // Use currentMilestone pointer if set
    if (state.currentMilestone) {
        const milestone = state.milestones[state.currentMilestone];
        if (milestone && milestone.status !== "completed") {
            const point = findResumeInMilestone(state.currentMilestone, milestone);
            if (point)
                return point;
        }
    }
    // Scan for first non-completed milestone
    for (const milestoneId of sortedKeys(state.milestones)) {
        const milestone = state.milestones[milestoneId];
        if (milestone.status === "completed")
            continue;
        const point = findResumeInMilestone(milestoneId, milestone);
        if (point)
            return point;
    }
    return null;
}
function findResumeInMilestone(milestoneId, milestone) {
    // If milestone itself needs planning
    if (milestone.status === "pending" || milestone.status === "planning") {
        return { milestoneId };
    }
    // Use currentPhase pointer if set
    if (milestone.currentPhase) {
        const phase = milestone.phases[milestone.currentPhase];
        if (phase && phase.status !== "completed") {
            const point = findResumeInPhase(milestoneId, milestone.currentPhase, phase);
            if (point)
                return point;
        }
    }
    // Scan for first non-completed phase
    for (const phaseId of sortedKeys(milestone.phases)) {
        const phase = milestone.phases[phaseId];
        if (phase.status === "completed")
            continue;
        const point = findResumeInPhase(milestoneId, phaseId, phase);
        if (point)
            return point;
    }
    // All phases complete but milestone not marked complete yet
    return { milestoneId };
}
function findResumeInPhase(milestoneId, phaseId, phase) {
    // If phase itself needs planning
    if (phase.status === "pending" || phase.status === "planning") {
        return { milestoneId, phaseId };
    }
    // Use currentTask pointer if set
    if (phase.currentTask) {
        const task = phase.tasks[phase.currentTask];
        if (task && task.status !== "completed") {
            return { milestoneId, phaseId, taskId: phase.currentTask };
        }
    }
    // Scan for first non-completed task
    for (const taskId of sortedKeys(phase.tasks)) {
        const task = phase.tasks[taskId];
        if (task.status === "completed")
            continue;
        return { milestoneId, phaseId, taskId };
    }
    // All tasks complete but phase not marked complete yet
    return { milestoneId, phaseId };
}
// ── Accessors ────────────────────────────────────────────────
export function getMilestone(state, milestoneId) {
    const milestone = state.milestones[milestoneId];
    if (!milestone)
        throw new Error(`Milestone not found: ${milestoneId}`);
    return milestone;
}
export function getPhase(state, milestoneId, phaseId) {
    const milestone = getMilestone(state, milestoneId);
    const phase = milestone.phases[phaseId];
    if (!phase)
        throw new Error(`Phase not found: ${milestoneId}/${phaseId}`);
    return phase;
}
export function getTask(state, milestoneId, phaseId, taskId) {
    const phase = getPhase(state, milestoneId, phaseId);
    const task = phase.tasks[taskId];
    if (!task)
        throw new Error(`Task not found: ${milestoneId}/${phaseId}/${taskId}`);
    return task;
}
// ── Helpers ──────────────────────────────────────────────────
export function sortedKeys(obj) {
    return Object.keys(obj).sort();
}
export function makeDefaultIterationState() {
    return { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };
}
export function makeDefaultTaskState() {
    return {
        status: "pending",
        planning: makeDefaultIterationState(),
        implementation: makeDefaultIterationState(),
    };
}
export function makeDefaultPhaseState() {
    return {
        status: "pending",
        planning: makeDefaultIterationState(),
        currentTask: null,
        tasks: {},
    };
}
export function makeDefaultMilestoneState() {
    return {
        status: "pending",
        planning: makeDefaultIterationState(),
        currentPhase: null,
        phases: {},
    };
}
