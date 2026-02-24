import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectFormModal } from "../project-form-modal";
import type { Project } from "@taskboard/shared";

const mockAddProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockUseProjects = vi.fn();

vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

describe("ProjectFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjects.mockReturnValue({
      projects: [],
      isLoading: false,
      error: null,
      addProject: mockAddProject,
      updateProject: mockUpdateProject,
      removeProject: vi.fn(),
    });
  });

  function renderModal(props?: Partial<{ isOpen: boolean; onClose: () => void; project?: Project }>) {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
    };
    return render(<ProjectFormModal {...defaultProps} {...props} />);
  }

  it("renders nothing when isOpen is false", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/Project/)).not.toBeInTheDocument();
  });

  it("renders 'New Project' title in create mode", () => {
    renderModal();
    expect(screen.getByText("New Project")).toBeInTheDocument();
  });

  it("renders 'Edit Project' title in edit mode", () => {
    const project: Project = {
      _id: "abc123",
      name: "Test Project",
      description: "Test description",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    };
    renderModal({ project });
    expect(screen.getByText("Edit Project")).toBeInTheDocument();
  });

  it("renders empty name and description in create mode", () => {
    renderModal();
    const nameInput = screen.getByLabelText(/Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    expect(nameInput).toHaveValue("");
    expect(descriptionInput).toHaveValue("");
  });

  it("pre-fills name and description in edit mode", () => {
    const project: Project = {
      _id: "abc123",
      name: "Test Project",
      description: "Test description",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    };
    renderModal({ project });
    const nameInput = screen.getByLabelText(/Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    expect(nameInput).toHaveValue("Test Project");
    expect(descriptionInput).toHaveValue("Test description");
  });

  it("pre-fills empty description when project has no description", () => {
    const project: Project = {
      _id: "abc123",
      name: "Test Project",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    };
    renderModal({ project });
    const descriptionInput = screen.getByLabelText(/Description/);
    expect(descriptionInput).toHaveValue("");
  });

  it("shows validation error when submitting empty name", async () => {
    renderModal();
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText("Project name is required")).toBeInTheDocument();
    });
    expect(mockAddProject).not.toHaveBeenCalled();
  });

  it("shows validation error when name is only whitespace", async () => {
    renderModal();
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "   " } });
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText("Project name is required")).toBeInTheDocument();
    });
    expect(mockAddProject).not.toHaveBeenCalled();
  });

  it("calls addProject and closes modal on successful create", async () => {
    const onClose = vi.fn();
    mockAddProject.mockResolvedValue({
      _id: "new-id",
      name: "New Project",
      description: "New description",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    });
    renderModal({ onClose });
    const nameInput = screen.getByLabelText(/Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(nameInput, { target: { value: "New Project" } });
    fireEvent.change(descriptionInput, { target: { value: "New description" } });
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockAddProject).toHaveBeenCalledWith({ name: "New Project", description: "New description" });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("calls updateProject and closes modal on successful edit", async () => {
    const onClose = vi.fn();
    const project: Project = {
      _id: "abc123",
      name: "Old Name",
      description: "Old description",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    };
    mockUpdateProject.mockResolvedValue({
      ...project,
      name: "Updated Name",
      description: "Updated description",
    });
    renderModal({ project, onClose });
    const nameInput = screen.getByLabelText(/Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });
    fireEvent.change(descriptionInput, { target: { value: "Updated description" } });
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalledWith("abc123", { name: "Updated Name", description: "Updated description" });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows error message when addProject rejects", async () => {
    const onClose = vi.fn();
    mockAddProject.mockRejectedValue(new Error("Server error"));
    renderModal({ onClose });
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "New Project" } });
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows error message when updateProject rejects", async () => {
    const onClose = vi.fn();
    const project: Project = {
      _id: "abc123",
      name: "Old Name",
      description: "Old description",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    };
    mockUpdateProject.mockRejectedValue(new Error("Update failed"));
    renderModal({ project, onClose });
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables submit button during submission", async () => {
    let resolvePromise: (value: Project) => void;
    mockAddProject.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    renderModal();
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "New Project" } });
    const submitButton = screen.getByRole("button", { name: /Create/ });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Creating...");
    });
    resolvePromise!({
      _id: "new-id",
      name: "New Project",
      description: "",
      owner: "user1",
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    });
    await waitFor(() => {
      expect(mockAddProject).toHaveBeenCalled();
    });
  });

  it("resets form when modal reopens", () => {
    const { rerender } = renderModal({ isOpen: true });
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "Test Name" } });
    expect(nameInput).toHaveValue("Test Name");
    rerender(<ProjectFormModal isOpen={false} onClose={vi.fn()} />);
    rerender(<ProjectFormModal isOpen={true} onClose={vi.fn()} />);
    const newNameInput = screen.getByLabelText(/Name/);
    expect(newNameInput).toHaveValue("");
  });
});
