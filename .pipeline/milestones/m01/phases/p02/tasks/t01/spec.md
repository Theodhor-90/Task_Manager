## Task: MongoDB Connection Module

### Objective
Create the MongoDB connection module that provides `connectDb` and `disconnectDb` functions using Mongoose, configurable via the `MONGODB_URI` environment variable.

### Deliverables
- **Create** `packages/server/src/db.ts`

### Implementation Details
- Export an async `connectDb()` function that connects to MongoDB using `mongoose.connect()` with the URI from `config.mongodbUri` (already defined in `packages/server/src/config.ts` — defaults to `mongodb://localhost:27017/taskboard`)
- Export an async `disconnectDb()` function that calls `mongoose.disconnect()`
- Include connection error handling and logging (log successful connection, throw/log on failure)
- Use the existing `Config` interface and `config` object from `packages/server/src/config.ts`
- Install `mongoose` as a dependency in `packages/server`

### Dependencies
- Phase 1 complete (server package scaffold, config module)
- Requires `mongoose` npm package (to be installed)
- Requires a running MongoDB instance accessible at the configured URI

### Verification Criteria
- `connectDb()` connects to MongoDB successfully when a MongoDB instance is running
- `disconnectDb()` cleanly closes the connection
- Connection errors are handled (logged/thrown) — not silently swallowed
- The module imports and uses `config.mongodbUri` from the existing config