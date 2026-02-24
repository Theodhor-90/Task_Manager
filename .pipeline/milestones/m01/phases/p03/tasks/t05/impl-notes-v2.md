Implemented the review fix in [auth.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/api/auth.ts):

- `login()` now uses the shared API client:
  - Changed from direct `fetch(...)` to `apiClient.post<LoginResponse>("/api/auth/login", { email, password })`
- Removed now-unused `API_BASE_URL` import.
- `getMe()` already used `apiClient` and remains unchanged.

This addresses the review issue that all API calls must go through the shared client.

Verification commands run (from locked plan):

1. `npx tsc --noEmit -p packages/client/tsconfig.json` passed.
2. `npm run build -w packages/client` passed.
3. `ls -la packages/client/src/api/` confirms `client.ts` and `auth.ts` are present.

Runtime/browser verification command in the plan was not executed here (requires running server + browser session).