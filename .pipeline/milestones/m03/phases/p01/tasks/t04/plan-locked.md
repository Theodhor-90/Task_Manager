Now I have all the information I need. Let me produce the implementation plan.

# Task 4 Implementation Plan: Projects Context

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/api/projects.ts` | Create | API functions for project CRUD: `fetchProjects`, `createProject`, `updateProject`, `deleteProject` |
| 2 | `packages/client/src/context/projects-context.tsx` | Create | React context + provider managing shared project state with fetch-on-mount, mutation functions, and loading/error states |
| 3 | `packages/client/src/context/__tests__/projects-context.test.tsx` | Create | Tests for the ProjectsProvider and useProjects hook |

## 2. Dependencies

- **Runtime**: React 19 (already installed)
- **Existing code**:
  - `apiClient` from `packages/client/src/api/client.ts` — provides `get`, `post`, `put`, `del` methods with JWT header injection and 401 handling
  - `AuthProvider` / `useAuth` from `packages/client/src/context/auth-context.tsx` — the `ProjectsProvider` will be nested inside `ProtectedRoute`, so authentication is guaranteed when the provider mounts
  - `Project` type from `@taskboard/shared` — `{ _id, name, description?, owner, createdAt, updatedAt }`
  - `ApiSuccessResponse<T>` type from `@taskboard/shared` — `{ data: T }`
- **Test infrastructure**: Vitest + React Testing Library + jsdom (installed in Task 1)
- **Prerequisite tasks**: Task 1 (test infrastructure). Tasks 2 and 3 are not code dependencies — this context will be consumed by `Sidebar` (Task 3) and `AppLayout` (Task 5), but the context itself does not import those components.
- **No new packages need to be installed**

## 3. Implementation Details

### 3.1 Project API Functions (`api/projects.ts`)

**Purpose**: Thin wrapper functions around `apiClient` for all four project CRUD operations. Each function calls the appropriate HTTP method and returns the parsed response.

**Named exports**: `fetchProjects`, `createProject`, `updateProject`, `deleteProject`

**Imports**:
```typescript
import type { ApiSuccessResponse, Project } from "@taskboard/shared";
import { apiClient } from "./client";
```

This follows the exact same pattern as the existing `api/auth.ts`, which imports types from `@taskboard/shared` and uses `apiClient` for HTTP calls.

#### 3.1.1 `fetchProjects`

```typescript
export async function fetchProjects(): Promise<ApiSuccessResponse<Project[]>> {
  return apiClient.get<ApiSuccessResponse<Project[]>>("/api/projects");
}
```

- Calls `GET /api/projects`
- Server returns `{ data: Project[] }` (sorted by `createdAt` descending)
- Returns the full `{ data: [...] }` envelope, letting the caller extract `.data`

#### 3.1.2 `createProject`

```typescript
export interface CreateProjectInput {
  name: string;
  description?: string;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ApiSuccessResponse<Project>> {
  return apiClient.post<ApiSuccessResponse<Project>>("/api/projects", input);
}
```

- Calls `POST /api/projects` with `{ name, description? }`
- Server returns `{ data: Project }` with status 201
- The `CreateProjectInput` interface documents exactly what the server expects (from `isValidCreateProjectBody` in `project.routes.ts`: `name` is required string, `description` is optional string)

#### 3.1.3 `updateProject`

```typescript
export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<ApiSuccessResponse<Project>> {
  return apiClient.put<ApiSuccessResponse<Project>>(`/api/projects/${id}`, input);
}
```

- Calls `PUT /api/projects/:id` with `{ name?, description? }` (at least one required)
- Server returns `{ data: Project }` with the updated project
- The `UpdateProjectInput` interface matches `isValidUpdateProjectBody` in the server

#### 3.1.4 `deleteProject`

```typescript
export async function deleteProject(
  id: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(`/api/projects/${id}`);
}
```

- Calls `DELETE /api/projects/:id`
- Server returns `{ data: { message: "Project deleted" } }`
- The return type reflects the actual server response shape

**Full file**:
```typescript
import type { ApiSuccessResponse, Project } from "@taskboard/shared";
import { apiClient } from "./client";

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export async function fetchProjects(): Promise<ApiSuccessResponse<Project[]>> {
  return apiClient.get<ApiSuccessResponse<Project[]>>("/api/projects");
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ApiSuccessResponse<Project>> {
  return apiClient.post<ApiSuccessResponse<Project>>("/api/projects", input);
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<ApiSuccessResponse<Project>> {
  return apiClient.put<ApiSuccessResponse<Project>>(`/api/projects/${id}`, input);
}

export async function deleteProject(
  id: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(`/api/projects/${id}`);
}
```

### 3.2 Projects Context (`context/projects-context.tsx`)

**Purpose**: React context + provider that fetches the project list on mount, exposes the list along with loading/error state, and provides mutation functions (`addProject`, `updateProject`, `removeProject`) that update both the server (via API) and local state.

**Named exports**: `ProjectsProvider`, `useProjects`

**Imports**:
```typescript
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Project } from "@taskboard/shared";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api/projects";
import type { CreateProjectInput, UpdateProjectInput } from "../api/projects";
```

This follows the exact pattern of `auth-context.tsx`: same React imports (`createContext`, `useCallback`, `useContext`, `useEffect`, `useState`, `ReactNode`), a context value interface, a `Provider` function component, and a `useX` hook.

#### 3.2.1 Context Value Interface

```typescript
interface ProjectsContextValue {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  addProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
}
```

- `projects` — the current array of projects, sorted by `createdAt` descending (server's sort order is preserved)
- `isLoading` — `true` during the initial fetch on mount
- `error` — error message string if the initial fetch failed, `null` otherwise
- `addProject` — creates a project on the server and appends it to local state; returns the created project
- `updateProject` — updates a project on the server and updates it in-place in local state; returns the updated project
- `removeProject` — deletes a project on the server and removes it from local state

The mutation functions return Promises so the calling component can `await` them and handle success/failure (e.g., close a modal on success, show an error on failure). The mutation functions throw on API errors — they do not catch internally. This keeps error handling at the call site where the UI context is known.

#### 3.2.2 Provider Implementation

```typescript
const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((response) => {
        setProjects(response.data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const addProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    const response = await createProject(input);
    const newProject = response.data;
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  }, []);

  const handleUpdateProject = useCallback(
    async (id: string, input: UpdateProjectInput): Promise<Project> => {
      const response = await updateProject(id, input);
      const updated = response.data;
      setProjects((prev) =>
        prev.map((p) => (p._id === id ? updated : p)),
      );
      return updated;
    },
    [],
  );

  const removeProject = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => prev.filter((p) => p._id !== id));
    try {
      await deleteProject(id);
    } catch (err) {
      // Re-fetch on failure to restore correct state
      try {
        const response = await fetchProjects();
        setProjects(response.data);
      } catch {
        // If re-fetch also fails, leave state as-is
      }
      throw err;
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        isLoading,
        error,
        addProject,
        updateProject: handleUpdateProject,
        removeProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}
```

**Key design decisions**:

1. **Fetch on mount with `useEffect([], [])`**: The provider fetches projects once when it mounts. Since it lives inside `ProtectedRoute`, it only mounts when the user is authenticated. The empty dependency array means it fetches exactly once per mount — if the user logs out and logs back in, the provider remounts and re-fetches.

2. **`addProject` prepends to the list**: New projects are inserted at the beginning of the array (`[newProject, ...prev]`) to match the server's `createdAt: -1` sort order. This means the most recently created project appears at the top of the sidebar.

3. **`removeProject` uses optimistic delete**: The project is removed from local state immediately (`setProjects((prev) => prev.filter(...))`), then the API call is made. If the API call fails, the state is restored by re-fetching the full project list from the server. This avoids the visual jank of removing, showing again, then removing. Re-fetching on error (rather than re-inserting the removed item at its old position) is simpler and guarantees consistency with the server. The error is re-thrown so the caller can display an error message.

4. **`addProject` and `handleUpdateProject` are not optimistic**: They await the API response before updating local state. This is appropriate because:
   - For create: the new project doesn't have an `_id` until the server assigns one, so we can't add it to local state before the response.
   - For update: the server may transform the data (e.g., `updatedAt` timestamp), so we use the server's response as the source of truth.

5. **Mutation functions throw on error**: They do not catch API errors internally. This lets the calling component (e.g., a create project modal) handle errors in its own UI context — for example, displaying an `ErrorMessage` inside the modal. This is consistent with how `auth-context.tsx` handles the `login` function: it throws on failure, and `login-page.tsx` catches and displays the error.

6. **`handleUpdateProject` internal name**: The mutation function exposed on the context is named `updateProject`, but the internal variable is `handleUpdateProject` to avoid shadowing the imported `updateProject` API function.

#### 3.2.3 `useProjects` Hook

```typescript
export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
```

Follows the identical pattern as `useAuth()` in `auth-context.tsx`: retrieves the context value, throws with a descriptive error if used outside the provider.

## 4. Contracts

### API Functions

#### `fetchProjects()`

| | |
|---|---|
| Input | None |
| Output | `Promise<ApiSuccessResponse<Project[]>>` — `{ data: Project[] }` |
| Error | Throws `Error` on network failure or non-2xx response |

#### `createProject(input)`

| | |
|---|---|
| Input | `CreateProjectInput` — `{ name: string, description?: string }` |
| Output | `Promise<ApiSuccessResponse<Project>>` — `{ data: Project }` |
| Error | Throws `Error` on validation failure (400) or network error |

#### `updateProject(id, input)`

| | |
|---|---|
| Input | `id: string`, `UpdateProjectInput` — `{ name?: string, description?: string }` |
| Output | `Promise<ApiSuccessResponse<Project>>` — `{ data: Project }` |
| Error | Throws `Error` on validation failure (400), not found (404), or network error |

#### `deleteProject(id)`

| | |
|---|---|
| Input | `id: string` |
| Output | `Promise<ApiSuccessResponse<{ message: string }>>` — `{ data: { message: "Project deleted" } }` |
| Error | Throws `Error` on not found (404) or network error |

### Context Hook

#### `useProjects()`

| Field | Type | Description |
|-------|------|-------------|
| `projects` | `Project[]` | Current project list, sorted newest-first |
| `isLoading` | `boolean` | `true` during initial fetch, `false` after |
| `error` | `string \| null` | Error message if initial fetch failed |
| `addProject` | `(input: CreateProjectInput) => Promise<Project>` | Creates project on server, prepends to local state, returns created project |
| `updateProject` | `(id: string, input: UpdateProjectInput) => Promise<Project>` | Updates project on server and in local state, returns updated project |
| `removeProject` | `(id: string) => Promise<void>` | Optimistically removes from local state, deletes on server. Re-fetches on failure |

**Example usage**:
```tsx
function SomeComponent() {
  const { projects, isLoading, error, addProject, removeProject } = useProjects();

  const handleCreate = async () => {
    try {
      const newProject = await addProject({ name: "New Project", description: "Description" });
      // Success — modal can close, navigate to new project, etc.
    } catch (err) {
      // Show error in UI
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProject(id);
    } catch (err) {
      // Show error in UI — project may have reappeared in the list
    }
  };
}
```

**Provider placement** (to be done in Task 5 — AppLayout and Router Integration):
```tsx
<ProtectedRoute>
  <ProjectsProvider>
    <AppLayout>
      <Outlet />
    </AppLayout>
  </ProjectsProvider>
</ProtectedRoute>
```

## 5. Test Plan

### Test Setup

- Test framework: Vitest + React Testing Library (installed in Task 1)
- Test file location: `packages/client/src/context/__tests__/projects-context.test.tsx`
- The `ProjectsProvider` calls API functions from `../api/projects`, which need to be mocked. We mock the entire `../../api/projects` module using `vi.mock`.
- The provider renders children, so we create a test consumer component that calls `useProjects()` and exposes the values.

### Mocking Strategy

Mock the API module:
```typescript
import { vi } from "vitest";

vi.mock("../../api/projects", () => ({
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));
```

Retrieve the mocked functions with proper typing:
```typescript
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../../api/projects";

const mockFetchProjects = fetchProjects as ReturnType<typeof vi.fn>;
const mockCreateProject = createProject as ReturnType<typeof vi.fn>;
const mockUpdateProject = updateProject as ReturnType<typeof vi.fn>;
const mockDeleteProject = deleteProject as ReturnType<typeof vi.fn>;
```

### Test Consumer Component

A small helper component that calls `useProjects()` and renders the values so tests can query them:

```typescript
import { render, screen, act, waitFor } from "@testing-library/react";
import { ProjectsProvider, useProjects } from "../projects-context";
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project",
    owner: "user1",
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

let testHookValues: ReturnType<typeof useProjects>;

function TestConsumer() {
  testHookValues = useProjects();
  return (
    <div>
      <span data-testid="loading">{String(testHookValues.isLoading)}</span>
      <span data-testid="error">{testHookValues.error ?? ""}</span>
      <span data-testid="count">{testHookValues.projects.length}</span>
      <ul>
        {testHookValues.projects.map((p) => (
          <li key={p._id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ProjectsProvider>
      <TestConsumer />
    </ProjectsProvider>,
  );
}
```

### 5.1 Projects Context Tests (`projects-context.test.tsx`)

| # | Test | Description |
|---|------|-------------|
| 1 | fetches projects on mount | Mock `fetchProjects` to resolve with `{ data: mockProjects }`. Render provider. Verify `isLoading` is initially `true`, then becomes `false`, and projects are rendered. |
| 2 | sets error when fetch fails | Mock `fetchProjects` to reject with `new Error("Network error")`. Render provider. Verify `error` is `"Network error"` and `isLoading` is `false`. |
| 3 | addProject calls API and prepends to list | After initial mount (with empty projects), call `testHookValues.addProject({ name: "New" })`. Mock `createProject` to resolve with `{ data: newProject }`. Verify the new project appears first in the list. |
| 4 | addProject returns the created project | Call `addProject`, verify the returned value is the project from the API response. |
| 5 | addProject throws on API error | Mock `createProject` to reject. Call `addProject`, verify it throws. Verify the projects list is unchanged. |
| 6 | updateProject calls API and updates in-place | After initial mount with `mockProjects`, call `testHookValues.updateProject("proj1", { name: "Updated" })`. Mock `updateProject` to resolve with `{ data: updatedProject }`. Verify the project at position 0 has the updated name. |
| 7 | updateProject returns the updated project | Call `updateProject`, verify the returned value matches the API response. |
| 8 | removeProject optimistically removes from list | After initial mount with `mockProjects`, call `testHookValues.removeProject("proj1")`. Verify "Project Alpha" is immediately removed from the DOM before the API resolves. |
| 9 | removeProject re-fetches on API failure | Mock `deleteProject` to reject. Mock `fetchProjects` to resolve with `mockProjects`. Call `removeProject("proj1")`. Verify the projects list is restored after the rejection. |
| 10 | useProjects throws outside provider | Render `TestConsumer` without `ProjectsProvider`. Verify it throws with "useProjects must be used within a ProjectsProvider". |

### Test Implementation Notes

```typescript
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectsProvider, useProjects } from "../projects-context";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../../api/projects";
import type { Project } from "@taskboard/shared";

vi.mock("../../api/projects", () => ({
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

const mockFetchProjects = fetchProjects as ReturnType<typeof vi.fn>;
const mockCreateProject = createProject as ReturnType<typeof vi.fn>;
const mockUpdateProject = updateProject as ReturnType<typeof vi.fn>;
const mockDeleteProject = deleteProject as ReturnType<typeof vi.fn>;

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project",
    owner: "user1",
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

let testHookValues: ReturnType<typeof useProjects>;

function TestConsumer() {
  testHookValues = useProjects();
  return (
    <div>
      <span data-testid="loading">{String(testHookValues.isLoading)}</span>
      <span data-testid="error">{testHookValues.error ?? ""}</span>
      <span data-testid="count">{testHookValues.projects.length}</span>
      <ul>
        {testHookValues.projects.map((p) => (
          <li key={p._id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ProjectsProvider>
      <TestConsumer />
    </ProjectsProvider>,
  );
}

describe("ProjectsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchProjects.mockResolvedValue({ data: [] });
  });

  it("fetches projects on mount", async () => {
    mockFetchProjects.mockResolvedValue({ data: mockProjects });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(mockFetchProjects).toHaveBeenCalledTimes(1);
  });

  it("sets error when fetch fails", async () => {
    mockFetchProjects.mockRejectedValue(new Error("Network error"));
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("error")).toHaveTextContent("Network error");
  });

  it("addProject calls API and prepends to list", async () => {
    mockFetchProjects.mockResolvedValue({ data: mockProjects });
    const newProject: Project = {
      _id: "proj3",
      name: "Project Gamma",
      owner: "user1",
      createdAt: "2025-01-03T00:00:00Z",
      updatedAt: "2025-01-03T00:00:00Z",
    };
    mockCreateProject.mockResolvedValue({ data: newProject });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await act(async () => {
      await testHookValues.addProject({ name: "Project Gamma" });
    });

    expect(mockCreateProject).toHaveBeenCalledWith({ name: "Project Gamma" });
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    // New project should be first in the list
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Project Gamma");
  });

  it("addProject returns the created project", async () => {
    const newProject: Project = {
      _id: "proj3",
      name: "Project Gamma",
      owner: "user1",
      createdAt: "2025-01-03T00:00:00Z",
      updatedAt: "2025-01-03T00:00:00Z",
    };
    mockCreateProject.mockResolvedValue({ data: newProject });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    let result: Project | undefined;
    await act(async () => {
      result = await testHookValues.addProject({ name: "Project Gamma" });
    });

    expect(result).toEqual(newProject);
  });

  it("addProject throws on API error", async () => {
    mockCreateProject.mockRejectedValue(new Error("Validation failed"));

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await expect(
      act(async () => {
        await testHookValues.addProject({ name: "" });
      }),
    ).rejects.toThrow("Validation failed");

    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("updateProject calls API and updates in-place", async () => {
    mockFetchProjects.mockResolvedValue({ data: mockProjects });
    const updatedProject: Project = {
      ...mockProjects[0],
      name: "Updated Alpha",
    };
    mockUpdateProject.mockResolvedValue({ data: updatedProject });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await act(async () => {
      await testHookValues.updateProject("proj1", { name: "Updated Alpha" });
    });

    expect(mockUpdateProject).toHaveBeenCalledWith("proj1", { name: "Updated Alpha" });
    expect(screen.getByText("Updated Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("updateProject returns the updated project", async () => {
    mockFetchProjects.mockResolvedValue({ data: mockProjects });
    const updatedProject: Project = {
      ...mockProjects[0],
      name: "Updated Alpha",
    };
    mockUpdateProject.mockResolvedValue({ data: updatedProject });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    let result: Project | undefined;
    await act(async () => {
      result = await testHookValues.updateProject("proj1", { name: "Updated Alpha" });
    });

    expect(result).toEqual(updatedProject);
  });

  it("removeProject optimistically removes from list", async () => {
    mockFetchProjects.mockResolvedValue({ data: mockProjects });
    // Make deleteProject hang (never resolve) so we can check the intermediate state
    mockDeleteProject.mockReturnValue(new Promise(() => {}));

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();

    act(() => {
      testHookValues.removeProject("proj1");
    });

    // Project should be immediately removed (optimistic)
    await waitFor(() => {
      expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("removeProject re-fetches on API failure", async () => {
    mockFetchProjects
      .mockResolvedValueOnce({ data: mockProjects })  // initial load
      .mockResolvedValueOnce({ data: mockProjects });  // re-fetch after failure
    mockDeleteProject.mockRejectedValue(new Error("Delete failed"));

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await act(async () => {
      try {
        await testHookValues.removeProject("proj1");
      } catch {
        // Expected to throw
      }
    });

    // Projects should be restored after re-fetch
    await waitFor(() => {
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("useProjects throws outside provider", () => {
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useProjects must be used within a ProjectsProvider",
    );

    spy.mockRestore();
  });
});
```

**Key notes on test patterns**:
- Tests follow the same `describe/it/expect/vi/beforeEach` pattern used in `header.test.tsx` and `sidebar.test.tsx`.
- `vi.mock("../../api/projects")` mocks at the module level — the path is relative to the test file (`context/__tests__/projects-context.test.tsx` → `api/projects.ts`).
- `beforeEach` clears all mocks and sets a default resolved value for `fetchProjects` (empty array) to avoid leaking state between tests.
- Tests that call mutation functions use `act(async () => { await ... })` to properly flush React state updates.
- The "optimistic remove" test uses a never-resolving promise to check intermediate state before the API responds.
- The "throws outside provider" test suppresses `console.error` because React logs the uncaught error.

## 6. Implementation Order

1. **Create `packages/client/src/api/projects.ts`** — API functions with no dependencies beyond `apiClient` and shared types. Must exist before the context can be implemented.
2. **Create `packages/client/src/context/projects-context.tsx`** — Context + provider that imports from `api/projects.ts`. Depends on step 1.
3. **Create `packages/client/src/context/__tests__/projects-context.test.tsx`** — Tests for the context. Depends on steps 1 and 2.

## 7. Verification Commands

```bash
# 1. Verify files exist
ls packages/client/src/api/projects.ts
ls packages/client/src/context/projects-context.tsx

# 2. TypeScript compilation check
cd packages/client && npx tsc --noEmit

# 3. Run context tests
cd packages/client && npx vitest run src/context/__tests__/projects-context.test.tsx

# 4. Run all client tests (ensure nothing is broken)
cd packages/client && npx vitest run
```