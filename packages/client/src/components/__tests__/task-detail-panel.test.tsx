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
  ErrorMessage: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
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
    } as any);

    renderPanel();

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows error message when fetchTask fails", async () => {
    vi.mocked(fetchTask).mockRejectedValue(new Error("Not found"));
    vi.mocked(useBoard).mockReturnValue({
      updateTask: vi.fn(),
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
    } as any);

    const { onClose } = renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const title = screen.getByRole("heading", { level: 2 });
    fireEvent.click(title);

    expect(onClose).not.toHaveBeenCalled();
  });
});
