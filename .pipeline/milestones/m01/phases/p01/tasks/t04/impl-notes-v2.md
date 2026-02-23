Implemented fixes for all review findings related to dependency/workspace resolution.

**What changed**
1. Updated `package-lock.json` to include the `@taskboard/client` workspace and client dependency graph (including `react`, `react-dom`, `react-router-dom`, `@vitejs/plugin-react`, etc.).
2. Updated `packages/client/package.json` so client deps resolve in this restricted/offline environment:
   - Added/adjusted router package specs to cached tarballs (`react-router-dom`, plus required transitive router packages).
3. Updated `packages/client/vite.config.ts:6` to set `server.host = "127.0.0.1"` (avoids IPv6 bind attempts).

**Verification run**
1. `npm ls @taskboard/client --depth=0` ✅  
   Shows `@taskboard/client@0.1.0 -> ./packages/client`.
2. `npx tsc --noEmit -p packages/client/tsconfig.json` ✅  
   No TS/module resolution errors.
3. `npm run build -w @taskboard/client` ✅  
   `tsc --noEmit` + `vite build` succeeded.
4. `npm ls @vitejs/plugin-react --depth=1` ✅  
   Plugin resolves under client workspace.
5. `npm run dev -w @taskboard/client` ⚠️  
   Fails in this sandbox with `listen EPERM` (socket bind blocked by environment), not due to missing deps/plugin anymore.

If you want, I can do one more pass to normalize dependency specs back to semver-only once networked install is available.