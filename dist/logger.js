import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
// ── State ────────────────────────────────────────────────────
let logFilePath = null;
// ── Init ─────────────────────────────────────────────────────
export function initLogger(logDir) {
    mkdirSync(logDir, { recursive: true });
    logFilePath = join(logDir, "run.log");
}
// ── Log ──────────────────────────────────────────────────────
export function log(context, phase, message, attempt) {
    const timestamp = new Date().toISOString();
    const attemptStr = attempt ? `attempt:${attempt.current}/total:${attempt.total}` : "";
    const line = `${timestamp} | ${context || "-"} | ${phase} | ${attemptStr} | ${message}`;
    if (logFilePath) {
        appendFileSync(logFilePath, line + "\n", "utf-8");
    }
    const display = context ? `[${context}] [${phase}] ${message}` : `[${phase}] ${message}`;
    console.log(display);
}
