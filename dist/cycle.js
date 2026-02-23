import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { callAgent } from "./agents.js";
import { parseDecision } from "./schemas.js";
import { loadTemplate } from "./templates.js";
import { log } from "./logger.js";
// ── Core Engine ──────────────────────────────────────────────
export function runIterationCycle(ctx) {
    const { levelConfig, artifactDir, artifactNames, templateVars, label, level } = ctx;
    const { agents, maxIterations, templates, creatorOptions, challengerOptions, tiebreakerOptions } = levelConfig;
    mkdirSync(artifactDir, { recursive: true });
    const lockedPath = join(artifactDir, artifactNames.lockedName);
    // Check if already locked (full resume)
    if (existsSync(lockedPath)) {
        log(label, level, "Locked artifact already exists — skipping cycle");
        return {
            artifact: readFileSync(lockedPath, "utf-8"),
            iterations: 0,
            tiebreakerUsed: false,
        };
    }
    for (let i = 1; i <= maxIterations; i++) {
        const draftFile = join(artifactDir, `${artifactNames.draftPrefix}${i}.md`);
        const feedbackFile = join(artifactDir, `${artifactNames.feedbackPrefix}${i}.md`);
        // ── Step 1: Draft or Refine ──────────────────────────────
        if (!existsSync(draftFile)) {
            let prompt;
            if (i === 1) {
                prompt = loadTemplate(templates.draft, {
                    ...templateVars,
                    ARTIFACT_DIR: artifactDir,
                });
            }
            else {
                const prevDraft = join(artifactDir, `${artifactNames.draftPrefix}${i - 1}.md`);
                const prevFeedback = join(artifactDir, `${artifactNames.feedbackPrefix}${i - 1}.md`);
                prompt = loadTemplate(templates.refine, {
                    ...templateVars,
                    DRAFT_PATH: prevDraft,
                    FEEDBACK_PATH: prevFeedback,
                    ARTIFACT_DIR: artifactDir,
                });
            }
            log(label, level, i === 1 ? "Drafting" : `Refining (iteration ${i})`, {
                current: i,
                total: maxIterations,
            });
            const result = callAgent(agents.creator, prompt, creatorOptions);
            writeFileSync(draftFile, result.raw, "utf-8");
        }
        else {
            log(label, level, `Draft v${i} exists on disk — skipping`);
        }
        // ── Step 2: Challenge / Review ───────────────────────────
        if (!existsSync(feedbackFile)) {
            const challengePrompt = loadTemplate(templates.challenge, {
                ...templateVars,
                DRAFT_PATH: draftFile,
                ARTIFACT_DIR: artifactDir,
            });
            log(label, level, `Challenging draft v${i}`, {
                current: i,
                total: maxIterations,
            });
            const result = callAgent(agents.challenger, challengePrompt, challengerOptions);
            writeFileSync(feedbackFile, result.raw, "utf-8");
            const decision = result.decision ?? parseDecision(result.raw, challengerOptions.schema);
            if (decision.verdict === "approved") {
                log(label, level, `Draft v${i} approved`);
                copyFileSync(draftFile, lockedPath);
                return {
                    artifact: readFileSync(lockedPath, "utf-8"),
                    iterations: i,
                    tiebreakerUsed: false,
                };
            }
            log(label, level, `Draft v${i} rejected`);
            // Last iteration — fall through to tiebreak
            if (i === maxIterations) {
                break;
            }
        }
        else {
            // Resume: feedback file exists, check if it was an approval
            log(label, level, `Feedback v${i} exists on disk — checking verdict`);
            const existing = readFileSync(feedbackFile, "utf-8");
            const existingDecision = parseDecision(existing, challengerOptions.schema);
            if (existingDecision.verdict === "approved") {
                log(label, level, `Draft v${i} was previously approved`);
                if (!existsSync(lockedPath)) {
                    copyFileSync(draftFile, lockedPath);
                }
                return {
                    artifact: readFileSync(lockedPath, "utf-8"),
                    iterations: i,
                    tiebreakerUsed: false,
                };
            }
            // Was rejected — continue or break
            if (i === maxIterations) {
                break;
            }
        }
    }
    // ── Step 3: Tiebreak ───────────────────────────────────────
    log(label, level, `All ${maxIterations} iterations rejected — invoking tiebreaker`);
    const allDraftPaths = [];
    const allFeedbackPaths = [];
    for (let i = 1; i <= maxIterations; i++) {
        allDraftPaths.push(join(artifactDir, `${artifactNames.draftPrefix}${i}.md`));
        allFeedbackPaths.push(join(artifactDir, `${artifactNames.feedbackPrefix}${i}.md`));
    }
    const tiebreakPrompt = loadTemplate(templates.tiebreak, {
        ...templateVars,
        ALL_DRAFT_PATHS: allDraftPaths.join("\n"),
        ALL_FEEDBACK_PATHS: allFeedbackPaths.join("\n"),
        ARTIFACT_DIR: artifactDir,
        NUM_ATTEMPTS: String(maxIterations),
    });
    const tiebreakResult = callAgent(agents.tiebreaker, tiebreakPrompt, tiebreakerOptions);
    const tiebreakFile = join(artifactDir, "tiebreak.md");
    writeFileSync(tiebreakFile, tiebreakResult.raw, "utf-8");
    copyFileSync(tiebreakFile, lockedPath);
    log(label, level, "Tiebreaker produced final artifact");
    return {
        artifact: tiebreakResult.raw,
        iterations: maxIterations,
        tiebreakerUsed: true,
    };
}
