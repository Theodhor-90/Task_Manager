import { type PipelineState } from "./state.js";
export interface ScaffoldItem {
    id: string;
    title: string;
    spec: string;
}
export declare function scaffoldMilestones(): ScaffoldItem[];
export declare function scaffoldPhases(milestoneDir: string, state: PipelineState, milestoneId: string): void;
export declare function scaffoldTasks(phaseDir: string, state: PipelineState, milestoneId: string, phaseId: string): void;
