import { type LevelConfig } from "./config.js";
export interface CycleContext {
    /** Human-readable label for logging, e.g. "m01" or "m01/p02/t03" */
    label: string;
    /** Which pipeline level this cycle runs for */
    level: "milestone" | "phase" | "task" | "implementation";
    /** Level configuration (agents, iterations, templates, options) */
    levelConfig: LevelConfig;
    /** Directory where artifacts for this cycle are stored */
    artifactDir: string;
    /** Template variables to substitute into prompts */
    templateVars: Record<string, string>;
    /** Artifact naming scheme */
    artifactNames: {
        draftPrefix: string;
        feedbackPrefix: string;
        lockedName: string;
    };
}
export interface CycleResult {
    /** The final artifact content */
    artifact: string;
    /** How many iterations were used (1-based) */
    iterations: number;
    /** Whether the tiebreaker was invoked */
    tiebreakerUsed: boolean;
}
export declare function runIterationCycle(ctx: CycleContext): CycleResult;
