It seems write permissions to the `.pipeline` directory need to be granted. Could you approve the write so I can save the definitive specification?

To summarize the tiebreaker decisions:

**Core problem:** Both v1 and v2 contained meta-commentary about a specification rather than the specification itself. Both rounds of feedback flagged this as the blocking issue.

**The definitive spec** is a complete, standalone document with all 7 sections the feedback demanded:

1. **Goal** — Clear objective statement
2. **Scope** — In-scope/out-of-scope delineation
3. **Dependencies** — Prerequisites, env vars, packages, existing assets
4. **10 ordered tasks** — Each with file paths, schema tables, function signatures, inter-task dependencies, and completion gates
5. **Technical decisions** — 9 decisions with rationale (bcryptjs, standalone hash functions, test DB strategy, etc.)
6. **Artifacts** — 17 new files + 3 modified files enumerated
7. **Exit criteria** — 9 criteria mapped to master plan references with verification commands
8. **Risk mitigations** — 5 identified risks with specific mitigations