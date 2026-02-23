The plan file write was blocked by permissions. Here is the complete definitive implementation plan:

---

# Implementation Plan — t03: Server package scaffold

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/package.json` | Modify | Add `@taskboard/shared` as explicit workspace dependency |
| 2 | `packages/server/tsconfig.json` | Verify | TypeScript config extending `../../tsconfig.base.json` — already correct |
| 3 | `packages/server/src/app.ts` | Verify | Fastify app factory function — already correct |
| 4 | `packages/server/src/server.ts` | Verify | Entry point — already correct |
| 5 | `packages/server/src/config.ts` | Verify | Reads env vars (`PORT`, `MONGODB_URI`, `JWT_SECRET`) with dev defaults — already correct |
| 6 | `packages/server/src/index.ts` | Verify | Barrel export re-exporting `buildApp`, `config`, `Config` — already correct |
| 7 | `packages/server/src/models/.gitkeep` | Verify | Empty directory stub — already exists |
| 8 | `packages/server/src/routes/.gitkeep` | Verify | Empty directory stub — already exists |
| 9 | `packages/server/src/middleware/.gitkeep` | Verify | Empty directory stub — already exists |
| 10 | `packages/server/src/plugins/.gitkeep` | Verify | Empty directory stub — already exists |
| 11 | `packages/server/vitest.config.ts` | Modify | Remove `globals: true`, keep `passWithNoTests: true` |

**Note:** All files were created in a prior implementation attempt based on plan-v1. This plan focuses on two corrections plus verification.

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed
- **t02** (Shared package scaffold) — completed

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastify` | `^5.0.0` | HTTP framework |
| `@fastify/jwt` | `^9.0.0` | JWT auth plugin |
| `@fastify/cors` | `^10.0.0` | CORS plugin |
| `@taskboard/shared` | `*` | Shared types and constants (workspace dependency) |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | `^3.0.0` | Test runner |
| `supertest` | `^7.0.0` | HTTP assertions |
| `tsx` | `^4.0.0` | TypeScript execution with watch |
| `@types/supertest` | `^6.0.0` | TypeScript types for supertest |

## Tiebreaker Decisions

| # | Issue | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | `import Fastify from "fastify"` compat | **Keep default import** | Verified by `tsc --noEmit` — Fastify 5 declares `export { fastify as default }`, works with `Node16` + `esModuleInterop` |
| 2 | `@taskboard/shared` dependency | **Add now as `"*"`** | Documents relationship, ensures `npm ls` accuracy, guarantees `Node16` module resolution |
| 3 | `globals: true` in vitest | **Remove** | Explicit `import { describe, it, expect } from "vitest"` is simpler, needs no tsconfig changes |
| 4 | `passWithNoTests: true` | **Keep** | Without it, `vitest run` fails with zero test files — necessary for scaffold phase |
| 5 | `src/index.ts` in deliverables | **Add** | File exists and is referenced by `package.json`'s `exports`/`main`/`types` — omitting creates a contradiction |
| 6 | Root `npm run dev` failure | **Document as known limitation** | Requires `packages/client/` which doesn't exist yet; use `npm run dev -w @taskboard/server` |

The full plan content was written above — would you like me to retry writing it to `plan-locked.md`?