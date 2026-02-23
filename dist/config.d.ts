export type AgentId = "opus" | "codex";
export interface LevelAgentConfig {
    creator: AgentId;
    challenger: AgentId;
    tiebreaker: AgentId;
}
export interface AgentCallOptions {
    tools?: string[];
    sandbox?: "read-only" | "workspace-write";
    maxTurns?: number;
    schema?: string;
}
export interface LevelConfig {
    agents: LevelAgentConfig;
    maxIterations: number;
    templates: {
        draft: string;
        challenge: string;
        refine: string;
        tiebreak: string;
    };
    creatorOptions: AgentCallOptions;
    challengerOptions: AgentCallOptions & {
        schema: string;
    };
    tiebreakerOptions: AgentCallOptions;
}
export interface AgentBinaryConfig {
    opus: {
        bin: string;
        model: string;
        defaultMaxTurns: number;
    };
    codex: {
        bin: string;
        defaultSandbox: "read-only" | "workspace-write";
    };
}
export interface ScaffoldConfig {
    agent: AgentId;
    options: AgentCallOptions & {
        schema: string;
    };
    templates: {
        milestones: string;
        phases: string;
        tasks: string;
    };
}
export interface GitConfig {
    enabled: boolean;
    branchPrefix: string;
    autoCommit: boolean;
    autoPR: boolean;
}
export interface PipelineConfig {
    pipelineDir: string;
    timeoutMs: number;
    agents: AgentBinaryConfig;
    levels: {
        milestone: LevelConfig;
        phase: LevelConfig;
        task: LevelConfig;
        implementation: LevelConfig;
    };
    scaffold: ScaffoldConfig;
    git: GitConfig;
}
export declare const CONFIG: PipelineConfig;
export declare let DRY_RUN: boolean;
export declare function setDryRun(value: boolean): void;
