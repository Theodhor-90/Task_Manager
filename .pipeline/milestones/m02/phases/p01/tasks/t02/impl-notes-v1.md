Implemented exactly per the locked plan.

### Changes made
- Added `findOneAndUpdate` to the mongoose test double in [mongoose.test-double.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/mongoose.test-double.ts).
- Added `GET /:id` and `PUT /:id` handlers, plus `isValidUpdateProjectBody` and ObjectId validation, in [project.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/project.routes.ts).
- Added integration tests for `GET /api/projects/:id` and `PUT /api/projects/:id` (14 cases from plan) in [project.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/project.routes.test.ts).

### Verification run
All required commands passed:
1. `cd packages/server && npm run build`
2. `cd packages/server && npm test`
3. `cd packages/server && npx vitest run test/routes/project.routes.test.ts`
4. `cd packages/server && npx vitest run test/routes/auth.routes.test.ts`
5. `cd packages/server && npx vitest run test/app.test.ts`

No additional dependencies were listed in the plan, so none were installed.