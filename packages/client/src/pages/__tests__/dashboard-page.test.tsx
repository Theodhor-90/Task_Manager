import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
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

const mockRemoveProject = vi.fn();

function defaultProjectsState() {
  return {
    projects: mockProjects,
    isLoading: false,
    error: null,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    removeProject: mockRemoveProject,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockRemoveProject.mockReset();
    mockUseProjects.mockReturnValue(defaultProjectsState());
  });

  it('renders the "Projects" heading', () => {
    renderDashboard();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Projects");
  });

  it('renders the "New Project" button', () => {
    renderDashboard();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("shows loading spinner when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      isLoading: true,
    });
    renderDashboard();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show project cards when loading", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: mockProjects,
      isLoading: true,
    });
    renderDashboard();
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  it("shows error message when fetch fails", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
      error: "Network error",
    });
    renderDashboard();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when no projects", () => {
    mockUseProjects.mockReturnValue({
      ...defaultProjectsState(),
      projects: [],
    });
    renderDashboard();
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("renders project cards when projects exist", () => {
    renderDashboard();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("renders project description when present", () => {
    renderDashboard();
    expect(screen.getByText("First project description")).toBeInTheDocument();
  });

  it("does not render description paragraph when absent", () => {
    renderDashboard();
    const betaHeading = screen.getByText("Project Beta");
    const card = betaHeading.closest("a");
    expect(card?.querySelector("p.text-gray-500")).toBeNull();
  });

  it("renders project creation dates", () => {
    renderDashboard();
    const formattedDate = new Date("2025-01-15T00:00:00Z").toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it("does not render standalone logout button", () => {
    renderDashboard();
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });

  it('opens create modal when "New Project" button is clicked', () => {
    renderDashboard();
    const newProjectButton = screen.getByRole("button", { name: "New Project" });
    fireEvent.click(newProjectButton);
    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
  });

  it("closes create modal when onClose is triggered", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "New Project" }));
    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButtons[0]);
    expect(screen.queryByRole("heading", { name: "New Project" })).not.toBeInTheDocument();
  });

  it("opens edit modal when edit button is clicked on a project card", () => {
    renderDashboard();
    const editButtons = screen.getAllByLabelText("Edit project");
    fireEvent.click(editButtons[0]);
    expect(screen.getByRole("heading", { name: "Edit Project" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Project Alpha")).toBeInTheDocument();
  });

  it("closes edit modal when onClose is triggered", () => {
    renderDashboard();
    const editButtons = screen.getAllByLabelText("Edit project");
    fireEvent.click(editButtons[0]);
    expect(screen.getByRole("heading", { name: "Edit Project" })).toBeInTheDocument();
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButtons[0]);
    expect(screen.queryByRole("heading", { name: "Edit Project" })).not.toBeInTheDocument();
  });

  it("opens confirm dialog when delete button is clicked on a project card", () => {
    renderDashboard();
    const deleteButtons = screen.getAllByLabelText("Delete project");
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText(/are you sure you want to delete "Project Alpha"/i)).toBeInTheDocument();
  });

  it("calls removeProject on delete confirmation", async () => {
    mockRemoveProject.mockResolvedValue(undefined);
    renderDashboard();
    const deleteButtons = screen.getAllByLabelText("Delete project");
    fireEvent.click(deleteButtons[0]);
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(mockRemoveProject).toHaveBeenCalledWith("proj1");
    });
  });

  it("closes confirm dialog when cancel is clicked", () => {
    renderDashboard();
    const deleteButtons = screen.getAllByLabelText("Delete project");
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText(/are you sure you want to delete "Project Alpha"/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/are you sure you want to delete "Project Alpha"/i)).not.toBeInTheDocument();
    expect(mockRemoveProject).not.toHaveBeenCalled();
  });

  it("shows delete error when removeProject fails", async () => {
    mockRemoveProject.mockRejectedValue(new Error("Delete failed"));
    renderDashboard();
    const deleteButtons = screen.getAllByLabelText("Delete project");
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });
  });

  it("dismisses delete error when dismiss button clicked", async () => {
    mockRemoveProject.mockRejectedValue(new Error("Delete failed"));
    renderDashboard();
    const deleteButtons = screen.getAllByLabelText("Delete project");
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });
    const dismissButton = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissButton);
    expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
  });

  it("renders ProjectCard components instead of inline cards", () => {
    renderDashboard();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/projects/proj1/board");
    expect(links[1]).toHaveAttribute("href", "/projects/proj2/board");
  });

  it("renders edit and delete buttons on project cards", () => {
    renderDashboard();
    const editButtons = screen.getAllByLabelText("Edit project");
    const deleteButtons = screen.getAllByLabelText("Delete project");
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it("confirm dialog message contains project name and cascade warning", () => {
    renderDashboard();
    const deleteButtons = screen.getAllByLabelText("Delete project");
    fireEvent.click(deleteButtons[0]);
    const confirmMessage = screen.getByText(/are you sure you want to delete "Project Alpha"/i);
    expect(confirmMessage).toBeInTheDocument();
    expect(confirmMessage).toHaveTextContent("permanently deleted");
  });
});
