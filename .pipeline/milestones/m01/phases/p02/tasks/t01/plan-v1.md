Now I understand the full picture. The p02 branch was created from the initial commit (before p01 work), so Phase 1 source code is only on the `phase/m01-p01` branch. This task (t01) needs to be planned assuming Phase 1 deliverables are available (they'll need to be merged/cherry-picked before implementation).

Now I have everything needed to produce the implementation plan for Task t01: MongoDB Connection Module.

# Task t01: MongoDB Connection Module — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/db.ts` | **Create** | MongoDB connection module with `connectDb` and `disconnectDb` functions using Mongoose |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically `packages/server/src/config.ts` (provides `config.mongodbUri`) and the server package scaffold
- A running MongoDB instance accessible at `mongodb://localhost:27017` (or the URI configured via `MONGODB_URI` env var)

### Packages to Install
- `mongoose` — MongoDB ODM (add to `packages/server/package.json` `dependencies`)
- `@types/mongoose` is NOT needed — Mongoose 8+ ships its own TypeScript types

### Existing Code Used
- `config.mongodbUri` from `packages/server/src/config.ts` (defaults to `mongodb://localhost:27017/taskboard`)
- `Config` interface from `packages/server/src/config.ts`

## 3. Implementation Details

### `packages/server/src/db.ts`

**Purpose**: Provides async functions to connect to and disconnect from MongoDB via Mongoose. Used by `server.ts` at startup and by test helpers for setup/teardown.

**Exports**:
- `connectDb(): Promise<void>` — connects to MongoDB
- `disconnectDb(): Promise<void>` — disconnects from MongoDB

**Implementation**:

```typescript
import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDb(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log(`Connected to MongoDB at ${config.mongodbUri}`);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}
```

**Key decisions**:
- Uses `console.log`/`console.error` for logging (consistent with the existing `server.ts` which uses `app.log.error`; at the db module level we don't have access to the Fastify logger, and the module may be used outside Fastify context such as in tests)
- Errors are logged AND re-thrown — callers (server startup, tests) can handle them appropriately
- No Mongoose connection options beyond the URI — Mongoose 8+ uses sensible defaults (no need for deprecated options like `useNewUrlParser` or `useUnifiedTopology`)
- The `config.mongodbUri` value comes from the existing config module and supports override via `MONGODB_URI` environment variable, enabling separate dev and test databases

## 4. Contracts

### `connectDb()`
- **Input**: None (reads URI from `config.mongodbUri` internally)
- **Output**: `Promise<void>` — resolves on successful connection, rejects with the connection error on failure
- **Side effect**: Establishes a Mongoose default connection (`mongoose.connection`)

### `disconnectDb()`
- **Input**: None
- **Output**: `Promise<void>` — resolves when disconnection is complete
- **Side effect**: Closes the Mongoose default connection

### Environment Configuration
| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `mongodb://localhost:27017/taskboard` | MongoDB connection string |

For tests, override with: `MONGODB_URI=mongodb://localhost:27017/taskboard_test`

## 5. Test Plan

No dedicated test file is required for this task. The task spec states only verification criteria (functional behavior), and the comprehensive model tests in task t08 will exercise `connectDb`/`disconnectDb` via test helpers (`test/helpers/db.ts`) that wrap these functions. The existing `packages/server/test/app.test.ts` does not need modification.

**Verification approach**: Manual verification that the module compiles, imports correctly, and connects to a running MongoDB instance. Automated coverage comes in t08.

## 6. Implementation Order

1. **Install mongoose** — Run `npm install mongoose -w @taskboard/server` from the project root
2. **Create `packages/server/src/db.ts`** — Implement `connectDb` and `disconnectDb` as specified above
3. **Update `packages/server/src/index.ts`** — Add re-exports for `connectDb` and `disconnectDb` so they're accessible from the package's public API
4. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm the module compiles without errors

### Update to `packages/server/src/index.ts`

Add the following exports:

```typescript
export { connectDb, disconnectDb } from "./db.js";
```

The full file becomes:

```typescript
export { buildApp } from "./app.js";
export { config } from "./config.js";
export type { Config } from "./config.js";
export { connectDb, disconnectDb } from "./db.js";
```

## 7. Verification Commands

```bash
# 1. Install mongoose dependency
npm install mongoose -w @taskboard/server

# 2. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 3. Verify the module can be imported (quick smoke test)
cd packages/server && npx tsx -e "import { connectDb, disconnectDb } from './src/db.js'; console.log('imports ok:', typeof connectDb, typeof disconnectDb)"

# 4. Verify connection works (requires running MongoDB)
cd packages/server && npx tsx -e "
import { connectDb, disconnectDb } from './src/db.js';
await connectDb();
await disconnectDb();
console.log('Connection test passed');
"

# 5. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```