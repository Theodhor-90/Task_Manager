import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardPage } from "../dashboard-page";
import type { Project } from "@taskboard/shared";

const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    description: "First project description",
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

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue(defaultProjectsState());
  });

  it('renders the "Projects" heading', () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Projects");
  });

  it('renders the "New Project" button', () => {
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("shows loading spinner when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      isLoading: true,
    });
    render(<DashboardPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project cards when loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: mockProjects,
      isLoading: true,
    });
    render(<DashboardPage />);
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it("shows error message when fetch fails", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      error: "Network error",
    });
    render(<DashboardPage />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no projects", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
    });
    render(<DashboardPage />);
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("renders project cards when projects exist", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("renders project description when present", () => {
    render(<DashboardPage />);
    expect(screen.getByText("First project description")).toBeInTheDocument();
  });

  it("does not render description paragraph when absent", () => {
    render(<DashboardPage />);
    const betaHeading = screen.getByText("Project Beta");
    const card = betaHeading.closest("div");
    expect(card?.querySelector("p.text-gray-500")).toBeNull();
  });

  it("renders project creation dates", () => {
    render(<DashboardPage />);
    const formattedDate = new Date("2025-01-15T00:00:00Z").toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it("does not render standalone logout button", () => {
    render(<DashboardPage />);
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });
});
