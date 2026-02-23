It looks like I need write permissions to save the file. Could you grant write access to the `.pipeline/milestones/m01/` directory? In the meantime, here's a summary of what I revised to address all three feedback points:

### Changes made in spec-v2

**Feedback 1 — Remove conversational text**: Removed the non-spec preamble ("It seems file write permissions haven't been granted yet...") from line 1 and the trailing request to grant permissions from line 164. The document is now a clean, standalone specification.

**Feedback 2 — Re-align exit criteria to master plan boundaries**: 
- The 10 blocking exit criteria now map directly to the 6 master plan exit criteria (just with more specificity, not more scope).
- Created a new **"Implementation Notes"** section that explicitly marks expanded requirements as **non-blocking**. Items moved there include: full auth test matrix (expired/malformed tokens), dashboard/logout polish expectations, token validation on reload strategy, and error message quality guidance. Each is framed as "recommended but not required for milestone sign-off."

**Feedback 3 — Clarify the protected-route validation target**: 
- Introduced `GET /api/auth/me` as a **concrete, named endpoint** that serves as the proof of token enforcement. It appears in:
  - **Scope** (In Scope list)
  - **Phase 3 deliverables** (item 3, with its response shape and purpose)
  - **Phase 3 auth tests** (items 4–5 test it directly: without token → 401, with token → 200)
  - **Exit Criterion #7** (references `GET /api/auth/me` by name instead of the vague "protected routes")
- This eliminates any guesswork during implementation — the endpoint, its contract, and its test expectations are all specified.