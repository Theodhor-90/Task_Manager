## Objective

Run all client tests, verify all CRUD flows work end-to-end against the dev server, and ensure no regressions from Phase 1 or the new Phase 2 code.

## Deliverables

- All existing Phase 1 tests continue to pass
- All new tests from Tasks 1–5 pass
- No TypeScript compilation errors
- No lint errors (if linting is configured)

## Implementation Details

- Run `npm run test` in `packages/client` — all tests must pass
- Run `npm run typecheck` or `tsc --noEmit` — no TypeScript errors
- Run `npm run lint` — no lint errors (if configured)
- Manual verification flow against the running dev server (`npm run dev`):
  1. Login with seed user credentials
  2. Create a new project via the dashboard "New Project" button → project appears in both dashboard grid and sidebar
  3. Create a project via the sidebar "New Project" button → same result
  4. Edit a project's name and description → changes reflected in dashboard and sidebar
  5. Delete a project → confirm in dialog → project removed from dashboard and sidebar
  6. Click a project card → navigates to `/projects/:id/board`
  7. Verify the board page placeholder renders correctly
- Fix any test failures, type errors, or lint issues discovered during verification

## Dependencies

- **Tasks 1-5** — all must be completed before final integration verification

## Verification Criteria

1. `npm run test` (client) passes with zero failures
2. `npm run typecheck` passes with zero errors
3. `npm run lint` passes with zero errors (if configured)
4. All Phase 1 tests remain passing (no regressions)
5. Full CRUD flow works against the running dev server as described in the manual verification steps
6. No console errors or warnings in the browser during the manual verification flow