export interface ChallengeDecision {
    verdict: "approved" | "needs_revision";
    feedback: string;
}
export interface ReviewDecision {
    verdict: "approved" | "needs_revision";
    feedback: string;
    issues?: {
        file: string;
        description: string;
    }[];
}
export type Decision = ChallengeDecision | ReviewDecision;
export declare function parseDecision(raw: string, schemaName: string): Decision;
