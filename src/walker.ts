import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { CONFIG } from "./config.js";
import {
  type PipelineState,
  checkpoint,
  saveState,
  sortedKeys,
  transitionMilestone,
  transitionPhase,
  transitionTask,
  getMilestone,
  getPhase,
  getTask,
} from "./state.js";
import { runIterationCycle } from "./cycle.js";
import {
  createPhaseBranch,
  commitTaskCompletion,
  createPhasePR,
  returnToMain,
} from "./git.js";
import { scaffoldPhases, scaffoldTasks } from "./scaffold.js";
import { log } from "./logger.js";

// ── Phase Complete Signal ────────────────────────────────────

export class PhaseCompleteSignal extends Error {
  constructor(
    public readonly milestoneId: string,
    public readonly phaseId: string,
  ) {
    super(`Phase ${milestoneId}/${phaseId} completed — PR created, awaiting review.`);
    this.name = "PhaseCompleteSignal";
  }
}

// ── Main Walker ──────────────────────────────────────────────

export function walk(state: PipelineState): PipelineState {
  const statePath = join(CONFIG.pipelineDir, "state.json");

  for (const milestoneId of sortedKeys(state.milestones)) {
    const milestone = getMilestone(state, milestoneId);
    if (milestone.status === "completed") continue;

    state.currentMilestone = milestoneId;

    // ── Milestone Planning Cycle ─────────────────────────────
    if (milestone.status === "pending" || milestone.status === "planning") {
      if (milestone.status === "pending") {
        transitionMilestone(state, milestoneId, "planning");
        checkpoint(statePath, state, `milestone ${milestoneId} → planning`);
      }

      const milestoneDir = join(CONFIG.pipelineDir, "milestones", milestoneId);
      const result = runIterationCycle({
        label: milestoneId,
        level: "milestone",
        levelConfig: CONFIG.levels.milestone,
        artifactDir: milestoneDir,
        templateVars: {
          MASTER_PLAN_PATH: "MASTER_PLAN.md",
          SPEC_PATH: join(milestoneDir, "spec.md"),
        },
        artifactNames: {
          draftPrefix: "spec-v",
          feedbackPrefix: "feedback-v",
          lockedName: "spec-locked.md",
        },
      });

      milestone.planning.tiebreakerUsed = result.tiebreakerUsed;
      milestone.planning.iteration = result.iterations;
      milestone.planning.totalAttempts += result.iterations;

      transitionMilestone(state, milestoneId, "spec_locked");
      checkpoint(statePath, state, `milestone ${milestoneId} spec locked`);
    }

    // ── Scaffold Phases from locked spec ─────────────────────
    if (milestone.status === "spec_locked") {
      const milestoneDir = join(CONFIG.pipelineDir, "milestones", milestoneId);
      scaffoldPhases(milestoneDir, state, milestoneId);
      checkpoint(statePath, state, `milestone ${milestoneId} phases scaffolded`);
      transitionMilestone(state, milestoneId, "in_progress");
      checkpoint(statePath, state, `milestone ${milestoneId} → in_progress`);
    }

    // ── Iterate Phases ───────────────────────────────────────
    for (const phaseId of sortedKeys(milestone.phases)) {
      const phase = getPhase(state, milestoneId, phaseId);
      if (phase.status === "completed") continue;

      milestone.currentPhase = phaseId;

      // ── Phase Planning Cycle ───────────────────────────────
      if (phase.status === "pending" || phase.status === "planning") {
        if (phase.status === "pending") {
          transitionPhase(state, milestoneId, phaseId, "planning");
          checkpoint(statePath, state, `phase ${milestoneId}/${phaseId} → planning`);
        }

        const milestoneDir = join(CONFIG.pipelineDir, "milestones", milestoneId);
        const phaseDir = join(milestoneDir, "phases", phaseId);
        const result = runIterationCycle({
          label: `${milestoneId}/${phaseId}`,
          level: "phase",
          levelConfig: CONFIG.levels.phase,
          artifactDir: phaseDir,
          templateVars: {
            MASTER_PLAN_PATH: "MASTER_PLAN.md",
            MILESTONE_SPEC_PATH: join(milestoneDir, "spec-locked.md"),
            SPEC_PATH: join(phaseDir, "spec.md"),
          },
          artifactNames: {
            draftPrefix: "spec-v",
            feedbackPrefix: "feedback-v",
            lockedName: "spec-locked.md",
          },
        });

        phase.planning.tiebreakerUsed = result.tiebreakerUsed;
        phase.planning.iteration = result.iterations;
        phase.planning.totalAttempts += result.iterations;

        transitionPhase(state, milestoneId, phaseId, "spec_locked");
        checkpoint(statePath, state, `phase ${milestoneId}/${phaseId} spec locked`);
      }

      // ── Scaffold Tasks from locked spec ───────────────────
      if (phase.status === "spec_locked") {
        const milestoneDir = join(CONFIG.pipelineDir, "milestones", milestoneId);
        const phaseDir = join(milestoneDir, "phases", phaseId);
        scaffoldTasks(phaseDir, state, milestoneId, phaseId);
        checkpoint(statePath, state, `phase ${milestoneId}/${phaseId} tasks scaffolded`);
        if (CONFIG.git.enabled) {
          createPhaseBranch(milestoneId, phaseId);
        }
        transitionPhase(state, milestoneId, phaseId, "in_progress");
        checkpoint(statePath, state, `phase ${milestoneId}/${phaseId} → in_progress`);
      }

      // ── Iterate Tasks ──────────────────────────────────────
      for (const taskId of sortedKeys(phase.tasks)) {
        const task = getTask(state, milestoneId, phaseId, taskId);
        if (task.status === "completed") continue;

        phase.currentTask = taskId;
        const milestoneDir = join(CONFIG.pipelineDir, "milestones", milestoneId);
        const phaseDir = join(milestoneDir, "phases", phaseId);
        const taskDir = join(phaseDir, "tasks", taskId);

        // ── Task Planning Cycle ──────────────────────────────
        if (task.status === "pending" || task.status === "planning") {
          if (task.status === "pending") {
            transitionTask(state, milestoneId, phaseId, taskId, "planning");
            checkpoint(statePath, state, `task ${milestoneId}/${phaseId}/${taskId} → planning`);
          }

          const completedSiblings = buildCompletedSiblingsSection(
            state,
            milestoneId,
            phaseId,
            taskId,
          );

          const result = runIterationCycle({
            label: `${milestoneId}/${phaseId}/${taskId}`,
            level: "task",
            levelConfig: CONFIG.levels.task,
            artifactDir: taskDir,
            templateVars: {
              MASTER_PLAN_PATH: "MASTER_PLAN.md",
              MILESTONE_SPEC_PATH: join(milestoneDir, "spec-locked.md"),
              PHASE_SPEC_PATH: join(phaseDir, "spec-locked.md"),
              SPEC_PATH: join(taskDir, "spec.md"),
              COMPLETED_SIBLINGS_SECTION: completedSiblings,
            },
            artifactNames: {
              draftPrefix: "plan-v",
              feedbackPrefix: "feedback-v",
              lockedName: "plan-locked.md",
            },
          });

          task.planning.tiebreakerUsed = result.tiebreakerUsed;
          task.planning.iteration = result.iterations;
          task.planning.totalAttempts += result.iterations;

          transitionTask(state, milestoneId, phaseId, taskId, "plan_locked");
          checkpoint(
            statePath,
            state,
            `task ${milestoneId}/${phaseId}/${taskId} plan locked`,
          );
        }

        // ── Task Implementation Cycle ────────────────────────
        if (task.status === "plan_locked" || task.status === "implementing") {
          if (task.status === "plan_locked") {
            transitionTask(state, milestoneId, phaseId, taskId, "implementing");
            checkpoint(
              statePath,
              state,
              `task ${milestoneId}/${phaseId}/${taskId} → implementing`,
            );
          }

          const result = runIterationCycle({
            label: `${milestoneId}/${phaseId}/${taskId}`,
            level: "implementation",
            levelConfig: CONFIG.levels.implementation,
            artifactDir: taskDir,
            templateVars: {
              PLAN_LOCKED_PATH: join(taskDir, "plan-locked.md"),
              SPEC_PATH: join(taskDir, "spec.md"),
              PHASE_SPEC_PATH: join(
                milestoneDir,
                "phases",
                phaseId,
                "spec-locked.md",
              ),
            },
            artifactNames: {
              draftPrefix: "impl-notes-v",
              feedbackPrefix: "review-v",
              lockedName: "impl-final.md",
            },
          });

          task.implementation.tiebreakerUsed = result.tiebreakerUsed;
          task.implementation.iteration = result.iterations;
          task.implementation.totalAttempts += result.iterations;

          transitionTask(state, milestoneId, phaseId, taskId, "completed");
          checkpoint(
            statePath,
            state,
            `task ${milestoneId}/${phaseId}/${taskId} completed`,
          );

          if (CONFIG.git.enabled) {
            commitTaskCompletion(milestoneId, phaseId, taskId);
          }
        }
      }

      // ── Phase Complete ─────────────────────────────────────
      phase.status = "completed";
      phase.currentTask = null;
      checkpoint(statePath, state, `phase ${milestoneId}/${phaseId} completed`);

      if (CONFIG.git.enabled) {
        createPhasePR(milestoneId, phaseId);
        returnToMain();
      }

      saveState(statePath, state);
      throw new PhaseCompleteSignal(milestoneId, phaseId);
    }

    // ── Milestone Complete ───────────────────────────────────
    milestone.status = "completed";
    milestone.currentPhase = null;
    checkpoint(statePath, state, `milestone ${milestoneId} completed`);
  }

  state.currentMilestone = null;
  saveState(statePath, state);
  return state;
}

// ── Helpers ──────────────────────────────────────────────────

function buildCompletedSiblingsSection(
  state: PipelineState,
  milestoneId: string,
  phaseId: string,
  currentTaskId: string,
): string {
  const phase = getPhase(state, milestoneId, phaseId);
  const lines: string[] = [];

  for (const taskId of sortedKeys(phase.tasks)) {
    if (taskId === currentTaskId) break; // Only include tasks before current
    const task = phase.tasks[taskId];
    if (task.status !== "completed") continue;

    const planPath = join(
      CONFIG.pipelineDir,
      "milestones",
      milestoneId,
      "phases",
      phaseId,
      "tasks",
      taskId,
      "plan-locked.md",
    );

    if (existsSync(planPath)) {
      const content = readFileSync(planPath, "utf-8");
      lines.push(`### Task ${taskId} (completed)\n\n${content}\n`);
    }
  }

  if (lines.length === 0) return "";
  return `## Completed Sibling Tasks\n\n${lines.join("\n")}`;
}
