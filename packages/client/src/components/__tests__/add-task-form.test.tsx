import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddTaskForm } from "../add-task-form";

const mockCreateTask = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: () => ({
    createTask: mockCreateTask,
  }),
}));

function renderForm(columnName = "To Do") {
  return render(<AddTaskForm columnName={columnName} />);
}

describe("AddTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders '+ Add task' button initially", () => {
    renderForm();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
  });

  it("clicking button reveals auto-focused input", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    expect(input).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
    expect(screen.queryByText("+ Add task")).not.toBeInTheDocument();
  });

  it("Enter with text calls createTask with correct column name and title", async () => {
    mockCreateTask.mockResolvedValue({
      _id: "task1",
      title: "New task",
      status: "In Progress",
    });
    renderForm("In Progress");
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith("In Progress", "New task");
    });
  });

  it("input clears after successful creation but form stays open", async () => {
    mockCreateTask.mockResolvedValue({
      _id: "task1",
      title: "New task",
      status: "To Do",
    });
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(input).toHaveValue("");
    });
    expect(screen.getByLabelText("New task title")).toBeInTheDocument();
  });

  it("Escape hides input and shows button again", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("empty submission is ignored and does not call createTask", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("API error displays inline error message and preserves input text", async () => {
    mockCreateTask.mockRejectedValue(new Error("Server error"));
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
    expect(input).toHaveValue("My task");
  });

  it("error clears when user types", async () => {
    mockCreateTask.mockRejectedValue(new Error("Server error"));
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    fireEvent.change(input, { target: { value: "My task updated" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("error clears on Escape", async () => {
    mockCreateTask.mockRejectedValue(new Error("Server error"));
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("input is disabled while submitting", async () => {
    let resolveCreate: (value: unknown) => void;
    mockCreateTask.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "Task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
    // Clean up by resolving
    resolveCreate!({ _id: "task1", title: "Task", status: "To Do" });
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it("double Enter does not call createTask twice", async () => {
    let resolveCreate: (value: unknown) => void;
    mockCreateTask.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "Task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    // Clean up
    resolveCreate!({ _id: "task1", title: "Task", status: "To Do" });
  });

  it("onBlur with empty input closes the form", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.blur(input);
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add task")).toBeInTheDocument();
  });

  it("onBlur with text does not close the form", () => {
    renderForm();
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "In progress" } });
    fireEvent.blur(input);
    expect(screen.getByLabelText("New task title")).toBeInTheDocument();
  });

  it("passes correct columnName for different columns", async () => {
    mockCreateTask.mockResolvedValue({
      _id: "task1",
      title: "Deploy",
      status: "Done",
    });
    renderForm("Done");
    fireEvent.click(screen.getByText("+ Add task"));
    const input = screen.getByLabelText("New task title");
    fireEvent.change(input, { target: { value: "Deploy" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith("Done", "Deploy");
    });
  });
});
