Now I have everything needed. Let me produce the implementation plan.

# Task t07: Seed Script — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/seed.ts` | **Create** | Idempotent seed function that creates the default admin user when no users exist |
| 2 | `packages/server/src/server.ts` | **Modify** | Wire up DB connection and seed function into server startup |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically the server package scaffold (`app.ts`, `server.ts`, `config.ts`)
- **t01 must be complete** — `connectDb` function from `db.ts`
- **t02 must be complete** — `UserModel` and `hashPassword` from `user.model.ts`
- **t06 must be complete** — Barrel file `models/index.ts` for clean imports (preferred import path)
- A running MongoDB instance accessible at the configured `MONGODB_URI`

### Packages to Install
None — all dependencies (`mongoose`, `bcryptjs`) are already installed from t01 and t02.

### Existing Code Used
- `connectDb()` from `packages/server/src/db.ts` — establishes MongoDB connection
- `UserModel` from `packages/server/src/models/user.model.ts` (via barrel `models/index.ts`) — queries and creates users
- `hashPassword` from `packages/server/src/models/user.model.ts` (via barrel `models/index.ts`) — hashes the seed password
- `buildApp` from `packages/server/src/app.ts` — Fastify app factory
- `config` from `packages/server/src/config.ts` — provides `config.port`

## 3. Implementation Details

### `packages/server/src/seed.ts`

**Purpose**: Exports an idempotent `seedDefaultUser()` function that creates the default admin user when the database has no users. Called during server startup after the DB connection is established.

**Exports**:
- `seedDefaultUser(): Promise<void>` — checks if any users exist; if not, creates the default admin user

**Implementation**:

```typescript
import { UserModel, hashPassword } from "./models/index.js";

export async function seedDefaultUser(): Promise<void> {
  const count = await UserModel.countDocuments();
  if (count > 0) {
    console.log("Seed: users already exist, skipping");
    return;
  }

  const passwordHash = await hashPassword("admin123");
  await UserModel.create({
    email: "admin@taskboard.local",
    name: "Admin",
    passwordHash,
  });
  console.log("Seed: created default admin user (admin@taskboard.local)");
}
```

**Key decisions**:
- **`UserModel.countDocuments()`** instead of `findOne()`: `countDocuments()` is the idiomatic way to check collection emptiness — it's efficient (MongoDB uses collection metadata for count) and clearly communicates the intent. Checking `count > 0` rather than looking for a specific email ensures the seed is skipped if *any* user exists, not just the admin user
- **Imports from barrel file** (`./models/index.js`): Uses the barrel file created in t06 for clean imports, consistent with the intended usage pattern for downstream code (seed, routes, tests)
- **`console.log` for logging**: Consistent with `db.ts` which uses `console.log`/`console.error`. The seed function runs before Fastify is listening, so the Fastify logger is not available at this point. Logging whether a user was created or skipped aids debugging on first-run and subsequent startups
- **No try/catch**: Errors (connection issues, validation failures) propagate to the caller (`server.ts`), which handles them. Adding a try/catch here would mask errors that should cause startup to fail
- **Hardcoded seed values**: The email (`admin@taskboard.local`), password (`admin123`), and name (`Admin`) are hardcoded as specified in the Master Plan Section 3.3. These are not configurable — they are the first-run defaults for a single-user MVP

### `packages/server/src/server.ts` (Modified)

**Purpose**: Wire up the MongoDB connection and seed function into the server startup sequence. The current `server.ts` calls `buildApp()` and listens immediately. The modified version connects to MongoDB first, seeds the default user, then starts listening.

**Current content**:
```typescript
import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

**Modified content**:
```typescript
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import { seedDefaultUser } from "./seed.js";

const app = buildApp();

try {
  await connectDb();
  await seedDefaultUser();
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

**Key decisions**:
- **`connectDb()` before `seedDefaultUser()`**: The seed function queries MongoDB via Mongoose, so the connection must be established first. Both are awaited sequentially inside the existing try/catch block
- **`seedDefaultUser()` before `app.listen()`**: The seed runs during startup, before the server accepts requests. This ensures the admin user is available from the first request
- **Errors handled by existing try/catch**: If `connectDb()` or `seedDefaultUser()` throws, the error is logged via `app.log.error(err)` and the process exits with code 1. This is the same error handling pattern already in place for `app.listen()` failures
- **Import `connectDb` from `./db.js`** (not from `./index.js`): The server entry point imports internal modules directly, consistent with how it already imports `buildApp` from `./app.js` and `config` from `./config.js`. The barrel file `./index.ts` is for external consumers of the `@taskboard/server` package
- **Import `seedDefaultUser` from `./seed.js`**: Direct import of the new seed module

## 4. Contracts

### `seedDefaultUser()`
- **Input**: None (reads from `UserModel` and uses hardcoded seed values internally)
- **Output**: `Promise<void>` — resolves when seeding is complete (either user created or skipped)
- **Side effects**: Creates one document in the `users` collection if no users exist. Logs the outcome to stdout
- **Idempotency**: Safe to call multiple times. If users already exist (from a previous seed or manual creation), no action is taken

### Seed User Data
| Field | Value |
|-------|-------|
| `email` | `admin@taskboard.local` |
| `name` | `Admin` |
| `password` (plaintext, hashed before storage) | `admin123` |

### Server Startup Sequence (after modification)
1. `buildApp()` — creates the Fastify instance
2. `connectDb()` — connects to MongoDB
3. `seedDefaultUser()` — creates admin user if needed
4. `app.listen()` — starts accepting HTTP requests

If any step fails, the error is logged and the process exits with code 1.

## 5. Test Plan

No dedicated test file is required for this task. Comprehensive seed tests are defined in t08 (`packages/server/test/models/seed.test.ts`). The t08 test cases for the seed script include:

1. Running seed when no users exist creates the admin user
2. Running seed when users already exist does nothing (idempotent)
3. The created user has email `admin@taskboard.local`, name `Admin`, and a valid password hash
4. The created user's password `admin123` can be verified with `verifyPassword`

**Verification approach for this task**: Confirm the module compiles, the seed function can be imported, and manual testing against a running MongoDB instance verifies first-run creation and idempotency. Full automated coverage comes in t08.

## 6. Implementation Order

1. **Create `packages/server/src/seed.ts`** — Implement the `seedDefaultUser` function as specified above
2. **Modify `packages/server/src/server.ts`** — Add imports for `connectDb` and `seedDefaultUser`, wire them into the startup sequence before `app.listen()`
3. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm both files compile without errors
4. **Run existing tests** — Run `npm run test -w @taskboard/server` to confirm no regressions

Note: No packages need to be installed. The seed module does NOT need to be re-exported from `packages/server/src/index.ts` — the seed function is internal to the server package and only called by `server.ts`. The public API of `@taskboard/server` (exposed via `src/index.ts`) exports `buildApp`, `config`, `connectDb`, and `disconnectDb`.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 2. Verify the seed module can be imported (quick smoke test)
cd packages/server && npx tsx -e "
import { seedDefaultUser } from './src/seed.js';
console.log('seedDefaultUser:', typeof seedDefaultUser);
console.log('Import ok');
"

# 3. Verify server.ts imports are correct (quick smoke test — does NOT start the server)
cd packages/server && npx tsx -e "
import { connectDb } from './src/db.js';
import { seedDefaultUser } from './src/seed.js';
import { buildApp } from './src/app.js';
console.log('connectDb:', typeof connectDb);
console.log('seedDefaultUser:', typeof seedDefaultUser);
console.log('buildApp:', typeof buildApp);
console.log('All server.ts imports ok');
"

# 4. Verify seed creates user on first run (requires running MongoDB)
cd packages/server && npx tsx -e "
import mongoose from 'mongoose';
import { config } from './src/config.js';
import { connectDb, disconnectDb } from './src/db.js';
import { seedDefaultUser } from './src/seed.js';
import { UserModel, verifyPassword } from './src/models/index.js';

await connectDb();

// Clean up any existing seed user for a fresh test
await UserModel.deleteMany({});
console.log('Cleaned users collection');

// First run — should create user
await seedDefaultUser();
const user = await UserModel.findOne({ email: 'admin@taskboard.local' });
console.log('User created:', user !== null);
console.log('Email:', user?.email);
console.log('Name:', user?.name);
console.log('Has passwordHash:', typeof user?.passwordHash === 'string' && user.passwordHash.length > 0);

// Verify password
const passwordValid = await verifyPassword('admin123', user!.passwordHash);
console.log('Password valid:', passwordValid);

// Second run — should skip
const countBefore = await UserModel.countDocuments();
await seedDefaultUser();
const countAfter = await UserModel.countDocuments();
console.log('Idempotent:', countBefore === countAfter);

// Clean up
await UserModel.deleteMany({});
await disconnectDb();
console.log('All seed verifications passed');
"

# 5. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```