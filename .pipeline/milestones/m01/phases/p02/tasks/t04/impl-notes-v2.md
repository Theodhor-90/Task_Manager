Implemented all review fixes and re-verified.

**Changes made**
1. Replaced `board.model.ts` with a strict Mongoose model (no compat/fallback shim):
- `project` is now `ObjectId` ref with unique 1:1 constraint (`type: Schema.Types.ObjectId`, `ref: "Project"`, `required`, `unique`)
- `ColumnDocument._id` is `Types.ObjectId`
- `BoardDocument.columns` is `Types.DocumentArray<ColumnDocument>`
- Removed all manual `schema.paths` mutation, collection fallback, `mongoose.Types` patching, and `BoardModelCompat` validation fallback  
File: [board.model.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/board.model.ts)

2. Updated the local workspace `mongoose` shim so the strict model compiles in this repo’s environment:
- Added `Types.ObjectId` and `Types.DocumentArray` typing surface
- Added `Schema.Types.ObjectId` surface
- Implemented `ObjectId` generation using `crypto.randomBytes` (removed predictable `Date.now()+Math.random` pattern)
Files:
- [index.d.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/mongoose/index.d.ts)
- [index.js](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/mongoose/index.js)

**Verification**
- `npm run build -w @taskboard/server` ✅
- `npm run test -w @taskboard/server` ✅