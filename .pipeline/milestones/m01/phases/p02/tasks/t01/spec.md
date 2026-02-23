# Task t01 Spec: MongoDB Connection Module

## Objective
Implement MongoDB connection helpers for the server package.

## Required Deliverable
- `packages/server/src/db.ts` exporting:
  - `connectDb(): Promise<void>`
  - `disconnectDb(): Promise<void>`

## Requirements
- Use `mongoose` for MongoDB connectivity.
- Read connection URI from `config.mongodbUri`.
- `connectDb` must log failures and rethrow connection errors.
- `disconnectDb` must close the mongoose default connection.
- Module must compile and be exportable via `packages/server/src/index.ts`.

## Verification
Run:
1. `npm install mongoose -w @taskboard/server`
2. `npm run build -w @taskboard/server`
3. `cd packages/server && npx tsx -e "import { connectDb, disconnectDb } from './src/db.js'; console.log('imports ok:', typeof connectDb, typeof disconnectDb)"`
4. `cd packages/server && npx tsx -e "import { connectDb, disconnectDb } from './src/db.js'; await connectDb(); await disconnectDb(); console.log('Connection test passed');"`
5. `npm run test -w @taskboard/server`
