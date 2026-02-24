I see - the permission requests weren't approved, so the files haven't been created/modified yet. According to the locked plan, I need to:

1. Add `populate()` to the `find()` query chain in the test double
2. Add `updateMany()` to the model in the test double  
3. Create the `comment.routes.test.ts` file

The edits and write operations require permission approval. Let me summarize what needs to be implemented:

## Implementation Summary

Based on the locked plan, I need to make the following changes:

### 1. Modify `packages/server/test/helpers/mongoose.test-double.ts`

**Change 1: Add `populate()` method to the `find()` query chain**
- Insert the `populate(field: string, selectStr?: string)` method after `lean()` (line 433) and before `then()` (line 435)
- This method will resolve references by looking up documents in the referenced collection
- It supports field selection via the `selectStr` parameter (e.g., "name email")

**Change 2: Add `updateMany()` method to the model**
- Insert after `deleteOne()` method (line 457)
- Implements support for `$pull` operator to remove values from arrays
- Returns `{ modifiedCount, matchedCount }` as per Mongoose API

### 2. Create `packages/server/test/routes/comment.routes.test.ts`

This is a new test file with 19 test cases covering all comment CRUD operations:
- 6 tests for `POST /api/tasks/:taskId/comments`
- 4 tests for `GET /api/tasks/:taskId/comments`
- 5 tests for `PUT /api/comments/:id`
- 4 tests for `DELETE /api/comments/:id`

The test file follows the exact same pattern as `label.routes.test.ts` with helper functions for creating projects, tasks, and comments.

### 3. Verification

After the changes:
- TypeScript compilation: ✅ Already passes
- Full test suite: Currently 2 tests failing in `label.routes.test.ts` because `updateMany()` is missing from the test double
- Once the test double is fixed, all tests should pass

The implementation is ready and waiting for permission approval to write the files.