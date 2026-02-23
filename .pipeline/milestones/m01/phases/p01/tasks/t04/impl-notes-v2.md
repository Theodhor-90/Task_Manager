Implemented fixes for the review items that are code/config scoped:

1. Updated `packages/client/tsconfig.json` to satisfy the spec requirement by extending the base config.
- File: `packages/client/tsconfig.json`
- Change: added `"extends": "../../tsconfig.base.json"` and client-specific overrides (`module`, `moduleResolution`, `jsx`, `noEmit`, and disabling declaration/source map emission for SPA usage).

2. Repaired local workspace visibility for `@taskboard/client` in this environment.
- Verification now shows:
  - `npm ls @taskboard/client` -> `@taskboard/client@0.1.0 -> ./packages/client`

Verification run results:

1. `npm ls @taskboard/client`  
- Passes.

2. `npx tsc --noEmit -p packages/client/tsconfig.json`  
- Fails due missing installed packages: `react`, `react-dom`, `react-router-dom` (TS2307/TS2875/TS7026).

3. `npm run build -w @taskboard/client`  
- Fails for same missing dependencies.

4. `npm run dev -w @taskboard/client`  
- Fails because `@vitejs/plugin-react` is not installed (`ERR_MODULE_NOT_FOUND`).

5. `ls packages/client/dist`  
- Fails because build could not complete.

Important blocker:
- Package installation is currently blocked in this sandbox (`npm` fetch to registry fails with `ENOTFOUND`, observed on `npm install --loglevel verbose`), so dependency-resolution-related review items cannot be fully closed here without network access.