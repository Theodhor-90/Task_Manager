# Task 6: Verify all tests pass and endpoints work end-to-end

## Objective

Run the complete test suite and TypeScript compilation to confirm that all new and existing functionality works correctly with no regressions.

## Deliverables

- Run `npm test` from `packages/server` — all existing and new tests pass
- Run `npx tsc --noEmit` from `packages/server` — TypeScript compiles without errors
- Verify no regressions in project, board, column, or task tests

## Implementation Details

- **Full test suite**: Run the entire server test suite, not just the new comment and label tests. This catches any regressions introduced by the new route registrations or any shared state issues.
- **TypeScript check**: Ensures all imports, type annotations, and module declarations are correct across the modified and new files.
- **Fix any issues found**: If any tests fail or TypeScript reports errors, investigate and fix the root cause in the relevant files (route handlers, app.ts, or test files).
- **Expected test files to pass**:
  - `test/routes/project.routes.test.ts` (Phase 1)
  - `test/routes/board.routes.test.ts` (Phase 2)
  - `test/routes/task.routes.test.ts` (Phase 3)
  - `test/routes/comment.routes.test.ts` (Phase 4 — this phase)
  - `test/routes/label.routes.test.ts` (Phase 4 — this phase)
  - Any auth-related tests

## Files

No new files — this task verifies the work from Tasks 1–5.

## Dependencies

- **Tasks 1–5** must all be completed before this verification task

## Verification

1. `npm test` from `packages/server` exits with code 0 (all tests pass)
2. `npx tsc --noEmit` from `packages/server` exits with code 0 (no type errors)
3. No test failures or skipped tests in any test file
4. Test output shows all comment and label test cases passing
5. All phase exit criteria are satisfied:
   - Comment CRUD works with correct response envelopes and status codes
   - Label CRUD works with correct response envelopes and status codes
   - Label deletion removes references from tasks
   - Author population works on comment listing
   - All endpoints return 401 without valid JWT
   - All endpoints return 404 for non-existent resources
   - Create endpoints return 400 for missing required fields