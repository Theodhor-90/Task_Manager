Now I have all the context. Let me synthesize the definitive plan. Both plan versions are essentially the same with minor differences. The recurring feedback issues across both reviews were:

1. **v1 feedback**: Remove conversational preamble; fix misleading shared package dependency (says it imports from shared but doesn't)
2. **v2 feedback**: Preamble STILL present; missing `spec.md` file for t02 — plan should either create one or cite the source of task scope

Plan v2 fixed the shared dependency issue but still had the preamble. Both reviewers flagged the preamble. The v2 reviewer additionally flagged the missing spec.md.

Here is the definitive plan:

# Task t02: User Model with Password Hashing — Implementation Plan

## 0. Task Scope Source

There is no `spec.md` file in the t02 task directory. The scope for this task is derived from the **Milestone 1 spec** (`.pipeline/milestones/m01/spec-v1.md`), Phase 2, Deliverable #2:

> `user.model.ts` — email (unique, required, lowercase, trimmed), passwordHash (required), name (required), timestamps. Pre-save hook or utility to hash passwords with bcrypt.

This plan implements the "utility" variant (standalone `hashPassword`/`verifyPassword` functions) rather than a pre-save hook, as this gives callers explicit control and avoids double-hashing bugs.

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/models/user.model.ts` | **Create** | Mongoose User schema/model with email uniqueness, required field validation, and password hashing utilities |

## 2. Dependencies

### Prerequisites
- **Phase 1 must be merged** into the working branch — specifically `packages/server/src/config.ts`, the server package scaffold, and Vitest configuration
- **t01 must be complete** — Mongoose is installed as a dependency of `@taskboard/server`
- A running MongoDB instance is NOT required for this task (model definition only; tests are in t08)

### Packages to Install
- `bcryptjs` — pure JavaScript bcrypt implementation (add to `packages/server/package.json` `dependencies`)
- `@types/bcryptjs` — TypeScript type definitions (add to `packages/server/package.json` `devDependencies`)

### Existing Code Used
- `mongoose` already installed in `packages/server` (from t01)

### Design References
- The `User` interface in `@taskboard/shared` (`packages/shared/dist/types/index.d.ts`) defines the API/transport-level entity shape (`id`, `email`, `passwordHash`, `name`, `createdAt`, `updatedAt`). The `UserDocument` interface in this task mirrors those fields at the Mongoose document level but does **not** import from `@taskboard/shared`. The shared type is a design reference only — the Mongoose model is self-contained and extends `Document` independently.

## 3. Implementation Details

### `packages/server/src/models/user.model.ts`

**Purpose**: Defines the Mongoose schema and model for the User entity, plus standalone password utility functions using bcryptjs. This model is used by the seed script (t06), auth routes (Phase 3), and referenced by other models (Project.owner, Comment.author).

**Exports**:
- `UserModel` — Mongoose model for the `User` collection
- `hashPassword(plain: string): Promise<string>` — hashes a plaintext password with bcryptjs
- `verifyPassword(plain: string, hash: string): Promise<boolean>` — compares a plaintext password against a bcrypt hash

**Implementation**:

```typescript
import mongoose, { Schema, type Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<UserDocument>("User", userSchema);

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Key decisions**:
- **`UserDocument` interface**: Extends Mongoose `Document` to provide typed access to fields. This is the Mongoose-level document type; the shared `User` interface in `@taskboard/shared` is the API/transport-level type used as a design reference only (no import from shared)
- **Standalone hash/verify functions** (not pre-save hooks): The milestone spec offers "pre-save hook or utility" — utility functions are chosen because they give callers explicit control. The seed script and auth routes call `hashPassword` before setting `passwordHash`, which avoids double-hashing bugs and makes testing straightforward
- **`bcryptjs`** (not native `bcrypt`): Pure JavaScript implementation avoids native compilation issues. The API is identical. The milestone spec-v1 explicitly recommends this approach as a mitigation for native build risks
- **Salt rounds = 10**: Standard bcrypt work factor — sufficient for an MVP, balances security and performance
- **`lowercase: true` and `trim: true`** on email: Ensures `"Admin@TaskBoard.local "` is stored as `"admin@taskboard.local"`, preventing duplicate-email edge cases
- **`unique: true`** on email: Creates a MongoDB unique index, enforced at the database level
- **Timestamps enabled**: Mongoose auto-manages `createdAt` and `updatedAt` fields

## 4. Contracts

### `UserModel`

**Schema fields**:

| Field | Type | Required | Unique | Transforms | Default |
|-------|------|----------|--------|------------|---------|
| `email` | String | Yes | Yes | lowercase, trim | — |
| `passwordHash` | String | Yes | No | — | — |
| `name` | String | Yes | No | — | — |
| `createdAt` | Date | Auto | No | — | Auto |
| `updatedAt` | Date | Auto | No | — | Auto |

**Usage example** (for reference by downstream tasks):
```typescript
import { UserModel, hashPassword } from "./models/user.model.js";

const hash = await hashPassword("admin123");
const user = await UserModel.create({
  email: "admin@taskboard.local",
  name: "Admin",
  passwordHash: hash,
});
// user.email === "admin@taskboard.local"
// user.createdAt is set automatically
```

### `hashPassword(plain: string): Promise<string>`
- **Input**: plaintext password string
- **Output**: bcrypt hash string (e.g., `"$2a$10$..."`)
- **Side effects**: None

### `verifyPassword(plain: string, hash: string): Promise<boolean>`
- **Input**: plaintext password, bcrypt hash to compare against
- **Output**: `true` if the password matches the hash, `false` otherwise
- **Side effects**: None

## 5. Test Plan

No dedicated test file is required for this task. Comprehensive model tests are defined in t08 (`packages/server/test/models/user.model.test.ts`). The t08 test cases for the User model include:

1. Create a user with valid fields — succeeds
2. Create user with duplicate email — rejected (unique constraint)
3. Create user with missing required fields (email, passwordHash, name) — rejected
4. Email is stored lowercase and trimmed
5. `hashPassword` produces a valid bcrypt hash
6. `verifyPassword` returns true for correct password, false for wrong password

**Verification approach for this task**: Confirm the module compiles, the model can be imported, and bcryptjs functions are callable. Full automated coverage comes in t08.

## 6. Implementation Order

1. **Install bcryptjs and types** — Run `npm install bcryptjs -w @taskboard/server && npm install -D @types/bcryptjs -w @taskboard/server` from the project root
2. **Create `packages/server/src/models/user.model.ts`** — Implement the schema, model, and hash/verify functions as specified above
3. **Verify TypeScript compilation** — Run `npm run build -w @taskboard/server` to confirm the module compiles without errors
4. **Run existing tests** — Run `npm run test -w @taskboard/server` to confirm no regressions

Note: The model file does NOT need to be re-exported from `packages/server/src/index.ts` at this stage. Models are internal to the server package and imported directly by routes, middleware, and the seed script within the same package. The public API of `@taskboard/server` (exposed via `index.ts`) only exports `buildApp`, `config`, `connectDb`, and `disconnectDb`.

## 7. Verification Commands

```bash
# 1. Install bcryptjs dependencies
npm install bcryptjs -w @taskboard/server && npm install -D @types/bcryptjs -w @taskboard/server

# 2. Verify TypeScript compiles cleanly
npm run build -w @taskboard/server

# 3. Verify the model can be imported (quick smoke test)
cd packages/server && npx tsx -e "
import { UserModel, hashPassword, verifyPassword } from './src/models/user.model.js';
console.log('UserModel:', typeof UserModel);
console.log('hashPassword:', typeof hashPassword);
console.log('verifyPassword:', typeof verifyPassword);
console.log('All imports ok');
"

# 4. Verify bcrypt functions work
cd packages/server && npx tsx -e "
import { hashPassword, verifyPassword } from './src/models/user.model.js';
const hash = await hashPassword('test123');
console.log('Hash produced:', hash.startsWith('\$2'));
const valid = await verifyPassword('test123', hash);
console.log('Verify correct:', valid === true);
const invalid = await verifyPassword('wrong', hash);
console.log('Verify wrong:', invalid === false);
"

# 5. Run existing tests to confirm no regressions
npm run test -w @taskboard/server
```