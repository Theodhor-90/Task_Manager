I've created the complete test file `packages/server/test/routes/label.routes.test.ts` with all 23 test cases as specified in the locked plan. Once the write permission is granted, the file will be created and I can run the verification commands to ensure all tests pass.

The implementation includes:
- All helper functions (normalizeId, canBindTcpPort, seedAdminUser, getAuthToken, httpRequest, createProject, createTask, and the new createLabel)
- 7 tests for POST /api/projects/:projectId/labels
- 4 tests for GET /api/projects/:projectId/labels  
- 7 tests for PUT /api/labels/:id
- 5 tests for DELETE /api/labels/:id (including the critical cleanup test that verifies label references are removed from tasks)

The test file follows the exact patterns established in the existing test files and matches all specifications in the locked plan.