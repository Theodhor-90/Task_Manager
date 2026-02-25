import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProjectCard } from "../project-card";
import type { Project } from "@taskboard/shared";

const mockProject: Project = {
  _id: "proj1",
  name: "Project Alpha",
  description: "First project description",
  owner: "user1",
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
};

const mockProjectNoDescription: Project = {
  _id: "proj2",
  name: "Project Beta",
  owner: "user1",
  createdAt: "2025-02-10T00:00:00Z",
  updatedAt: "2025-02-10T00:00:00Z",
};

describe("ProjectCard", () => {
  function renderCard(props?: Partial<{ project: Project; onEdit: (project: Project) => void; onDelete: (project: Project) => void }>) {
    const defaultProps = {
      project: mockProject,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };
    const finalProps = { ...defaultProps, ...props };
    return {
      ...render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<ProjectCard {...finalProps} />} />
            <Route path="/projects/:id/board" element={<div data-testid="board">Board</div>} />
          </Routes>
        </MemoryRouter>
      ),
      ...finalProps,
    };
  }

  it("renders project name", () => {
    renderCard();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  });

  it("renders project description when present", () => {
    renderCard();
    expect(screen.getByText("First project description")).toBeInTheDocument();
  });

  it("does not render description when absent", () => {
    renderCard({ project: mockProjectNoDescription });
    expect(screen.queryByText(/First project description/)).not.toBeInTheDocument();
    const container = screen.getByText("Project Beta").closest("a");
    const descriptionParagraph = container?.querySelector(".text-gray-500");
    expect(descriptionParagraph).not.toBeInTheDocument();
  });

  it("renders formatted creation date", () => {
    renderCard();
    const expectedDate = new Date("2025-01-15T00:00:00Z").toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it("links to the board route", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/proj1/board");
  });

  it("calls onEdit with project when edit button clicked", () => {
    const { onEdit } = renderCard();
    const editButton = screen.getByLabelText("Edit project");
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(mockProject);
  });

  it("calls onDelete with project when delete button clicked", () => {
    const { onDelete } = renderCard();
    const deleteButton = screen.getByLabelText("Delete project");
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(mockProject);
  });

  it("edit button does not trigger navigation", () => {
    const { onEdit } = renderCard();
    const editButton = screen.getByLabelText("Edit project");
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(mockProject);
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });

  it("delete button does not trigger navigation", () => {
    const { onDelete } = renderCard();
    const deleteButton = screen.getByLabelText("Delete project");
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(mockProject);
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });

  it("renders edit and delete action buttons", () => {
    renderCard();
    expect(screen.getByLabelText("Edit project")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete project")).toBeInTheDocument();
  });
});
