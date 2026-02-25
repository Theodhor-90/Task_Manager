# Task 1: Install `react-markdown`

## Objective
Install the `react-markdown` npm package as a production dependency in the client package to enable markdown rendering in the task detail panel.

## Deliverables
- `react-markdown` installed as a production dependency in `packages/client`
- `packages/client/package.json` lists `react-markdown` in `dependencies`
- The client still compiles and starts successfully with the new dependency

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/package.json` | Modify — add `react-markdown` to dependencies |

## Implementation Details
- Run `npm install react-markdown -w packages/client` from the project root
- `react-markdown` is specified in the master plan tech stack for markdown display
- No code changes needed beyond the dependency installation

## Dependencies
- None — this is the first task in the phase

## Verification
1. `react-markdown` appears in `packages/client/package.json` under `dependencies`
2. `npm ls react-markdown -w packages/client` shows the package is installed
3. The client compiles without errors: `npm run build -w packages/client` or `npm run dev -w packages/client` starts successfully