## Milestone 1: Foundation

### Goal

Establish the monorepo structure, database layer, and authentication — the base everything else builds on. This milestone sets up npm workspaces with three packages (shared, server, client), configures TypeScript and build tooling, connects to MongoDB with Mongoose, implements all data models, and delivers a working login flow with JWT-based auth.

### Phases

1. **Monorepo & Dev Environment** — Initialize npm workspaces, configure TypeScript, scaffold all three packages (shared, server, client) with build and dev scripts, verify everything compiles and runs concurrently.
2. **Database & Models** — Set up MongoDB connection via Mongoose, implement all data models (User, Project, Board, Column, Task, Comment, Label) with proper schemas, indexes, and relationships. Create a seed script that inserts a default user on first run.
3. **Authentication** — Implement login endpoint with JWT generation, auth middleware for protected routes, client-side auth context with login page and route guards.

### Exit Criteria

1. `npm install` from root installs all workspace dependencies
2. `npm run dev` starts both server and client concurrently
3. All Mongoose models compile and can perform basic CRUD operations
4. Seed user is created on first server start
5. Login returns a valid JWT; protected routes reject requests without valid token
6. Client login page authenticates and stores token; unauthenticated access redirects to login