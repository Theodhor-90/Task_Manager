import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG, DRY_RUN } from "./config.js";
import { parseDecision } from "./schemas.js";
import { log } from "./logger.js";
// ── Path Resolution ──────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const SCHEMAS_DIR = join(PROJECT_ROOT, "schemas");
const TMP_DIR = join(PROJECT_ROOT, ".pipeline", "tmp");
// ── Structured Output (non-decision JSON) ───────────────────
export function callAgentStructured(agentId, prompt, options) {
    if (DRY_RUN) {
        log("", "cli", `[DRY-RUN] structured call skipped (schema: ${options.schema})`);
        return { items: [] };
    }
    if (agentId !== "opus") {
        throw new Error("callAgentStructured only supports opus agent");
    }
    const { tools = [], maxTurns = CONFIG.agents.opus.defaultMaxTurns, schema } = options;
    const schemaContent = readFileSync(join(SCHEMAS_DIR, schema), "utf-8");
    const args = [
        "-p",
        prompt,
        "--model",
        CONFIG.agents.opus.model,
        "--output-format",
        "json",
        "--max-turns",
        String(maxTurns),
        "--json-schema",
        schemaContent,
    ];
    if (tools.length) {
        args.push("--allowedTools", tools.join(","));
    }
    log("", "cli", `claude -p structured (tools: ${tools.join(",") || "none"}, schema: ${schema})`);
    const res = spawnSync(CONFIG.agents.opus.bin, args, {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        maxBuffer: 20 * 1024 * 1024,
        timeout: CONFIG.timeoutMs,
        env: cleanEnv(),
    });
    if (res.error) {
        throw new Error(`claude failed: ${res.error.message}`);
    }
    if (res.status !== 0) {
        const stderr = res.stderr?.slice(0, 500) || "";
        throw new Error(`claude exited with code ${res.status}: ${stderr}`);
    }
    const stdout = (res.stdout || "").trim();
    return parseStructuredOutput(stdout);
}
function parseStructuredOutput(stdout) {
    // Strategy 1: Parse as Claude JSON envelope
    try {
        const envelope = JSON.parse(stdout);
        // Claude wraps output in { result, structured_output }
        if (envelope.structured_output != null) {
            return typeof envelope.structured_output === "string"
                ? JSON.parse(envelope.structured_output)
                : envelope.structured_output;
        }
        // Try result field as JSON
        if (typeof envelope.result === "string") {
            try {
                return JSON.parse(envelope.result);
            }
            catch {
                // result is not JSON — fall through
            }
        }
        // The envelope itself might be the data
        if (envelope.items !== undefined) {
            return envelope;
        }
    }
    catch {
        // Not valid JSON envelope — fall through
    }
    // Strategy 2: Extract JSON block from text
    const firstBrace = stdout.indexOf("{");
    const lastBrace = stdout.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
        }
        catch {
            // Extraction failed — fall through
        }
    }
    throw new Error("Failed to parse structured output from agent");
}
// ── Mock State (for --dry-run) ───────────────────────────────
let mockDecisions = [];
let mockDecisionIndex = 0;
export function setMockDecisions(decisions) {
    mockDecisions = decisions;
    mockDecisionIndex = 0;
}
function nextMockDecision() {
    if (mockDecisionIndex < mockDecisions.length) {
        return mockDecisions[mockDecisionIndex++];
    }
    return { verdict: "approved", feedback: "" };
}
// ── Environment Helper ───────────────────────────────────────
function cleanEnv() {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;
    return env;
}
// ── Unified Agent Dispatch ───────────────────────────────────
export function callAgent(agentId, prompt, options = {}) {
    if (agentId === "opus") {
        return callClaude(prompt, options);
    }
    return callCodex(prompt, options);
}
// ── Claude Wrapper ───────────────────────────────────────────
function callClaude(prompt, options) {
    if (DRY_RUN) {
        return mockCliCall("claude", prompt, !!options.schema);
    }
    const { tools = [], maxTurns = CONFIG.agents.opus.defaultMaxTurns, schema } = options;
    const isDecision = !!schema;
    const args = [
        "-p",
        prompt,
        "--model",
        CONFIG.agents.opus.model,
        "--output-format",
        isDecision ? "json" : "text",
        "--max-turns",
        String(maxTurns),
    ];
    if (tools.length) {
        args.push("--allowedTools", tools.join(","));
    }
    if (schema) {
        const schemaContent = readFileSync(join(SCHEMAS_DIR, schema), "utf-8");
        args.push("--json-schema", schemaContent);
    }
    log("", "cli", `claude -p (tools: ${tools.join(",") || "none"}, max-turns: ${maxTurns}, schema: ${schema || "none"})`);
    const res = spawnSync(CONFIG.agents.opus.bin, args, {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        maxBuffer: 20 * 1024 * 1024,
        timeout: CONFIG.timeoutMs,
        env: cleanEnv(),
    });
    if (res.error) {
        throw new Error(`claude failed: ${res.error.message}`);
    }
    if (res.status !== 0) {
        const stderr = res.stderr?.slice(0, 500) || "";
        throw new Error(`claude exited with code ${res.status}: ${stderr}`);
    }
    const stdout = (res.stdout || "").trim();
    if (!isDecision) {
        return { raw: stdout };
    }
    return parseClaudeDecision(stdout, schema);
}
function parseClaudeDecision(stdout, schema) {
    try {
        const envelope = JSON.parse(stdout);
        const result = typeof envelope.result === "string" ? envelope.result : "";
        if (envelope.structured_output != null) {
            const structured = typeof envelope.structured_output === "string"
                ? envelope.structured_output
                : JSON.stringify(envelope.structured_output);
            const decision = parseDecision(structured, schema);
            return { raw: result || structured, decision };
        }
        const raw = result || stdout;
        const decision = parseDecision(raw, schema);
        return { raw, decision };
    }
    catch {
        log("", "cli", "Claude JSON envelope parse failed, falling back to raw text");
        const decision = parseDecision(stdout, schema);
        return { raw: stdout, decision };
    }
}
// ── Codex Wrapper ────────────────────────────────────────────
function callCodex(prompt, options) {
    if (DRY_RUN) {
        return mockCliCall("codex", prompt, !!options.schema);
    }
    const { sandbox = CONFIG.agents.codex.defaultSandbox, schema } = options;
    const isDecision = !!schema;
    const args = ["exec", prompt, "--sandbox", sandbox];
    let outputFile = null;
    if (schema) {
        const schemaPath = join(SCHEMAS_DIR, schema);
        args.push("--output-schema", schemaPath);
        mkdirSync(TMP_DIR, { recursive: true });
        outputFile = join(TMP_DIR, `codex-output-${Date.now()}.json`);
        args.push("-o", outputFile);
    }
    log("", "cli", `codex exec (sandbox: ${sandbox}, schema: ${schema || "none"})`);
    const res = spawnSync(CONFIG.agents.codex.bin, args, {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        maxBuffer: 20 * 1024 * 1024,
        timeout: CONFIG.timeoutMs,
        env: cleanEnv(),
    });
    if (res.error) {
        throw new Error(`codex failed: ${res.error.message}`);
    }
    if (res.status !== 0) {
        const stderr = res.stderr?.slice(0, 500) || "";
        throw new Error(`codex exited with code ${res.status}: ${stderr}`);
    }
    const stdout = (res.stdout || "").trim();
    if (!isDecision) {
        return { raw: stdout };
    }
    return parseCodexDecision(outputFile, stdout, schema);
}
function parseCodexDecision(outputFile, stdout, schema) {
    let raw;
    try {
        raw = readFileSync(outputFile, "utf-8").trim();
    }
    catch {
        log("", "cli", "Codex output file not found, falling back to stdout");
        raw = stdout;
    }
    try {
        unlinkSync(outputFile);
    }
    catch {
        // Ignore cleanup failure
    }
    const decision = parseDecision(raw, schema);
    return { raw, decision };
}
// ── Mock CLI Call (dry-run) ──────────────────────────────────
function mockCliCall(cli, prompt, isDecision) {
    const preview = prompt.length > 80 ? prompt.substring(0, 80) + "..." : prompt;
    log("", "cli", `[DRY-RUN] ${cli}: ${preview}`);
    if (isDecision) {
        const decision = nextMockDecision();
        return { raw: JSON.stringify(decision), decision };
    }
    return { raw: `Mock ${cli} response for dry-run testing.` };
}
// ── Prerequisite Check ───────────────────────────────────────
export function checkPrereqs() {
    console.log("\nChecking prerequisites...\n");
    const problems = [];
    for (const [label, bin, pkg] of [
        ["Claude Code", CONFIG.agents.opus.bin, "@anthropic-ai/claude-code"],
        ["Codex CLI", CONFIG.agents.codex.bin, "@openai/codex"],
        ["GitHub CLI", "gh", "https://cli.github.com"],
    ]) {
        const r = spawnSync("which", [bin], { encoding: "utf-8" });
        if (r.status === 0) {
            console.log(`  OK  ${label} → ${r.stdout.trim()}`);
        }
        else {
            console.log(`  MISSING  ${label} — install with: npm install -g ${pkg}`);
            problems.push(label);
        }
    }
    for (const [label, bin, loginCmd] of [
        ["Claude auth", CONFIG.agents.opus.bin, "claude login"],
        ["Codex auth", CONFIG.agents.codex.bin, "codex login"],
    ]) {
        const hasApiKey = (bin === "claude" && process.env.ANTHROPIC_API_KEY) ||
            (bin === "codex" && (process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY));
        if (hasApiKey) {
            console.log(`  OK  ${label} (API key)`);
        }
        else {
            console.log(`  ?   ${label} — no API key found; assuming subscription login via "${loginCmd}"`);
        }
    }
    if (problems.length) {
        console.log(`\nBlocked by ${problems.length} missing prerequisite(s). Fix and retry.\n`);
        process.exit(1);
    }
    console.log("\nAll prerequisites met.\n");
}
