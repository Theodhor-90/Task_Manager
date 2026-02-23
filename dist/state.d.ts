export type MilestoneStatus = "pending" | "planning" | "spec_locked" | "in_progress" | "completed";
export type PhaseStatus = "pending" | "planning" | "spec_locked" | "in_progress" | "completed";
export type TaskStatus = "pending" | "planning" | "plan_locked" | "implementing" | "completed";
export interface IterationState {
    iteration: number;
    totalAttempts: number;
    tiebreakerUsed: boolean;
}
export interface TaskState {
    status: TaskStatus;
    planning: IterationState;
    implementation: IterationState;
}
export interface PhaseState {
    status: PhaseStatus;
    planning: IterationState;
    currentTask: string | null;
    tasks: Record<string, TaskState>;
}
export interface MilestoneState {
    status: MilestoneStatus;
    planning: IterationState;
    currentPhase: string | null;
    phases: Record<string, PhaseState>;
}
export interface PipelineState {
    project: string;
    currentMilestone: string | null;
    milestones: Record<string, MilestoneState>;
}
export declare function loadState(path: string): PipelineState;
export declare function saveState(path: string, state: PipelineState): void;
export declare function checkpoint(path: string, state: PipelineState, step: string): void;
export declare function transitionMilestone(state: PipelineState, milestoneId: string, newStatus: MilestoneStatus): PipelineState;
export declare function transitionPhase(state: PipelineState, milestoneId: string, phaseId: string, newStatus: PhaseStatus): PipelineState;
export declare function transitionTask(state: PipelineState, milestoneId: string, phaseId: string, taskId: string, newStatus: TaskStatus): PipelineState;
export interface ResumePoint {
    milestoneId: string;
    phaseId?: string;
    taskId?: string;
}
export declare function findResumePoint(state: PipelineState): ResumePoint | null;
export declare function getMilestone(state: PipelineState, milestoneId: string): MilestoneState;
export declare function getPhase(state: PipelineState, milestoneId: string, phaseId: string): PhaseState;
export declare function getTask(state: PipelineState, milestoneId: string, phaseId: string, taskId: string): TaskState;
export declare function sortedKeys(obj: Record<string, unknown>): string[];
export declare function makeDefaultIterationState(): IterationState;
export declare function makeDefaultTaskState(): TaskState;
export declare function makeDefaultPhaseState(): PhaseState;
export declare function makeDefaultMilestoneState(): MilestoneState;
