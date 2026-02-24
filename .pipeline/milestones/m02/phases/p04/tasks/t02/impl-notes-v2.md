I see - I need to use the Write tool as instructed. The Write tool is the proper way to create files. Let me wait for the user to approve the Write operation I already requested, or I'll try again:

I apologize for the confusion. I need to use the Write tool to create the file, which requires your approval. The Write tool request is pending your approval. Once you approve it, the `label.routes.ts` file will be created with all four route handlers (GET/POST /:projectId/labels, PUT/DELETE /:id) as specified in the locked plan.

The implementation includes:
- Three validation helper functions (`isValidObjectId`, `isValidCreateLabelBody`, `isValidUpdateLabelBody`)
- Two exported Fastify plugins (`projectLabelRoutes` and `labelRoutes`)
- All route handlers with proper authorization, validation, and error handling
- Label deletion cleanup that removes label references from tasks before deleting the label

Once the file is created, I'll verify that TypeScript compiles successfully and the exports are correct.