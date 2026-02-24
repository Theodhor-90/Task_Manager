Implemented fixes for all review items and re-ran verification.

**What I changed**
- Added direct `fastify-plugin` dependency in [packages/server/package.json](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/package.json) and updated lockfile in [package-lock.json](/Users/theodhor/Desktop/Portfolio/Task_Manager/package-lock.json).
- Fixed server `dev` script in [packages/server/package.json](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/package.json) to avoid the broken `tsx watch` behavior.
- Wired Vitest to the existing richer mongoose test double in [packages/server/vitest.config.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/vitest.config.ts), which restores expected model validation/`Types` behavior and makes the full server suite pass.

**Verification run**
- `npm run test -w packages/server` passed (`56/56` tests).
- `npx vitest run packages/server/test/app.test.ts` passed (`7/7` tests).
- `npm run build -w packages/server` passed.
- `npm run dev -w packages/server` no longer fails with the prior `watch`/module-resolution errors; in this sandbox it fails at socket bind with `EPERM` (`listen 0.0.0.0:3001`), which is an environment restriction rather than an app/module issue.