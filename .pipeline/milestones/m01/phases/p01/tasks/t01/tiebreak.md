## Summary

The task involved fixing **template variable name mismatches** between what the `cycle.ts` engine provides and what the prompt templates expected. There were exactly **3 changes** (all already present in the working tree):

### Changes

1. **`package.json`** — Added `bin` field pointing `iteration-engine` to `dist/orchestrator.js`

2. **`prompts/impl/review.md`** — Fixed `{{IMPL_NOTES_PATH}}` → `{{DRAFT_PATH}}`
   - The cycle engine (`cycle.ts:102-104`) passes `DRAFT_PATH: draftFile` when calling the challenge template, but the review prompt was referencing a non-existent `IMPL_NOTES_PATH` variable. This would cause a runtime error from `templates.ts` ("unreplaced placeholders").

3. **`prompts/impl/implement-fix.md`** — Fixed `{{REVIEW_PATH}}` → `{{FEEDBACK_PATH}}`
   - The cycle engine (`cycle.ts:82-85`) passes `FEEDBACK_PATH: prevFeedback` when calling the refine template, but the implement-fix prompt was referencing a non-existent `REVIEW_PATH` variable. Same runtime failure.

### Verification

- TypeScript typecheck: **passes**
- TypeScript build: **passes**  
- All 24 tests (18 state + 6 cycle): **pass**
- All template variables across all 19 prompt files are now consistent with their call sites in the code