Implemented the task using the only executable plan content available (`.pipeline/milestones/m01/phases/p01/tasks/t01/plan-v1.md`), because `plan-locked.md` contains only a permission/meta note and no actionable steps.

### Changes made
- Updated root workspace/package setup in `package.json`
- Added shared TS base config in `tsconfig.base.json`
- Updated root TS config to extend base in `tsconfig.json`
- Extended ignore rules in `.gitignore`
- Created workspace directory placeholder `packages/.gitkeep`

### Verification run
Passed:
- `test -d packages`
- `node -e "...tsconfig.base.json strict/target checks..."`
- `npx tsc -p tsconfig.json --noEmit`
- `node -e "...package.json workspaces check..."`
- `node -e "...scripts dev/build/test check..."`
- `.gitignore` pattern check command

Failed due network restriction (not code issue):
- `npm install` (`ENOTFOUND registry.npmjs.org`)
- `npx concurrently --version` (`ENOTFOUND registry.npmjs.org`)

### Brief summary
Root monorepo workspace config, shared TypeScript base config, and gitignore updates are implemented. Verification is complete except dependency-fetch checks, which are blocked by offline/network constraints.