#!/usr/bin/env node
// Pipeline v3 — AI-powered software delivery pipeline

import { existsSync, readdirSync, copyFileSync, rmSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  type PipelineState,
  loadState,
  saveState,
  sortedKeys,
  makeDefaultMilestoneState,
  makeDefaultPhaseState,
  makeDefaultTaskState,
} from "./state.js";
import { initLogger, log } from "./logger.js";
import { checkPrereqs } from "./agents.js";
import { setDryRun, DRY_RUN, CONFIG } from "./config.js";
import { walk, PhaseCompleteSignal } from "./walker.js";
import { scaffoldMilestones } from "./scaffold.js";

// ── CLI Argument Parsing ─────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "bootstrap":
    runBootstrap();
    break;
  case "init":
    runInit();
    break;
  case "run":
    runPipeline();
    break;
  case "status":
    runStatus();
    break;
  case "reset":
    runReset();
    break;
  default:
    printUsage();
    break;
}

// ── Bootstrap Command ────────────────────────────────────────

function runBootstrap(): void {
  const force = args.includes("--force");
  const pipelineDir = CONFIG.pipelineDir;
  const statePath = join(pipelineDir, "state.json");

  if (existsSync(statePath) && !force) {
    console.error(
      `\nState file already exists: ${statePath}\nUse --force to overwrite.\n`,
    );
    process.exit(1);
  }

  if (!existsSync("MASTER_PLAN.md")) {
    console.error(
      "\nMaster plan not found: MASTER_PLAN.md\n" +
        "Create a MASTER_PLAN.md in the project root first.\n",
    );
    process.exit(1);
  }

  checkPrereqs();
  initLogger("logs");

  console.log("\n" + "=".repeat(56));
  console.log("  Pipeline v3 — Bootstrapping from Master Plan");
  console.log("=".repeat(56) + "\n");

  // Scaffold milestone directories and seed specs from master plan
  const items = scaffoldMilestones();

  if (items.length === 0) {
    console.error("\nNo milestones extracted from master plan.\n");
    process.exit(1);
  }

  // Build initial state with milestones only (phases/tasks are scaffolded during run)
  const state: PipelineState = {
    project: "taskboard",
    currentMilestone: null,
    milestones: {},
  };

  const milestonesDir = join(pipelineDir, "milestones");
  for (const item of items) {
    const milestoneDir = join(milestonesDir, item.id);
    if (isDirectory(milestoneDir)) {
      state.milestones[item.id] = makeDefaultMilestoneState();
    }
  }

  mkdirSync(join(pipelineDir, "tmp"), { recursive: true });
  saveState(statePath, state);

  console.log(`\nBootstrap complete:`);
  console.log(`  Milestones: ${Object.keys(state.milestones).length}`);
  console.log(`  Phases:     (will be scaffolded after milestone specs lock)`);
  console.log(`  Tasks:      (will be scaffolded after phase specs lock)`);
  console.log(`  State:      ${statePath}`);
  console.log(`\nRun 'npm run pipeline -- run' to start.\n`);
}

// ── Init Command ─────────────────────────────────────────────

function runInit(): void {
  const force = args.includes("--force");
  const prePlanned = args.includes("--pre-planned");
  const pipelineDir = CONFIG.pipelineDir;
  const statePath = join(pipelineDir, "state.json");

  if (existsSync(statePath) && !force) {
    console.error(
      `\nState file already exists: ${statePath}\nUse --force to overwrite.\n`,
    );
    process.exit(1);
  }

  const milestonesDir = join(pipelineDir, "milestones");
  if (!existsSync(milestonesDir)) {
    console.error(
      `\nMilestones directory not found: ${milestonesDir}\n` +
        `Create your milestone/phase/task structure with spec.md files first.\n`,
    );
    process.exit(1);
  }

  const state: PipelineState = {
    project: "unnamed-project",
    currentMilestone: null,
    milestones: {},
  };

  let milestoneCount = 0;
  let phaseCount = 0;
  let taskCount = 0;

  for (const milestoneId of readdirSync(milestonesDir).sort()) {
    const milestoneDir = join(milestonesDir, milestoneId);
    if (!isDirectory(milestoneDir)) continue;

    const milestoneState = makeDefaultMilestoneState();

    // If pre-planned, copy spec.md → spec-locked.md and skip planning
    if (prePlanned) {
      const specPath = join(milestoneDir, "spec.md");
      const lockedPath = join(milestoneDir, "spec-locked.md");
      if (existsSync(specPath) && !existsSync(lockedPath)) {
        copyFileSync(specPath, lockedPath);
      }
      milestoneState.status = "spec_locked";
    }

    const phasesDir = join(milestoneDir, "phases");
    if (existsSync(phasesDir)) {
      for (const phaseId of readdirSync(phasesDir).sort()) {
        const phaseDir = join(phasesDir, phaseId);
        if (!isDirectory(phaseDir)) continue;

        const phaseState = makeDefaultPhaseState();

        // If pre-planned, copy spec.md → spec-locked.md and skip planning
        if (prePlanned) {
          const specPath = join(phaseDir, "spec.md");
          const lockedPath = join(phaseDir, "spec-locked.md");
          if (existsSync(specPath) && !existsSync(lockedPath)) {
            copyFileSync(specPath, lockedPath);
          }
          phaseState.status = "spec_locked";
        }

        const tasksDir = join(phaseDir, "tasks");
        if (existsSync(tasksDir)) {
          for (const taskId of readdirSync(tasksDir).sort()) {
            const taskDir = join(tasksDir, taskId);
            if (!isDirectory(taskDir)) continue;
            if (!existsSync(join(taskDir, "spec.md"))) continue;

            phaseState.tasks[taskId] = makeDefaultTaskState();
            taskCount++;
          }
        }

        milestoneState.phases[phaseId] = phaseState;
        phaseCount++;
      }
    }

    state.milestones[milestoneId] = milestoneState;
    milestoneCount++;
  }

  mkdirSync(join(pipelineDir, "tmp"), { recursive: true });
  saveState(statePath, state);

  console.log(`\nPipeline initialized:`);
  console.log(`  Milestones: ${milestoneCount}`);
  console.log(`  Phases:     ${phaseCount}`);
  console.log(`  Tasks:      ${taskCount}`);
  if (prePlanned) {
    console.log(`  Mode:       pre-planned (milestone/phase specs locked)`);
  }
  console.log(`  State:      ${statePath}\n`);
}

// ── Run Command ──────────────────────────────────────────────

function runPipeline(): void {
  const dryRun = args.includes("--dry-run");
  if (dryRun) {
    setDryRun(true);
  }

  if (!DRY_RUN) {
    checkPrereqs();
  }

  initLogger("logs");

  let state: PipelineState;
  try {
    state = loadState(join(CONFIG.pipelineDir, "state.json"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${message}`);
    console.error("Run 'npm run pipeline -- init' first.\n");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(56));
  console.log("  Pipeline v3 — Running");
  console.log("=".repeat(56) + "\n");

  let finalState: PipelineState;
  try {
    finalState = walk(state);
  } catch (err) {
    if (err instanceof PhaseCompleteSignal) {
      console.log("\n" + "=".repeat(56));
      console.log(`  Phase completed: ${err.milestoneId}/${err.phaseId}`);
      console.log("  PR created — review and merge before running pipeline again.");
      console.log("=".repeat(56) + "\n");
      process.exit(0);
    }
    throw err;
  }

  console.log("\n" + "=".repeat(56));
  console.log("  Pipeline completed successfully.");
  console.log("=".repeat(56) + "\n");

  printSummary(finalState);
}

// ── Status Command ───────────────────────────────────────────

function runStatus(): void {
  let state: PipelineState;
  try {
    state = loadState(join(CONFIG.pipelineDir, "state.json"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${message}\n`);
    process.exit(1);
  }

  console.log(`\nPipeline Status: ${state.project}`);
  console.log("=".repeat(40) + "\n");

  let totalMilestones = 0;
  let completedMilestones = 0;
  let totalPhases = 0;
  let completedPhases = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  for (const milestoneId of sortedKeys(state.milestones)) {
    const milestone = state.milestones[milestoneId];
    totalMilestones++;
    if (milestone.status === "completed") completedMilestones++;

    const isCurrent = state.currentMilestone === milestoneId;
    const marker = isCurrent ? " <-- current" : "";
    const tiebreak = milestone.planning.tiebreakerUsed ? ", tiebreaker: planning" : "";
    console.log(`Milestone ${milestoneId} [${milestone.status}${tiebreak}]${marker}`);

    for (const phaseId of sortedKeys(milestone.phases)) {
      const phase = milestone.phases[phaseId];
      totalPhases++;
      if (phase.status === "completed") completedPhases++;

      const phaseCurrent = milestone.currentPhase === phaseId && isCurrent;
      const phaseMarker = phaseCurrent ? " <-- current" : "";
      const phaseTiebreak = phase.planning.tiebreakerUsed ? ", tiebreaker: planning" : "";
      console.log(`  Phase ${phaseId} [${phase.status}${phaseTiebreak}]${phaseMarker}`);

      for (const taskId of sortedKeys(phase.tasks)) {
        const task = phase.tasks[taskId];
        totalTasks++;
        if (task.status === "completed") completedTasks++;

        const taskCurrent = phase.currentTask === taskId && phaseCurrent;
        const taskMarker = taskCurrent ? " <-- current" : "";
        const parts: string[] = [];
        if (task.planning.totalAttempts > 0) {
          parts.push(`plan: ${task.planning.totalAttempts} attempt(s)`);
        }
        if (task.implementation.totalAttempts > 0) {
          parts.push(`impl: ${task.implementation.totalAttempts} attempt(s)`);
        }
        if (task.planning.tiebreakerUsed) parts.push("tiebreaker: plan");
        if (task.implementation.tiebreakerUsed) parts.push("tiebreaker: impl");
        const detail = parts.length ? ` (${parts.join(", ")})` : "";
        console.log(`    Task ${taskId} [${task.status}]${detail}${taskMarker}`);
      }
    }
    console.log("");
  }

  console.log(
    `Progress: ${completedMilestones}/${totalMilestones} milestones, ` +
      `${completedPhases}/${totalPhases} phases, ` +
      `${completedTasks}/${totalTasks} tasks\n`,
  );
}

// ── Reset Command ────────────────────────────────────────────

function runReset(): void {
  const path = args[1];
  const toIndex = args.indexOf("--to");
  const toState = toIndex !== -1 ? args[toIndex + 1] : undefined;

  if (!path) {
    console.error("\nUsage: npm run pipeline -- reset <m/p/t> [--to <state>]\n");
    process.exit(1);
  }

  const statePath = join(CONFIG.pipelineDir, "state.json");
  const state = loadState(statePath);
  const parts = path.split("/");

  if (parts.length === 1) {
    // Reset entire milestone
    const [milestoneId] = parts;
    const milestone = state.milestones[milestoneId];
    if (!milestone) {
      console.error(`\nMilestone not found: ${milestoneId}\n`);
      process.exit(1);
    }
    milestone.status = "pending";
    milestone.planning = { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };
    milestone.currentPhase = null;

    // Reset all child phases and tasks
    for (const phase of Object.values(milestone.phases)) {
      resetPhaseState(phase);
    }

    // Clean artifacts
    cleanArtifacts(join(CONFIG.pipelineDir, "milestones", milestoneId), [
      "spec-v", "feedback-v", "spec-locked.md", "tiebreak",
    ]);

    console.log(`\nReset milestone ${milestoneId} to pending.\n`);
  } else if (parts.length === 2) {
    // Reset specific phase
    const [milestoneId, phaseId] = parts;
    const phase = state.milestones[milestoneId]?.phases[phaseId];
    if (!phase) {
      console.error(`\nPhase not found: ${milestoneId}/${phaseId}\n`);
      process.exit(1);
    }
    resetPhaseState(phase);

    cleanArtifacts(
      join(CONFIG.pipelineDir, "milestones", milestoneId, "phases", phaseId),
      ["spec-v", "feedback-v", "spec-locked.md", "tiebreak"],
    );

    console.log(`\nReset phase ${milestoneId}/${phaseId} to pending.\n`);
  } else if (parts.length === 3) {
    // Reset specific task
    const [milestoneId, phaseId, taskId] = parts;
    const task = state.milestones[milestoneId]?.phases[phaseId]?.tasks[taskId];
    if (!task) {
      console.error(`\nTask not found: ${milestoneId}/${phaseId}/${taskId}\n`);
      process.exit(1);
    }

    const targetStatus = toState === "implementing" ? "plan_locked" : "pending";
    task.status = targetStatus === "plan_locked" ? "plan_locked" : "pending";
    if (targetStatus === "pending") {
      task.planning = { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };
    }
    task.implementation = { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };

    const taskDir = join(
      CONFIG.pipelineDir,
      "milestones",
      milestoneId,
      "phases",
      phaseId,
      "tasks",
      taskId,
    );

    if (targetStatus === "pending") {
      cleanArtifacts(taskDir, [
        "plan-v", "feedback-v", "plan-locked.md", "tiebreak",
        "impl-notes-v", "review-v", "impl-final.md",
      ]);
    } else {
      cleanArtifacts(taskDir, [
        "impl-notes-v", "review-v", "impl-final.md", "tiebreak-impl",
      ]);
    }

    console.log(
      `\nReset task ${milestoneId}/${phaseId}/${taskId} to ${task.status}.\n`,
    );
  } else {
    console.error("\nInvalid path format. Use: m01, m01/p01, or m01/p01/t01\n");
    process.exit(1);
  }

  saveState(statePath, state);
}

// ── Helpers ──────────────────────────────────────────────────

function resetPhaseState(phase: ReturnType<typeof makeDefaultPhaseState>): void {
  phase.status = "pending";
  phase.planning = { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };
  phase.currentTask = null;
  for (const task of Object.values(phase.tasks)) {
    task.status = "pending";
    task.planning = { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };
    task.implementation = { iteration: 0, totalAttempts: 0, tiebreakerUsed: false };
  }
}

function cleanArtifacts(dir: string, prefixes: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (prefixes.some((p) => entry.startsWith(p))) {
      try {
        rmSync(join(dir, entry), { force: true });
      } catch {
        // Ignore cleanup failures
      }
    }
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function printSummary(state: PipelineState): void {
  let completed = 0;
  let total = 0;
  for (const m of Object.values(state.milestones)) {
    for (const p of Object.values(m.phases)) {
      for (const t of Object.values(p.tasks)) {
        total++;
        if (t.status === "completed") completed++;
      }
    }
  }
  console.log(`  Tasks: ${completed}/${total} completed\n`);
}

function printUsage(): void {
  console.log(`
Pipeline v3 — AI-powered software delivery pipeline

Usage:
  npm run pipeline -- <command> [options]

Commands:
  bootstrap [--force]
      Read MASTER_PLAN.md, scaffold milestone directories, and create state.json
      Phases and tasks are scaffolded dynamically during 'run'

  init [--force] [--pre-planned]
      Scan .pipeline/milestones/ and create state.json (manual setup)
      --pre-planned  Copy spec.md → spec-locked.md, skip milestone/phase planning

  run [--dry-run]
      Execute the pipeline from current state

  status
      Print current pipeline progress

  reset <path> [--to <state>]
      Reset a milestone, phase, or task
      Examples:
        reset m01                        Reset entire milestone
        reset m01/p01                    Reset specific phase
        reset m01/p01/t01               Reset specific task
        reset m01/p01/t01 --to implementing  Keep plan, reset implementation
`);
}
