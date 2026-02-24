import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardPage } from "../board-page";
import type { Project } from "@taskboard/shared";

const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project",
    owner: "user1",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-10T00:00:00Z",
  },
];

function defaultProjectsState() {
  return {
    projects: mockProjects,
    isLoading: false,
    error: null,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    removeProject: vi.fn(),
  };
}

function renderBoardPage(projectId: string = "proj1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/board`]}>
      <Routes>
        <Route path="/projects/:id/board" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BoardPage", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue(defaultProjectsState());
  });

  it("renders the project name as a heading", () => {
    renderBoardPage("proj1");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Project Alpha");
  });

  it("renders the placeholder message", () => {
    renderBoardPage("proj1");
    expect(screen.getByText("Board coming in Milestone 4")).toBeInTheDocument();
  });

  it("shows loading spinner when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      isLoading: true,
    });
    renderBoardPage("proj1");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project name when loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: mockProjects,
      isLoading: true,
    });
    renderBoardPage("proj1");
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it('shows "Project not found" for invalid project ID', () => {
    renderBoardPage("nonexistent");
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });

  it('shows "Project not found" when projects list is empty', () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
    });
    renderBoardPage("proj1");
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });

  it("renders correct project name for different project IDs", () => {
    renderBoardPage("proj2");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Project Beta");
  });

  it("does not render PRIORITIES debug content", () => {
    renderBoardPage("proj1");
    expect(screen.queryByText(/priority levels/i)).not.toBeInTheDocument();
  });
});
