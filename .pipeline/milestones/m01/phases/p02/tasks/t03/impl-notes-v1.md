Implemented the locked-plan deliverable by creating [project.model.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/models/project.model.ts) with:

- `ProjectDocument` interface
- `projectSchema` fields:
  - `name` required + trimmed
  - `description` optional with default `""`
  - `owner` required + `ref: "User"`
- `timestamps: true`
- `ProjectModel` export

I also ran the plan’s verification commands:

1. `npm run build -w @taskboard/server`  
Passed.

2. `cd packages/server && npx tsx -e "...ProjectModel.collection...schema.paths..."`  
Failed because this workspace uses a simplified `mongoose` stub that does not expose `collection`/`schema.paths` like real Mongoose.

3. `cd packages/server && npx tsx -e "...mongoose.Types.ObjectId...validate()..."`  
Failed for the same reason (`mongoose.Types.ObjectId` is not available in the stubbed implementation).

4. `npm run test -w @taskboard/server`  
Passed (`node --test`, no tests defined yet).

Note: the requested files [spec.md](/Users/theodhor/Desktop/Portfolio/Task_Manager/.pipeline/milestones/m01/phases/p02/tasks/t03/spec.md) and [spec-locked.md](/Users/theodhor/Desktop/Portfolio/Task_Manager/.pipeline/milestones/m01/phases/p02/spec-locked.md) do not exist in this repo; implementation was based on the locked plan file that does exist.