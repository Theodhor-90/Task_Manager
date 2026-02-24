Now I have all the context needed. Let me produce the revised plan addressing every feedback point.

# Task 2 Implementation Plan — Implement GET, PUT single-project endpoints

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/helpers/mongoose.test-double.ts` | **Modify** | Add `findOneAndUpdate` method to the model object |
| 2 | `packages/server/src/routes/project.routes.ts` | **Modify** | Add `GET /:id` and `PUT /:id` route handlers |
| 3 | `packages/server/test/routes/project.routes.test.ts` | **Modify** | Add integration tests for both new endpoints |

## 2. Dependencies

- **t01 (completed)**: `project.routes.ts` exists with `POST /` and `GET /` handlers; registered in `app.ts` at `/api/projects`; test file exists with test scaffold and helpers
- **Mongoose test-double gap**: The test-double does not currently support `findOneAndUpdate`. This method is required by the `PUT /:id` handler.
- **ObjectId validation**: The test-double exports `Types.ObjectId` with a static `isValid()` method. The route handler needs to import `mongoose` to access `mongoose.Types.ObjectId.isValid()`. The real mongoose is a production dependency; in tests the Vitest alias resolves `mongoose` to the test-double.

## 3. Implementation Details

### 3.1 Mongoose test-double — Add `findOneAndUpdate`

**File**: `packages/server/test/helpers/mongoose.test-double.ts`

**Add `findOneAndUpdate` inside the `model()` function's return object** (after `findOne`, before `find`):

```typescript
async findOneAndUpdate(
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<Record<string, unknown> | null> {
  const docs = getCollectionDocs(name);
  const index = docs.findIndex((doc) => matches(doc, filter));
  if (index === -1) {
    return null;
  }

  // Snapshot the pre-update state for { new: false } behavior
  const preUpdateDoc = { ...docs[index] };

  // Apply $set if present, otherwise treat update as direct field assignments
  const fields = (update.$set ?? update) as Record<string, unknown>;
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith("$")) continue; // skip other operators
    docs[index][key] = value;
  }

  if (schema?.options?.timestamps) {
    docs[index].updatedAt = new Date();
  }

  setCollectionDocs(name, docs);

  // Return pre-update doc when { new: false } (the default), updated doc when { new: true }
  return options.new ? docs[index] : preUpdateDoc;
},
```

**Why `{ new: true }` vs `{ new: false }` matters**: Mongoose's `findOneAndUpdate` returns the document *before* the update by default. Only when `{ new: true }` is passed does it return the updated document. The test-double faithfully implements this distinction so that tests will fail if a handler omits `{ new: true }` — the response would contain stale field values, and assertions on the updated values would break.

**Scope note**: Only `findOneAndUpdate` is added here. `deleteOne` is needed by task 3 (cascade delete) and will be added in that task's plan.

### 3.2 Route handlers — `GET /:id` and `PUT /:id`

**File**: `packages/server/src/routes/project.routes.ts`

**New import**: Add `mongoose` import for ObjectId validation:
```typescript
import mongoose from "mongoose";
```

**New validation function** — `isValidUpdateProjectBody`:
```typescript
function isValidUpdateProjectBody(
  body: unknown,
): body is { name?: string; description?: string } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { name, description } = body as Record<string, unknown>;

  const hasName = name !== undefined;
  const hasDescription = description !== undefined;

  if (!hasName && !hasDescription) {
    return false;
  }

  if (hasName && (typeof name !== "string" || name.trim().length === 0)) {
    return false;
  }

  if (hasDescription && typeof description !== "string") {
    return false;
  }

  return true;
}
```

**Helper function** — `isValidObjectId`:
```typescript
function isValidObjectId(value: unknown): boolean {
  return mongoose.Types.ObjectId.isValid(value as string);
}
```

**`GET /:id` handler** (add after the existing `GET /` handler):
```typescript
app.get("/:id", async (request, reply) => {
  const { id } = request.params as { id: string };

  if (!isValidObjectId(id)) {
    return reply.code(400).send({ error: "Invalid project ID" });
  }

  const project = await ProjectModel.findOne({
    _id: id,
    owner: request.user.id,
  });

  if (!project) {
    return reply.code(404).send({ error: "Project not found" });
  }

  return reply.code(200).send({ data: project });
});
```

**`PUT /:id` handler** (add after the `GET /:id` handler):
```typescript
app.put("/:id", async (request, reply) => {
  const { id } = request.params as { id: string };

  if (!isValidObjectId(id)) {
    return reply.code(400).send({ error: "Invalid project ID" });
  }

  if (!isValidUpdateProjectBody(request.body)) {
    return reply.code(400).send({ error: "Name or description is required" });
  }

  const { name, description } = request.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  const updatedProject = await (ProjectModel as unknown as {
    findOneAndUpdate(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options: Record<string, unknown>,
    ): Promise<Record<string, unknown> | null>;
  }).findOneAndUpdate(
    { _id: id, owner: request.user.id },
    updates,
    { new: true },
  );

  if (!updatedProject) {
    return reply.code(404).send({ error: "Project not found" });
  }

  return reply.code(200).send({ data: updatedProject });
});
```

**Note on the `findOneAndUpdate` type cast**: The cast is done inline at the call site, matching the same inline-cast-through-`unknown` pattern used by the existing `FindProjectsModel` for the `find()` call. A separate type alias is not introduced since `findOneAndUpdate` is only called once — keeping the cast inline avoids unnecessary indirection.

**Key logic notes**:
- Both handlers extract `id` from `request.params` and validate it as a valid ObjectId format
- Both handlers filter by `owner: request.user.id` to enforce ownership scoping
- `GET /:id` uses `findOne` (already available in test-double)
- `PUT /:id` uses `findOneAndUpdate` with `{ new: true }` to return the updated document
- `PUT /:id` only passes `name` and `description` to the update — ignoring any other fields in the body
- Both return 404 (not 403) when project doesn't exist or isn't owned by user

### 3.3 Response shape note on `GET /:id`

The `findOne` in the test-double returns raw objects (without a `toJSON` method). In the existing `POST /` handler, there's a `toJSON` check. The `GET /:id` handler returns the `findOne` result directly, which is consistent with how `GET /` returns the `find` results — neither applies `toJSON()`. This is correct behavior since the test-double stores plain objects.

## 4. Contracts

### `GET /api/projects/:id`

**Request**: No body. Auth header required. `:id` is a MongoDB ObjectId string.

**Success Response** (200):
```json
{
  "data": {
    "_id": "64f...",
    "name": "My Project",
    "description": "A description",
    "owner": "64f...",
    "createdAt": "2026-02-24T...",
    "updatedAt": "2026-02-24T..."
  }
}
```

**Error Responses**:
- `400 { "error": "Invalid project ID" }` — `:id` is not a valid ObjectId format
- `401 { "error": "Unauthorized" }` — no/invalid JWT (handled by auth middleware)
- `404 { "error": "Project not found" }` — project doesn't exist or isn't owned by user

### `PUT /api/projects/:id`

**Request**:
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```
- At least one of `name` or `description` must be provided
- `name`: string, non-empty after trim (if provided)
- `description`: string (if provided)
- Auth: `Authorization: Bearer <jwt>` header required

**Success Response** (200):
```json
{
  "data": {
    "_id": "64f...",
    "name": "Updated Name",
    "description": "Updated description",
    "owner": "64f...",
    "createdAt": "2026-02-24T...",
    "updatedAt": "2026-02-24T..."
  }
}
```

**Error Responses**:
- `400 { "error": "Invalid project ID" }` — `:id` is not a valid ObjectId format
- `400 { "error": "Name or description is required" }` — no valid update fields provided
- `401 { "error": "Unauthorized" }` — no/invalid JWT
- `404 { "error": "Project not found" }` — project doesn't exist or isn't owned by user

## 5. Test Plan

### Test file

`packages/server/test/routes/project.routes.test.ts` — **modify** (add new `describe` blocks after existing ones)

### Test setup

Uses the existing scaffold from t01: `beforeAll`, `beforeEach`, `afterAll`, `httpRequest`, `seedAdminUser`, `getAuthToken` — all already in place. No changes to setup needed.

### Helper for creating a project in tests

Several tests need to create a project first, then reference its `_id`. Use the existing `httpRequest` with `POST /api/projects` and extract `body.data._id`. This pattern is already used in the existing test "auto-creates a board with 4 default columns".

### Tests

#### Describe: `GET /api/projects/:id`

**Test 1: returns a project by ID**
- Create a project via `POST /api/projects` with `{ name: "Get Test", description: "desc" }`
- Extract `_id` from the response
- Send `GET /api/projects/:id` with auth header
- Expect: 200
- Assert: `body.data.name === "Get Test"`, `body.data.description === "desc"`, `body.data._id` matches the created project's `_id`, `body.data.owner` is defined

**Test 2: returns 404 for non-existent project ID**
- Use a valid but non-existent ObjectId (e.g., `"aaaaaaaaaaaaaaaaaaaaaaaa"`)
- Send `GET /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with auth header
- Expect: 404
- Assert: `body.error === "Project not found"`

**Test 3: returns 400 for invalid ObjectId format**
- Send `GET /api/projects/not-a-valid-id` with auth header
- Expect: 400
- Assert: `body.error === "Invalid project ID"`

**Test 4: returns 401 without auth token**
- Send `GET /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` without auth header
- Expect: 401
- Assert: `body.error === "Unauthorized"`

#### Describe: `PUT /api/projects/:id`

**Test 5: updates project name**
- Create a project with `{ name: "Original" }`
- Send `PUT /api/projects/:id` with `{ name: "Updated" }` and auth header
- Expect: 200
- Assert: `body.data.name === "Updated"`, `body.data._id` matches original

**Test 6: updates project description**
- Create a project with `{ name: "Test", description: "old" }`
- Send `PUT /api/projects/:id` with `{ description: "new" }` and auth header
- Expect: 200
- Assert: `body.data.description === "new"`, `body.data.name === "Test"` (unchanged)

**Test 7: updates both name and description**
- Create a project
- Send `PUT /api/projects/:id` with `{ name: "New Name", description: "New Desc" }` and auth header
- Expect: 200
- Assert: both fields updated

**Test 8: ignores extraneous fields (e.g., owner)**
- Create a project via `POST /api/projects` with `{ name: "Security Test" }`
- Extract the original `owner` from the response
- Send `PUT /api/projects/:id` with `{ name: "Renamed", owner: "aaaaaaaaaaaaaaaaaaaaaaaa" }` and auth header
- Expect: 200
- Assert: `body.data.name === "Renamed"`, `body.data.owner` equals the original owner value (not the attacker-supplied value)

**Test 9: returns 404 for non-existent project ID**
- Use a valid but non-existent ObjectId
- Send `PUT /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with `{ name: "Test" }` and auth header
- Expect: 404
- Assert: `body.error === "Project not found"`

**Test 10: returns 400 for invalid ObjectId format**
- Send `PUT /api/projects/not-a-valid-id` with `{ name: "Test" }` and auth header
- Expect: 400
- Assert: `body.error === "Invalid project ID"`

**Test 11: returns 400 when no valid update fields provided**
- Create a project
- Send `PUT /api/projects/:id` with `{}` and auth header
- Expect: 400
- Assert: `body.error` contains a meaningful message about needing name or description

**Test 12: returns 400 when name is empty string**
- Create a project
- Send `PUT /api/projects/:id` with `{ name: "" }` and auth header
- Expect: 400

**Test 13: returns 400 when name is whitespace only**
- Create a project
- Send `PUT /api/projects/:id` with `{ name: "   " }` and auth header
- Expect: 400

**Test 14: returns 401 without auth token**
- Send `PUT /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with `{ name: "Test" }` and no auth header
- Expect: 401
- Assert: `body.error === "Unauthorized"`

## 6. Implementation Order

1. **Extend mongoose test-double** — Add `findOneAndUpdate` method (with proper `{ new: true }` vs `{ new: false }` behavior) to the model object in `packages/server/test/helpers/mongoose.test-double.ts`. This unblocks the `PUT /:id` handler from being testable.

2. **Add route handlers to `project.routes.ts`** — Import `mongoose`, add `isValidObjectId` helper, add `isValidUpdateProjectBody` validator, implement `GET /:id` and `PUT /:id` handlers with inline type cast for `findOneAndUpdate`.

3. **Add integration tests to `project.routes.test.ts`** — Add two new `describe` blocks with all 14 tests (including the extraneous-fields security test).

4. **Run tests and verify** — Execute the test suite and fix any issues.

## 7. Verification Commands

```bash
# 1. Compile the server package
cd packages/server && npm run build

# 2. Run all server tests
cd packages/server && npm test

# 3. Run only the project routes test file
cd packages/server && npx vitest run test/routes/project.routes.test.ts

# 4. Run existing tests to verify no regressions
cd packages/server && npx vitest run test/routes/auth.routes.test.ts
cd packages/server && npx vitest run test/app.test.ts
```