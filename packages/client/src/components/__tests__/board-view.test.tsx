import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardView } from "../board-view";

const mockUseBoard = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: (...args: unknown[]) => mockUseBoard(...args),
}));

let capturedOnDragEnd: ((event: unknown) => void) | undefined;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (event: unknown) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn((sensor) => sensor),
  useSensors: vi.fn((...sensors) => sensors),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  horizontalListSortingStrategy: "horizontal",
  arrayMove: vi.fn((array: unknown[], from: number, to: number) => {
    const result = [...(array as unknown[])];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
}));

vi.mock("../column", () => ({
  Column: ({
    column,
    taskCount,
    children,
  }: {
    column: { _id: string; name: string };
    taskCount: number;
    children: React.ReactNode;
  }) => (
    <div data-testid={`column-${column._id}`}>
      <span data-testid={`column-name-${column._id}`}>{column.name}</span>
      <span data-testid={`column-count-${column._id}`}>{taskCount}</span>
      <div data-testid={`column-tasks-${column._id}`}>{children}</div>
    </div>
  ),
}));

const mockBoard = {
  _id: "board1",
  project: "proj1",
  columns: [
    { _id: "col1", name: "To Do", position: 0 },
    { _id: "col2", name: "In Progress", position: 1 },
    { _id: "col3", name: "Done", position: 2 },
  ],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const mockTasks = [
  {
    _id: "task1",
    title: "Write tests",
    status: "To Do",
    priority: "high" as const,
    position: 1,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    _id: "task2",
    title: "Setup project",
    status: "To Do",
    priority: "medium" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    _id: "task3",
    title: "Deploy app",
    status: "In Progress",
    priority: "low" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];

function defaultBoardState() {
  return {
    board: mockBoard,
    tasks: mockTasks,
    isLoading: false,
    error: null,
    loadBoard: vi.fn(),
    addColumn: vi.fn().mockResolvedValue({ _id: "col4", name: "QA", position: 3 }),
    renameColumn: vi.fn().mockResolvedValue({ _id: "col1", name: "Backlog", position: 0 }),
    removeColumn: vi.fn().mockResolvedValue(undefined),
    reorderColumns: vi.fn().mockResolvedValue(undefined),
  };
}

function renderBoardView(overrides?: any) {
  const state = { ...defaultBoardState(), ...overrides };
  mockUseBoard.mockReturnValue(state);
  render(<BoardView />);
  return state;
}

describe("BoardView", () => {
  it("shows LoadingSpinner when loading", () => {
    renderBoardView({ isLoading: true, board: null, tasks: [] });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("shows ErrorMessage when error exists", () => {
    renderBoardView({ error: "Failed to load board", board: null, tasks: [] });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load board")).toBeInTheDocument();
  });

  it("renders nothing when board is null and not loading", () => {
    const { container } = render(<BoardView />);
    mockUseBoard.mockReturnValue({ ...defaultBoardState(), board: null, tasks: [] });
    const { container: c } = render(<BoardView />);
    expect(c.firstChild).toBeNull();
  });

  it("renders all columns with correct names", () => {
    renderBoardView();
    expect(screen.getByTestId("column-name-col1")).toHaveTextContent("To Do");
    expect(screen.getByTestId("column-name-col2")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("column-name-col3")).toHaveTextContent("Done");
  });

  it("passes correct task count to each column", () => {
    renderBoardView();
    expect(screen.getByTestId("column-count-col1")).toHaveTextContent("2");
    expect(screen.getByTestId("column-count-col2")).toHaveTextContent("1");
    expect(screen.getByTestId("column-count-col3")).toHaveTextContent("0");
  });

  it("groups tasks by status and sorts by position", () => {
    renderBoardView();
    const todoTasks = screen.getByTestId("column-tasks-col1");
    const taskTexts = todoTasks.textContent;
    // "Setup project" (position 0) should come before "Write tests" (position 1)
    expect(taskTexts).toBe("Setup projectWrite tests");
  });

  it("renders task stubs with title text", () => {
    renderBoardView();
    expect(screen.getByText("Setup project")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("Deploy app")).toBeInTheDocument();
  });

  it("renders DndContext and SortableContext", () => {
    renderBoardView();
    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
  });

  it("shows Add Column button when not adding", () => {
    renderBoardView();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("clicking Add Column button shows inline form", () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    expect(screen.getByLabelText("New column name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("Enter submits new column name and calls addColumn", async () => {
    const state = renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByLabelText("New column name");
    fireEvent.change(input, { target: { value: "QA" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(state.addColumn).toHaveBeenCalledWith("QA");
    });
  });

  it("clicking Add button submits new column name", async () => {
    const state = renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByLabelText("New column name");
    fireEvent.change(input, { target: { value: "QA" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => {
      expect(state.addColumn).toHaveBeenCalledWith("QA");
    });
  });

  it("Escape cancels add column form", () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    expect(screen.getByLabelText("New column name")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText("New column name"), { key: "Escape" });
    expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("Cancel button closes add column form", () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("empty input does not call addColumn", async () => {
    const state = renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByLabelText("New column name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(state.addColumn).not.toHaveBeenCalled();
  });

  it("add column form closes on successful submission", async () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByLabelText("New column name");
    fireEvent.change(input, { target: { value: "QA" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
    });
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("add column form stays open on failure", async () => {
    renderBoardView({
      addColumn: vi.fn().mockRejectedValue(new Error("Server error")),
    });
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByLabelText("New column name");
    fireEvent.change(input, { target: { value: "QA" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByLabelText("New column name")).toBeInTheDocument();
    });
  });

  it("handleDragEnd calls reorderColumns with new column order", () => {
    const state = renderBoardView();
    // Simulate dragging col1 (index 0) over col3 (index 2)
    capturedOnDragEnd!({
      active: { id: "col1" },
      over: { id: "col3" },
    });
    expect(state.reorderColumns).toHaveBeenCalledWith(["col2", "col3", "col1"]);
  });

  it("handleDragEnd does not call reorderColumns when dropped on same position", () => {
    const state = renderBoardView();
    capturedOnDragEnd!({
      active: { id: "col1" },
      over: { id: "col1" },
    });
    expect(state.reorderColumns).not.toHaveBeenCalled();
  });

  it("handleDragEnd does not call reorderColumns when over is null", () => {
    const state = renderBoardView();
    capturedOnDragEnd!({
      active: { id: "col1" },
      over: null,
    });
    expect(state.reorderColumns).not.toHaveBeenCalled();
  });
});
