## Task: Seed Script

### Objective
Create an idempotent seed script that creates the default admin user on first server start when no users exist, and wire it into server startup.

### Deliverables
- **Create** `packages/server/src/seed.ts`
- **Modify** `packages/server/src/server.ts` — call seed function during startup after DB connection

### Implementation Details
- Export an async `seedDefaultUser()` function that:
  1. Checks if any users exist in the database (`UserModel.countDocuments()`)
  2. If no users exist, creates the default admin user:
     - `email`: `"admin@taskboard.local"`
     - `password`: `"admin123"` (hashed via `hashPassword` from the User model utilities)
     - `name`: `"Admin"`
  3. Logs whether a user was created or already exists
  4. If users already exist, does nothing (idempotent)
- Modify `packages/server/src/server.ts` to:
  1. Call `connectDb()` from `db.ts` before starting the Fastify listener
  2. Call `seedDefaultUser()` after successful DB connection
  3. Handle connection/seed errors appropriately

### Dependencies
- **t01**: `connectDb` function from `db.ts`
- **t02**: `UserModel` and `hashPassword` from user model
- **t06**: Barrel file for clean imports (optional but preferred)

### Verification Criteria
- Running the server for the first time creates the admin user in the database
- Running the server again does NOT create a duplicate user (idempotent)
- The admin user has email `admin@taskboard.local`, name `Admin`, and a bcrypt-hashed password
- The admin user's password `admin123` can be verified with `verifyPassword`
- Server startup connects to MongoDB before calling seed
- Errors during connection or seeding are logged and handled