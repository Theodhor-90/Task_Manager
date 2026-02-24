Implemented the locked plan deliverables for Task 5.

Created files:
- [client.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/api/client.ts)
- [auth.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/api/auth.ts)

What was implemented:
- `API_BASE_URL` with `import.meta.env.VITE_API_URL ?? "http://localhost:3001"`.
- `TOKEN_KEY = "taskboard_token"`.
- Shared `request<T>()` wrapper with:
  - JSON content-type header
  - JWT injection from `localStorage`
  - 401 interceptor (clear token + redirect to `/login` + throw `Unauthorized`)
  - non-2xx error parsing via `error` field fallback to generic status message
- `apiClient` methods: `get`, `post`, `put`, `del`.
- `login(email, password)` and `getMe()` in auth API module.
- Added [vite-env.d.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/vite-env.d.ts) to satisfy TypeScript typing for `import.meta.env` and make verification pass.

Verification run:
- `npx tsc --noEmit -p packages/client/tsconfig.json` passed.
- `npm run build -w packages/client` passed.
- `ls -la packages/client/src/api/` shows `client.ts` and `auth.ts`.

Notes:
- No new dependencies were required or installed.
- The runtime/manual browser verification step from the plan (requires running server + browser flow) was not executed in this terminal-only run.