## Task: User Model with Password Hashing

### Objective
Implement the Mongoose User model with email uniqueness, required field validation, and bcrypt password hashing utilities.

### Deliverables
- **Create** `packages/server/src/models/user.model.ts`

### Implementation Details
- Define a Mongoose schema matching the shared `User` interface from `packages/shared/src/types/index.ts`
- Fields:
  - `email`: String, required, unique, lowercase, trimmed
  - `passwordHash`: String, required
  - `name`: String, required
  - Timestamps: enabled (`createdAt`, `updatedAt` auto-managed)
- Unique index on `email`
- Create standalone password utility functions (not pre-save hooks):
  - `hashPassword(plain: string): Promise<string>` — hashes using bcryptjs
  - `verifyPassword(plain: string, hash: string): Promise<boolean>` — compares using bcryptjs
- Install `bcryptjs` (pure JavaScript implementation) as a dependency and `@types/bcryptjs` as a dev dependency in `packages/server`
- Export the `UserModel` (Mongoose model) and the hash/verify helper functions

### Dependencies
- **t01**: MongoDB connection module must exist (Mongoose must be installed)
- Requires `bcryptjs` and `@types/bcryptjs` npm packages
- Uses shared types from `packages/shared/src/types/index.ts`

### Verification Criteria
- `UserModel` can create a user document with valid fields
- Creating a user with a duplicate email is rejected (unique constraint)
- Creating a user with missing required fields (email, passwordHash, name) is rejected
- `hashPassword` returns a bcrypt hash string
- `verifyPassword` returns `true` for correct password, `false` for incorrect
- Email is stored lowercase and trimmed regardless of input casing/whitespace