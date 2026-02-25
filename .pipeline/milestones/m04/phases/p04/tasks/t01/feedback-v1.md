The plan is **approved**. It is thorough, accurate, and ready to lock. Key strengths:

- Complete file content provided verbatim — zero ambiguity for implementation
- Correctly distinguishes `PopulatedComment` (GET returns populated author) vs `Comment` (POST/PUT return raw author ID), verified against actual server route behavior
- Follows the exact `apiClient` pattern used in existing `tasks.ts` and `projects.ts` modules
- No over-engineering — delivers exactly what the task spec requires
- Verification commands are appropriate for the scope