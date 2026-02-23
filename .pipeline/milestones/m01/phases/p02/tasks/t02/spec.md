# Task t02 Spec: User Model with Password Hashing

## Objective
Implement the User Mongoose model and password hashing utilities for the server package.

## Required Deliverable
- `packages/server/src/models/user.model.ts` exporting:
  - `UserModel`
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`

## Requirements
- Define a User schema with:
  - `email`: required, unique, lowercase, trimmed
  - `passwordHash`: required
  - `name`: required
- Enable Mongoose timestamps (`createdAt`, `updatedAt`).
- Implement password hashing using `bcryptjs` via utility functions (`hashPassword` and `verifyPassword`).
- Model module must compile cleanly in `@taskboard/server`.

## Verification
Run:
1. `npm install bcryptjs -w @taskboard/server && npm install -D @types/bcryptjs -w @taskboard/server`
2. `npm run build -w @taskboard/server`
3. `cd packages/server && npx tsx -e "import { UserModel, hashPassword, verifyPassword } from './src/models/user.model.js'; console.log('UserModel:', typeof UserModel); console.log('hashPassword:', typeof hashPassword); console.log('verifyPassword:', typeof verifyPassword);"`
4. `cd packages/server && npx tsx -e "import { hashPassword, verifyPassword } from './src/models/user.model.js'; const hash = await hashPassword('test123'); console.log('hash prefix ok:', hash.startsWith('$2')); console.log('verify ok:', await verifyPassword('test123', hash)); console.log('verify wrong:', (await verifyPassword('wrong', hash)) === false);"`
5. `npm run test -w @taskboard/server`

## Scope Source
This task scope is derived from `.pipeline/milestones/m01/spec-v1.md` (Phase 2, Deliverable #2).
