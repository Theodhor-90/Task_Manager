Implemented the locked plan for t06 exactly in client code.

### Changed files
- Created [auth-context.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/context/auth-context.tsx)
  - Added `AuthProvider` with `user`, `token`, `isLoading`, derived `isAuthenticated`
  - Added token-on-mount validation via `getMe()`
  - Added `login(email, password)` and `logout()` behaviors
  - Added `useAuth()` hook with provider guard error
- Created [protected-route.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/components/protected-route.tsx)
  - Renders loading UI while validating
  - Redirects unauthenticated users to `/login`
  - Renders `<Outlet />` when authenticated
- Updated [App.tsx](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/client/src/App.tsx)
  - Wrapped routes with `AuthProvider` inside `BrowserRouter`
  - Added pathless protected route parent using `ProtectedRoute`
  - Kept `/login` public
  - Removed unused `Priority` type import

### Verification run
- `npx tsc --noEmit -p packages/client/tsconfig.json` passed
- `npm run build -w packages/client` passed
- `ls -la packages/client/src/context/` confirmed `auth-context.tsx`
- `ls -la packages/client/src/components/` confirmed `protected-route.tsx`

Runtime/manual browser verification steps from the plan were not executed in this terminal session.