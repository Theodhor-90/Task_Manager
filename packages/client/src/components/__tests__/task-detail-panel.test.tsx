import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { TaskDetailPanel } from "../task-detail-panel";
import type { Task } from "@taskboard/shared";

// Mock modules
vi.mock("../../api/tasks");
vi.mock("../../context/board-context");
vi.mock("../ui/loading-spinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));
vi.mock("../ui/error-message", () => ({
  ErrorMessage: ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
    <div data-testid="error-message">
      {message}
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  ),
}));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-preview">{children}</div>
  ),
}));

// Import mocked modules
import { fetchTask } from "../../api/tasks";
import { useBoard } from "../../context/board-context";

const mockTask: Task = {
  _id: "task1",
  title: "Test Task",
  description: "Some description",
  status: "To Do",
  priority: "medium" as const,
  position: 0,
  labels: [],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const mockTaskNoDescription: Task = {
  ...mockTask,
  _id: "task2",
  description: "",
};

const mockTaskWithDueDate: Task = {
  ...mockTask,
  dueDate: "2026-03-15T00:00:00.000Z",
};

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

function renderPanel(props?: Partial<TaskDetailPanelProps>) {
  const defaultProps = { taskId: "task1", onClose: vi.fn() };
  const finalProps = { ...defaultProps, ...props };
  return { ...render(<TaskDetailPanel {...finalProps} />), onClose: finalProps.onClose };
}

describe("TaskDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("shows loading spinner while fetching task", () => {
    vi.mocked(fetchTask).mockReturnValue(new Promise(() => {}));
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows error message when fetchTask fails", async () => {
    vi.mocked(fetchTask).mockRejectedValue(new Error("Not found"));
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("Not found");
    });
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("renders task title and status after loading", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Task");
    });
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const backdrop = screen.getByTestId("task-detail-backdrop");
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText("Close panel");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed (not editing)", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking title enters edit mode with input pre-filled", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("Test Task");
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("Enter saves title and exits edit mode", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTask,
      title: "New Title",
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: mockUpdateTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { title: "New Title" });
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("New Title");
    });
    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
  });

  it("blur saves title and exits edit mode", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTask,
      title: "New Title",
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: mockUpdateTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title");
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { title: "New Title" });
    });
  });

  it("Escape while editing cancels edit without closing panel", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Task");
    });
    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("empty or whitespace-only title does not trigger update", async () => {
    const mockUpdateTask = vi.fn();
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: mockUpdateTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Task");
    });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("same-as-current title does not trigger update", async () => {
    const mockUpdateTask = vi.fn();
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: mockUpdateTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
    });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("prevents body scroll while open", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("hidden");
    });
  });

  it("restores body scroll on unmount", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    const { unmount } = renderPanel();

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("hidden");
    });

    unmount();

    expect(document.body.style.overflow).toBe("");
  });

  it("title edit failure reverts to current title", async () => {
    const mockUpdateTask = vi.fn().mockRejectedValue(new Error("Update failed"));
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: mockUpdateTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    const input = screen.getByLabelText("Task title");
    fireEvent.change(input, { target: { value: "Bad" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Task");
    });
  });

  it("panel does not close on click inside panel content", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("defaults to Preview tab when description exists", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Preview tab should be active (has blue styling)
    const previewTab = screen.getByRole("button", { name: "Preview" });
    expect(previewTab).toHaveClass("text-blue-600");
  });

  it("defaults to Write tab when description is empty", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskNoDescription } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByLabelText("Task description")).toBeInTheDocument();
    });

    const writeTab = screen.getByRole("button", { name: "Write" });
    expect(writeTab).toHaveClass("text-blue-600");
  });

  it("renders textarea in Write tab with current description", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Switch to Write tab
    fireEvent.click(screen.getByRole("button", { name: "Write" }));

    const textarea = screen.getByLabelText("Task description") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe("Some description");
  });

  it("renders markdown content in Preview tab", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Some description");
    });
  });

  it("switches between Write and Preview tabs", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Switch to Write
    fireEvent.click(screen.getByRole("button", { name: "Write" }));
    expect(screen.getByLabelText("Task description")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();

    // Switch back to Preview
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    expect(screen.queryByLabelText("Task description")).not.toBeInTheDocument();
  });

  it("description saves on blur when changed", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTask,
      description: "Updated description",
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Switch to Write tab
    fireEvent.click(screen.getByRole("button", { name: "Write" }));

    const textarea = screen.getByLabelText("Task description");
    fireEvent.change(textarea, { target: { value: "Updated description" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { description: "Updated description" });
    });
  });

  it("description does not save on blur when unchanged", async () => {
    const mockUpdateTask = vi.fn();
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Switch to Write tab
    fireEvent.click(screen.getByRole("button", { name: "Write" }));

    const textarea = screen.getByLabelText("Task description");
    fireEvent.blur(textarea);

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("shows placeholder when description is empty in Preview mode", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskNoDescription } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByLabelText("Task description")).toBeInTheDocument();
    });

    // Switch to Preview tab
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByText("Add a description...")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();
  });

  it("description save failure reverts to current description", async () => {
    const mockUpdateTask = vi.fn().mockRejectedValue(new Error("Save failed"));
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Switch to Write tab
    fireEvent.click(screen.getByRole("button", { name: "Write" }));

    const textarea = screen.getByLabelText("Task description") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Bad description" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
    });

    // After failure, textarea value should revert
    await waitFor(() => {
      expect((screen.getByLabelText("Task description") as HTMLTextAreaElement).value).toBe("Some description");
    });
  });

  it("Preview tab shows updated content after editing in Write tab", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTask,
      description: "New content",
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    });

    // Switch to Write, edit, blur to save
    fireEvent.click(screen.getByRole("button", { name: "Write" }));
    const textarea = screen.getByLabelText("Task description");
    fireEvent.change(textarea, { target: { value: "New content" } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
    });

    // Switch to Preview
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("New content");
  });

  it("priority selector shows current priority", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Priority") as HTMLSelectElement;
    expect(select.value).toBe("medium");
  });

  it("priority selector lists all four options", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const options = screen.getByLabelText("Priority").querySelectorAll("option");
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("Low");
    expect(options[1]).toHaveTextContent("Medium");
    expect(options[2]).toHaveTextContent("High");
    expect(options[3]).toHaveTextContent("Urgent");
  });

  it("changing priority calls updateTask", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTask,
      priority: "high",
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Priority");
    fireEvent.change(select, { target: { value: "high" } });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { priority: "high" });
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Priority") as HTMLSelectElement).value).toBe("high");
    });
  });

  it("priority update failure keeps original value", async () => {
    const mockUpdateTask = vi.fn().mockRejectedValue(new Error("Failed"));
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Priority");
    fireEvent.change(select, { target: { value: "urgent" } });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Priority") as HTMLSelectElement).value).toBe("medium");
    });
  });

  it("due date input shows empty when no due date", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Task due date") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("due date input shows current date", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskWithDueDate } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Task due date") as HTMLInputElement;
    expect(input.value).toBe("2026-03-15");
  });

  it("changing due date calls updateTask", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTask,
      dueDate: "2026-04-01T00:00:00.000Z",
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const input = screen.getByLabelText("Task due date");
    fireEvent.change(input, { target: { value: "2026-04-01" } });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { dueDate: "2026-04-01" });
    });
  });

  it("clear button sends null for due date", async () => {
    const mockUpdateTask = vi.fn().mockResolvedValue({
      ...mockTaskWithDueDate,
      dueDate: undefined,
    });
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskWithDueDate } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText("Clear due date");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("task1", { dueDate: null });
    });
  });

  it("clear button not shown when no due date", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: vi.fn(), labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Clear due date")).not.toBeInTheDocument();
  });

  it("due date clear updates the input", async () => {
    const clearedTask = { ...mockTaskWithDueDate, dueDate: undefined };
    const mockUpdateTask = vi.fn().mockResolvedValue(clearedTask);
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTaskWithDueDate } as any);
    vi.mocked(useBoard).mockReturnValue({ updateTask: mockUpdateTask, labels: [] } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    expect((screen.getByLabelText("Task due date") as HTMLInputElement).value).toBe("2026-03-15");

    const clearButton = screen.getByLabelText("Clear due date");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect((screen.getByLabelText("Task due date") as HTMLInputElement).value).toBe("");
    });

    expect(screen.queryByLabelText("Clear due date")).not.toBeInTheDocument();
  });

  it("delete button is visible in the panel", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Delete task" })).toBeInTheDocument();
  });

  it("clicking delete button opens confirmation dialog", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: vi.fn(),
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));

    expect(
      screen.getByText("Are you sure you want to delete this task? This action cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("canceling confirmation dialog does not delete task", async () => {
    const mockRemoveTask = vi.fn();
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: mockRemoveTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockRemoveTask).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("confirming deletion calls removeTask and closes panel", async () => {
    const mockRemoveTask = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: mockRemoveTask,
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockRemoveTask).toHaveBeenCalledWith("task1");
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("delete failure shows error in panel", async () => {
    const mockRemoveTask = vi.fn().mockRejectedValue(new Error("Delete failed"));
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: mockRemoveTask,
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockRemoveTask).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("delete error can be dismissed", async () => {
    const mockRemoveTask = vi.fn().mockRejectedValue(new Error("Delete failed"));
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: mockRemoveTask,
      labels: [],
    } as any);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Dismiss"));

    expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
  });

  it("Escape while confirm dialog is open does not close panel", async () => {
    vi.mocked(fetchTask).mockResolvedValue({ data: mockTask } as any);
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
      removeTask: vi.fn(),
      labels: [],
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));

    expect(
      screen.getByText("Are you sure you want to delete this task? This action cannot be undone."),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    // Dialog should close but panel should remain open
    await waitFor(() => {
      expect(
        screen.queryByText("Are you sure you want to delete this task? This action cannot be undone."),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
