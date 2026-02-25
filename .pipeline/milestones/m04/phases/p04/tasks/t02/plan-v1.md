The plan has been written to `.pipeline/milestones/m04/phases/p04/tasks/t02/plan.md`. 

The plan covers:

1. **3 deliverables**: `CommentForm` (new), `CommentList` (new), and `TaskDetailPanel` (modified)
2. **Dependencies**: All confirmed present — Task 1's API client, `PopulatedComment`/`Comment` types, `useAuth()`, `ConfirmDialog`
3. **Implementation details** with particular attention to the **type mismatch** between `PopulatedComment` (from GET) and `Comment` (from POST/PUT) — the form converts responses using `useAuth()`, and inline edit preserves the populated author
4. **Implementation order**: CommentForm first (no deps), then CommentList (imports CommentForm), then TaskDetailPanel integration
5. **Verification**: TypeScript compilation + manual checklist for all CRUD operations