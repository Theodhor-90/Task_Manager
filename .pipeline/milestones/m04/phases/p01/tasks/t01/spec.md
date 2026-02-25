## Objective

Install the drag-and-drop libraries required for column reordering (this phase) and task drag-and-drop (Phase 2).

## Deliverables

- Install `@dnd-kit/core` and `@dnd-kit/sortable` as **production dependencies** in `packages/client`
- Verify the packages resolve correctly and the client still compiles and starts

## Files to Modify

| File | Action |
|------|--------|
| `packages/client/package.json` | Modified — add `@dnd-kit/core` and `@dnd-kit/sortable` to `dependencies` |

## Implementation Details

- Run `npm install @dnd-kit/core @dnd-kit/sortable` from within `packages/client` (or use workspace flag from root)
- These packages are specified in the master plan tech stack (`@dnd-kit/core` + `@dnd-kit/sortable`)
- No code changes beyond the dependency installation

## Dependencies

- None — this is the first task in the phase

## Verification

1. `@dnd-kit/core` and `@dnd-kit/sortable` appear in `packages/client/package.json` under `dependencies`
2. `npm ls @dnd-kit/core @dnd-kit/sortable` resolves without errors from the project root
3. The client dev server starts without errors (`npm run dev` from client or root)
4. The client compiles without TypeScript errors