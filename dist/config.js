// ── Agent Identifiers ────────────────────────────────────────
// ── Default Configuration ────────────────────────────────────
const readOnlyTools = ["Read", "Glob", "Grep"];
export const CONFIG = {
    pipelineDir: ".pipeline",
    timeoutMs: 20 * 60_000,
    agents: {
        opus: { bin: "claude", model: "opus", defaultMaxTurns: 25 },
        codex: { bin: "codex", defaultSandbox: "read-only" },
    },
    levels: {
        milestone: {
            agents: { creator: "opus", challenger: "codex", tiebreaker: "opus" },
            maxIterations: 3,
            templates: {
                draft: "milestone/draft",
                challenge: "milestone/challenge",
                refine: "milestone/refine",
                tiebreak: "milestone/tiebreak",
            },
            creatorOptions: { tools: readOnlyTools },
            challengerOptions: { tools: readOnlyTools, schema: "challenge-decision.json" },
            tiebreakerOptions: { tools: readOnlyTools },
        },
        phase: {
            agents: { creator: "opus", challenger: "codex", tiebreaker: "opus" },
            maxIterations: 3,
            templates: {
                draft: "phase/draft",
                challenge: "phase/challenge",
                refine: "phase/refine",
                tiebreak: "phase/tiebreak",
            },
            creatorOptions: { tools: readOnlyTools },
            challengerOptions: { tools: readOnlyTools, schema: "challenge-decision.json" },
            tiebreakerOptions: { tools: readOnlyTools },
        },
        task: {
            agents: { creator: "opus", challenger: "codex", tiebreaker: "opus" },
            maxIterations: 3,
            templates: {
                draft: "task/draft",
                challenge: "task/challenge",
                refine: "task/refine",
                tiebreak: "task/tiebreak",
            },
            creatorOptions: { tools: readOnlyTools },
            challengerOptions: { tools: readOnlyTools, schema: "challenge-decision.json" },
            tiebreakerOptions: { tools: readOnlyTools },
        },
        implementation: {
            agents: { creator: "codex", challenger: "opus", tiebreaker: "opus" },
            maxIterations: 3,
            templates: {
                draft: "impl/implement",
                challenge: "impl/review",
                refine: "impl/implement-fix",
                tiebreak: "impl/tiebreak",
            },
            creatorOptions: { sandbox: "workspace-write" },
            challengerOptions: { sandbox: "workspace-write", schema: "review-decision.json" },
            tiebreakerOptions: { sandbox: "workspace-write" },
        },
    },
    scaffold: {
        agent: "opus",
        options: { tools: readOnlyTools, schema: "scaffold.json" },
        templates: {
            milestones: "scaffold/milestones",
            phases: "scaffold/phases",
            tasks: "scaffold/tasks",
        },
    },
    git: {
        enabled: true,
        branchPrefix: "phase/",
        autoCommit: true,
        autoPR: true,
    },
};
// ── Dry-run Mode ─────────────────────────────────────────────
export let DRY_RUN = false;
export function setDryRun(value) {
    DRY_RUN = value;
}
