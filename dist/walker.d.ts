import { type PipelineState } from "./state.js";
export declare class PhaseCompleteSignal extends Error {
    readonly milestoneId: string;
    readonly phaseId: string;
    constructor(milestoneId: string, phaseId: string);
}
export declare function walk(state: PipelineState): PipelineState;
