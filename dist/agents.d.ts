import { type AgentId, type AgentCallOptions } from "./config.js";
import { type Decision } from "./schemas.js";
export interface CliResult {
    raw: string;
    decision?: Decision;
}
export declare function callAgentStructured<T>(agentId: AgentId, prompt: string, options: AgentCallOptions & {
    schema: string;
}): T;
export declare function setMockDecisions(decisions: Decision[]): void;
export declare function callAgent(agentId: AgentId, prompt: string, options?: AgentCallOptions): CliResult;
export declare function checkPrereqs(): void;
