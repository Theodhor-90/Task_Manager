import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG, DRY_RUN } from "./config.js";
import { callAgentStructured } from "./agents.js";
import { loadTemplate } from "./templates.js";
import { log } from "./logger.js";
import {
  type PipelineState,
  makeDefaultMilestoneState,
  makeDefaultPhaseState,
  makeDefaultTaskState,
} from "./state.js";

// ── Types ────────────────────────────────────────────────────

export interface ScaffoldItem {
  id: string;
  title: string;
  spec: string;
}

interface ScaffoldResult {
  items: ScaffoldItem[];
}

// ── Milestone Scaffolding (bootstrap from master plan) ──────

export function scaffoldMilestones(): ScaffoldItem[] {
  const { scaffold } = CONFIG;
  const milestonesDir = join(CONFIG.pipelineDir, "milestones");

  log("", "scaffold", "Extracting milestones from master plan");

  if (DRY_RUN) {
    log("", "scaffold", "[DRY-RUN] Skipping milestone scaffolding");
    return [];
  }

  const prompt = loadTemplate(scaffold.templates.milestones, {
    MASTER_PLAN_PATH: "MASTER_PLAN.md",
  });

  const result = callAgentStructured<ScaffoldResult>(
    scaffold.agent,
    prompt,
    scaffold.options,
  );

  mkdirSync(milestonesDir, { recursive: true });

  for (const item of result.items) {
    const milestoneDir = join(milestonesDir, item.id);
    const specPath = join(milestoneDir, "spec.md");

    if (existsSync(specPath)) {
      log(item.id, "scaffold", `Milestone directory already exists — skipping`);
      continue;
    }

    mkdirSync(milestoneDir, { recursive: true });
    writeFileSync(specPath, item.spec, "utf-8");
    log(item.id, "scaffold", `Created milestone seed spec: ${item.title}`);
  }

  return result.items;
}

// ── Phase Scaffolding (after milestone spec locks) ──────────

export function scaffoldPhases(
  milestoneDir: string,
  state: PipelineState,
  milestoneId: string,
): void {
  const milestone = state.milestones[milestoneId];

  // Skip if phases already exist in state (idempotent on resume)
  if (Object.keys(milestone.phases).length > 0) {
    log(milestoneId, "scaffold", "Phases already exist in state — skipping");
    return;
  }

  log(milestoneId, "scaffold", "Extracting phases from locked milestone spec");

  if (DRY_RUN) {
    log(milestoneId, "scaffold", "[DRY-RUN] Skipping phase scaffolding");
    return;
  }

  const { scaffold } = CONFIG;
  const milestoneSpecPath = join(milestoneDir, "spec-locked.md");

  const prompt = loadTemplate(scaffold.templates.phases, {
    MASTER_PLAN_PATH: "MASTER_PLAN.md",
    MILESTONE_SPEC_PATH: milestoneSpecPath,
  });

  const result = callAgentStructured<ScaffoldResult>(
    scaffold.agent,
    prompt,
    scaffold.options,
  );

  const phasesDir = join(milestoneDir, "phases");
  mkdirSync(phasesDir, { recursive: true });

  for (const item of result.items) {
    const phaseDir = join(phasesDir, item.id);
    const specPath = join(phaseDir, "spec.md");

    if (!existsSync(specPath)) {
      mkdirSync(phaseDir, { recursive: true });
      writeFileSync(specPath, item.spec, "utf-8");
    }

    // Register in state
    milestone.phases[item.id] = makeDefaultPhaseState();
    log(`${milestoneId}/${item.id}`, "scaffold", `Created phase seed spec: ${item.title}`);
  }
}

// ── Task Scaffolding (after phase spec locks) ───────────────

export function scaffoldTasks(
  phaseDir: string,
  state: PipelineState,
  milestoneId: string,
  phaseId: string,
): void {
  const phase = state.milestones[milestoneId].phases[phaseId];

  // Skip if tasks already exist in state (idempotent on resume)
  if (Object.keys(phase.tasks).length > 0) {
    log(`${milestoneId}/${phaseId}`, "scaffold", "Tasks already exist in state — skipping");
    return;
  }

  log(`${milestoneId}/${phaseId}`, "scaffold", "Extracting tasks from locked phase spec");

  if (DRY_RUN) {
    log(`${milestoneId}/${phaseId}`, "scaffold", "[DRY-RUN] Skipping task scaffolding");
    return;
  }

  const { scaffold } = CONFIG;
  const milestoneDir = join(CONFIG.pipelineDir, "milestones", milestoneId);
  const milestoneSpecPath = join(milestoneDir, "spec-locked.md");
  const phaseSpecPath = join(phaseDir, "spec-locked.md");

  const prompt = loadTemplate(scaffold.templates.tasks, {
    MASTER_PLAN_PATH: "MASTER_PLAN.md",
    MILESTONE_SPEC_PATH: milestoneSpecPath,
    PHASE_SPEC_PATH: phaseSpecPath,
  });

  const result = callAgentStructured<ScaffoldResult>(
    scaffold.agent,
    prompt,
    scaffold.options,
  );

  const tasksDir = join(phaseDir, "tasks");
  mkdirSync(tasksDir, { recursive: true });

  for (const item of result.items) {
    const taskDir = join(tasksDir, item.id);
    const specPath = join(taskDir, "spec.md");

    if (!existsSync(specPath)) {
      mkdirSync(taskDir, { recursive: true });
      writeFileSync(specPath, item.spec, "utf-8");
    }

    // Register in state
    phase.tasks[item.id] = makeDefaultTaskState();
    log(
      `${milestoneId}/${phaseId}/${item.id}`,
      "scaffold",
      `Created task seed spec: ${item.title}`,
    );
  }
}
