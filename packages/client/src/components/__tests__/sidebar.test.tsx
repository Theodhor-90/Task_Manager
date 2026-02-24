import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "../sidebar";
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    owner: "user1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    _id: "proj2",
    name: "Project Beta",
    owner: "user1",
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
  },
];

function renderSidebar(
  props: {
    projects?: Project[];
    isLoading?: boolean;
    onCreateProject?: () => void;
  } = {},
  initialEntries: string[] = ["/"],
) {
  const defaultProps = {
    projects: [],
    isLoading: false,
    onCreateProject: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Sidebar {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("renders TaskBoard branding", () => {
    renderSidebar();
    expect(screen.getByText("TaskBoard")).toBeInTheDocument();
  });

  it('renders "New Project" button', () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("calls onCreateProject when button is clicked", () => {
    const onCreateProject = vi.fn();
    renderSidebar({ onCreateProject });
    fireEvent.click(screen.getByRole("button", { name: "New Project" }));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner when isLoading is true", () => {
    renderSidebar({ isLoading: true });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project list when loading", () => {
    renderSidebar({ isLoading: true, projects: mockProjects });
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it("shows empty state message when no projects", () => {
    renderSidebar({ projects: [], isLoading: false });
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("renders project names as links", () => {
    renderSidebar({ projects: mockProjects });
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("links point to correct board routes", () => {
    renderSidebar({ projects: mockProjects });
    const link = screen.getByText("Project Alpha");
    expect(link.closest("a")).toHaveAttribute("href", "/projects/proj1/board");
  });

  it("highlights active project link", () => {
    renderSidebar({ projects: mockProjects }, ["/projects/proj1/board"]);
    const link = screen.getByText("Project Alpha");
    expect(link).toHaveClass("bg-blue-50", "text-blue-700");
  });

  it("does not highlight inactive project link", () => {
    renderSidebar({ projects: mockProjects }, ["/projects/proj1/board"]);
    const link = screen.getByText("Project Beta");
    expect(link).toHaveClass("text-gray-700");
  });
});
