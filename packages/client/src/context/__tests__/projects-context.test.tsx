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
    mockDeleteProject.mockReturnValue(new Promise(() => {}));

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();

    act(() => {
      testHookValues.removeProject("proj1");
    });

    await waitFor(() => {
      expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("removeProject re-fetches on API failure", async () => {
    mockFetchProjects
      .mockResolvedValueOnce({ data: mockProjects })
      .mockResolvedValueOnce({ data: mockProjects });
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

    await waitFor(() => {
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("useProjects throws outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useProjects must be used within a ProjectsProvider",
    );

    spy.mockRestore();
  });
});
