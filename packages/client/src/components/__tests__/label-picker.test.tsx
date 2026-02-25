import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LabelPicker } from "../label-picker";
import type { Label, Task } from "@taskboard/shared";

vi.mock("../../context/board-context");

import { useBoard } from "../../context/board-context";

const mockProjectLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label3", name: "Enhancement", color: "#10b981", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

const mockUpdatedTask: Task = {
  _id: "task1",
  title: "Test Task",
  description: "",
  status: "To Do",
  priority: "medium",
  position: 0,
  labels: ["label1", "label2"],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("LabelPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button in closed state", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={[]} onUpdate={mockOnUpdate} />);

    const button = screen.getByLabelText("Toggle label picker");
    expect(button).toBeInTheDocument();
    expect(screen.getByText("No labels")).toBeInTheDocument();
  });

  it("trigger button shows colored dots and count when labels are attached", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={["label1", "label2"]} onUpdate={mockOnUpdate} />);

    const dots = screen.getAllByTitle(/Bug|Feature/);
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveStyle({ backgroundColor: "#ef4444" });
    expect(dots[1]).toHaveStyle({ backgroundColor: "#3b82f6" });
    expect(screen.getByText("2 labels")).toBeInTheDocument();
  });

  it("opens dropdown showing all project labels on click", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={[]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Enhancement")).toBeInTheDocument();
  });

  it("checked checkboxes match task's current labels", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={["label1"]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked(); // Bug is attached
    expect(checkboxes[1]).not.toBeChecked(); // Feature not attached
    expect(checkboxes[2]).not.toBeChecked(); // Enhancement not attached
  });

  it("toggling a checkbox on calls updateTask with label added", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue(mockUpdatedTask);
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={["label1"]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // Toggle Feature on

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { labels: ["label1", "label2"] });
    });
  });

  it("toggling a checkbox off calls updateTask with label removed", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue(mockUpdatedTask);
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={["label1"]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    fireEvent.click(screen.getAllByRole("checkbox")[0]); // Toggle Bug off

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { labels: [] });
    });
  });

  it("calls onUpdate with the updated task after successful API call", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue(mockUpdatedTask);
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={["label1"]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // Toggle Feature on

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(mockUpdatedTask);
    });
  });

  it("does not call onUpdate when updateTask rejects", async () => {
    const mockUpdateTask = vi.fn().mockRejectedValue(new Error("API error"));
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={["label1"]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    fireEvent.click(screen.getAllByRole("checkbox")[1]); // Toggle Feature on

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it("closes dropdown when clicking outside", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={[]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    expect(screen.getByText("Bug")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("shows 'Manage labels' link in dropdown", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: mockProjectLabels,
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={[]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    expect(screen.getByText("Manage labels")).toBeInTheDocument();
  });

  it("handles empty project labels list gracefully", () => {
    const mockUpdateTask = vi.fn();
    const mockOnUpdate = vi.fn();
    vi.mocked(useBoard).mockReturnValue({
      labels: [],
      updateTask: mockUpdateTask,
    } as any);

    render(<LabelPicker taskId="task1" labels={[]} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByLabelText("Toggle label picker"));
    expect(screen.getByText("No labels created yet")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
