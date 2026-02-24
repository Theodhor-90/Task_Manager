## Objective

Register `@fastify/jwt` and `@fastify/cors` as Fastify plugins so that JWT signing/verification and cross-origin requests are available to the entire server application.

## Deliverables

### New Files

- **`packages/server/src/plugins/jwt.plugin.ts`** — Registers `@fastify/jwt` on the Fastify instance using `config.jwtSecret` from the existing `packages/server/src/config.ts` module. Configures token expiry to `24h`. Exports the plugin registration function.
- **`packages/server/src/plugins/cors.plugin.ts`** — Registers `@fastify/cors` allowing origin from `CORS_ORIGIN` env var (default: `http://localhost:5173`), with credentials support enabled.

### Modified Files

- **`packages/server/src/app.ts`** — Import and register both plugins in `buildApp()`.

## Key Implementation Details

- `@fastify/jwt` (^9.0.0) and `@fastify/cors` (^10.0.0) are already installed in `packages/server` — no new package installs needed.
- JWT secret comes from `config.jwtSecret`, which reads `JWT_SECRET` env var with fallback `dev-jwt-secret-change-in-production`.
- CORS origin defaults to `http://localhost:5173` (Vite dev server default), configurable via `CORS_ORIGIN` env var.
- After plugin registration, `app.jwt.sign(payload)` and `request.jwtVerify()` must be available on the Fastify instance/request.

## Dependencies

- None within this phase. Depends on Phase 1 (monorepo/dev environment) and Phase 2 (database/models) being complete.
- Existing `config.ts` provides `jwtSecret`.

## Verification Criteria

1. `app.jwt.sign({ test: true })` returns a valid JWT string after plugin registration.
2. `request.jwtVerify()` is available as a method on Fastify request objects.
3. CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`) are present on responses to requests from `http://localhost:5173`.
4. `npm run dev` starts the server without errors after plugin registration.
5. All pre-existing tests still pass.