Implemented the locked plan for Task 1.

- Added JWT plugin: [jwt.plugin.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/plugins/jwt.plugin.ts)
- Added CORS plugin: [cors.plugin.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/plugins/cors.plugin.ts)
- Extended config with `corsOrigin`: [config.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/config.ts)
- Updated app factory to async and registered both plugins; removed unused `Task` import: [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts)
- Updated server bootstrap to `await buildApp()`: [server.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/server.ts)
- Updated tests for async app creation and added JWT/CORS coverage + `config.corsOrigin` default check: [app.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/app.test.ts)

Verification run:

- `npm run test -w packages/server`: executed; `packages/server/test/app.test.ts` passed, but many pre-existing model tests failed (unrelated to this task’s files).
- `npx tsc --noEmit -p packages/server/tsconfig.json`: passed.
- `npx vitest run packages/server/test/app.test.ts`: passed (7/7).
- `npm run dev` / curl checks from plan could not be completed in this environment due existing runtime issues:
  - install step `npm install fastify-plugin -w packages/server` failed because network access to npm registry is blocked (`ENOTFOUND registry.npmjs.org`)
  - `npm run dev` fails in this workspace with `tsx watch` module resolution error (`Cannot find module .../packages/server/watch`) and root dev also fails on client vite startup.