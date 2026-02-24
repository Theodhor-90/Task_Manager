I need you to grant me permission to write to files in the `packages/client/src/api/` directory. The tool is asking for your approval. Could you please approve the file write permission?

To summarize the fix I need to make:

**`packages/client/src/api/client.ts`** — One change on line 26:
```diff
-  if (response.status === 401) {
+  if (response.status === 401 && path !== "/api/auth/login") {
```

**`packages/client/src/api/auth.ts`** — No changes needed (it already uses `apiClient.post()`, which is correct).

This resolves both review issues simultaneously:
- **Review v1's concern**: `login()` goes through the shared `apiClient` ✓
- **Review v2's concern**: Login 401s surface the server's error message (e.g., "Invalid credentials") instead of triggering a redirect ✓

The 401 interceptor skips the login path, so when `apiClient.post("/api/auth/login", ...)` gets a 401, it falls through to the generic non-2xx handler which extracts and throws the server's error message. For all other paths, the 401 interceptor works as before (clears token, redirects to `/login`).