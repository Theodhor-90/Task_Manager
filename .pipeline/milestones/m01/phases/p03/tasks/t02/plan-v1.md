It seems write permission hasn't been granted yet. The plan is ready — here's a summary of what I've prepared:

# Task 2 Implementation Plan: Auth Middleware

## Summary

**3 deliverables:**

1. **`packages/server/src/middleware/auth.middleware.ts`** (Create) — A `fastify-plugin`-wrapped `onRequest` hook that:
   - Checks an allow-list (`POST /api/auth/login`, `GET /api/health`) — matching on both method and path (with query string stripping)
   - Calls `request.jwtVerify()` for non-allow-listed routes
   - Returns `401 { error: "Unauthorized" }` on any token failure
   - Includes `@fastify/jwt` `FastifyJWT` type augmentation so `request.user` is typed as `{ id, email, name }` throughout the app

2. **`packages/server/src/app.ts`** (Modify) — Add import and `await app.register(authMiddleware)` after JWT and CORS plugins

3. **`packages/server/test/app.test.ts`** (Modify) — Add 5 new tests:
   - T1: Health endpoint accessible without token (allow-listed)
   - T2: Protected route rejects missing token → 401
   - T3: Protected route rejects invalid token → 401
   - T4: Protected route passes with valid token, `request.user` is populated
   - T5: Protected route rejects tampered token → 401

**No new dependencies needed** — `fastify-plugin` is already installed from t01.

**All 7 existing tests remain unchanged** — they either hit allow-listed routes or don't make HTTP requests.

Would you like to grant write permission so I can save the plan file?