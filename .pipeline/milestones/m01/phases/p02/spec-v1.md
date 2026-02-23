The phase specification is ready. Here's a summary of what it covers:

**Phase 2: Database & Models** — 8 tasks delivering the full persistence layer:

1. **MongoDB connection module** — `connectDb`/`disconnectDb` in `db.ts`
2. **User model + password hashing** — bcryptjs, email uniqueness, hash/verify helpers
3. **Project model** — name, description, owner reference
4. **Board model with embedded columns** — 1:1 with project, column subdocuments
5. **Task model** — priority enum, position, indexes on board/project
6. **Comment & Label models** — plus barrel file re-exporting everything
7. **Seed script** — idempotent admin user creation, wired into server startup
8. **Model integration tests** — full test suite with test DB helpers, covering CRUD, validation, constraints, and seed idempotency

9 exit criteria, all measurable. Dependencies on Phase 1 (confirmed complete). 18 artifacts listed (13 new files, 2 modified files, plus test files).

Shall I retry writing the file?