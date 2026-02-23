Reviewed the three task docs and verified the review issues are resolved in the current code:

- `packages/shared/src/types/index.ts` includes `ApiError` (`export interface ApiError { error: string; }`).
- `packages/shared/src/index.ts` re-exports `ApiError` from the barrel.

I then ran the full locked-plan verification suite, plus explicit checks for `ApiError` in both types and barrel:

1. `npm install`
2. `npm run build -w @taskboard/shared`
3. `npx tsc -p packages/shared/tsconfig.json --noEmit`
4. `ls` checks for all required `dist` artifacts
5. `npm ls @taskboard/shared`
6. Node assertion checks for entity/API types (including `ApiError`)
7. Node assertion checks for constants
8. Node assertion checks for barrel exports (including `ApiError`)

All commands passed with exit code 0.