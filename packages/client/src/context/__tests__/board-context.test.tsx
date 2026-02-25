import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardProvider, useBoard } from "../board-context";
import {
  fetchBoard,
  fetchBoardTasks,
  addColumn,
  renameColumn,
  deleteColumn,
  reorderColumns,
} from "../../api/boards";
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
} from "../../api/tasks";

vi.mock("../../api/boards", () => ({
  fetchBoard: vi.fn(),
  fetchBoardTasks: vi.fn(),
  addColumn: vi.fn(),
  renameColumn: vi.fn(),
  deleteColumn: vi.fn(),
  reorderColumns: vi.fn(),
}));

vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
  moveTask: vi.fn(),
}));

const mockFetchBoard = fetchBoard as ReturnType<typeof vi.fn>;
const mockFetchBoardTasks = fetchBoardTasks as ReturnType<typeof vi.fn>;
const mockAddColumn = addColumn as ReturnType<typeof vi.fn>;
const mockRenameColumn = renameColumn as ReturnType<typeof vi.fn>;
const mockDeleteColumn = deleteColumn as ReturnType<typeof vi.fn>;
const mockReorderColumns = reorderColumns as ReturnType<typeof vi.fn>;
const mockApiCreateTask = apiCreateTask as ReturnType<typeof vi.fn>;
const mockApiMoveTask = apiMoveTask as ReturnType<typeof vi.fn>;

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
    title: "Test Task",
    status: "To Do",
    priority: "medium" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];

const multiTasks = [
  {
    _id: "task1",
    title: "Task 1",
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
    _id: "task2",
    title: "Task 2",
    status: "To Do",
    priority: "high" as const,
    position: 1,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  },
  {
    _id: "task3",
    title: "Task 3",
    status: "In Progress",
    priority: "low" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
  },
];

let testHookValues: ReturnType<typeof useBoard>;

function TestConsumer() {
  const values = useBoard();
  testHookValues = values;
  return (
    <div>
      <span data-testid="loading">{String(values.isLoading)}</span>
      <span data-testid="error">{values.error ?? ""}</span>
      <span data-testid="board">{values.board ? values.board._id : "null"}</span>
      <span data-testid="task-count">{values.tasks.length}</span>
      <span data-testid="columns">
        {values.board?.columns.map((c) => c.name).join(",") ?? ""}
      </span>
      <span data-testid="task-statuses">
        {values.tasks
          .sort((a, b) => a._id.localeCompare(b._id))
          .map((t) => `${t._id}:${t.status}:${t.position}`)
          .join(",")}
      </span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <BoardProvider>
      <TestConsumer />
    </BoardProvider>,
  );
}

describe("BoardContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useBoard throws when used outside BoardProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useBoard must be used within a BoardProvider",
    );

    spy.mockRestore();
  });

  it("initial state has no board, empty tasks, not loading, no error", () => {
    renderWithProvider();

    expect(screen.getByTestId("board")).toHaveTextContent("null");
    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("loadBoard fetches board and tasks, sets state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    expect(mockFetchBoard).toHaveBeenCalledWith("proj1");
    expect(mockFetchBoardTasks).toHaveBeenCalledWith("board1");
    expect(screen.getByTestId("board")).toHaveTextContent("board1");
    expect(screen.getByTestId("task-count")).toHaveTextContent("1");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("loadBoard sets error on fetchBoard failure", async () => {
    mockFetchBoard.mockRejectedValue(new Error("Network error"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    expect(screen.getByTestId("error")).toHaveTextContent("Network error");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("board")).toHaveTextContent("null");
  });

  it("loadBoard sets error when fetchBoardTasks fails", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockRejectedValue(new Error("Tasks fetch failed"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    expect(screen.getByTestId("error")).toHaveTextContent("Tasks fetch failed");
  });

  it("addColumn calls API and appends column to state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockAddColumn.mockResolvedValue({ data: { _id: "col4", name: "QA", position: 3 } });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    let result;
    await act(async () => {
      result = await testHookValues.addColumn("QA");
    });

    expect(mockAddColumn).toHaveBeenCalledWith("board1", "QA");
    expect(result).toEqual({ _id: "col4", name: "QA", position: 3 });
    expect(screen.getByTestId("columns")).toHaveTextContent("To Do,In Progress,Done,QA");
  });

  it("addColumn throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.addColumn("QA");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("renameColumn calls API and updates column name in state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockRenameColumn.mockResolvedValue({ data: { _id: "col1", name: "Backlog", position: 0 } });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.renameColumn("col1", "Backlog");
    });

    expect(mockRenameColumn).toHaveBeenCalledWith("board1", "col1", "Backlog");
    expect(screen.getByTestId("columns")).toHaveTextContent("Backlog,In Progress,Done");
  });

  it("renameColumn throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.renameColumn("col1", "Backlog");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("removeColumn calls API and removes column from state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockDeleteColumn.mockResolvedValue({ data: { message: "Column deleted" } });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.removeColumn("col1");
    });

    expect(mockDeleteColumn).toHaveBeenCalledWith("board1", "col1");
    expect(screen.getByTestId("columns")).toHaveTextContent("In Progress,Done");
  });

  it("removeColumn re-throws on API failure and does not modify state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockDeleteColumn.mockRejectedValue(new Error("Cannot delete column that contains tasks"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await expect(
      act(async () => {
        await testHookValues.removeColumn("col1");
      }),
    ).rejects.toThrow("Cannot delete column that contains tasks");

    expect(screen.getByTestId("columns")).toHaveTextContent("To Do,In Progress,Done");
  });

  it("removeColumn throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.removeColumn("col1");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("reorderColumns optimistically reorders columns", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockReorderColumns.mockResolvedValue({ data: mockBoard });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.reorderColumns(["col3", "col1", "col2"]);
    });

    expect(screen.getByTestId("columns")).toHaveTextContent("Done,To Do,In Progress");
  });

  it("reorderColumns reverts on API failure and sets error", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockReorderColumns.mockRejectedValue(new Error("Reorder failed"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.reorderColumns(["col3", "col1", "col2"]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("columns")).toHaveTextContent("To Do,In Progress,Done");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("Reorder failed");
  });

  it("reorderColumns throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.reorderColumns(["col3", "col1", "col2"]);
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("createTask calls API and appends task to state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    const newTask = {
      _id: "task2",
      title: "New Task",
      status: "In Progress",
      priority: "medium" as const,
      position: 0,
      labels: [],
      board: "board1",
      project: "proj1",
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };
    mockApiCreateTask.mockResolvedValue({ data: newTask });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    let result;
    await act(async () => {
      result = await testHookValues.createTask("In Progress", "New Task");
    });

    expect(mockApiCreateTask).toHaveBeenCalledWith("board1", {
      title: "New Task",
      status: "In Progress",
    });
    expect(result).toEqual(newTask);
    expect(screen.getByTestId("task-count")).toHaveTextContent("2");
  });

  it("createTask throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.createTask("To Do", "New Task");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("createTask does not modify state on API failure", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockApiCreateTask.mockRejectedValue(new Error("Create failed"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await expect(
      act(async () => {
        await testHookValues.createTask("To Do", "New Task");
      }),
    ).rejects.toThrow("Create failed");

    expect(screen.getByTestId("task-count")).toHaveTextContent("1");
  });

  it("moveTask optimistically updates task status and position (cross-column)", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: multiTasks });
    const movedTask = { ...multiTasks[0], status: "In Progress", position: 1 };
    mockApiMoveTask.mockResolvedValue({ data: movedTask });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.moveTask("task1", "In Progress", 1);
    });

    expect(mockApiMoveTask).toHaveBeenCalledWith("task1", {
      status: "In Progress",
      position: 1,
    });

    const statuses = screen.getByTestId("task-statuses").textContent;
    expect(statuses).toContain("task1:In Progress:1");
    expect(statuses).toContain("task2:To Do:0");
    expect(statuses).toContain("task3:In Progress:0");
  });

  it("moveTask reverts on API failure and sets error", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: multiTasks });
    mockApiMoveTask.mockRejectedValue(new Error("Move failed"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.moveTask("task1", "In Progress", 0);
    });

    await waitFor(() => {
      const statuses = screen.getByTestId("task-statuses").textContent;
      expect(statuses).toContain("task1:To Do:0");
      expect(statuses).toContain("task2:To Do:1");
      expect(statuses).toContain("task3:In Progress:0");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("Move failed");
  });

  it("moveTask throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.moveTask("task1", "In Progress", 0);
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("moveTask handles same-column reorder", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: multiTasks });
    const movedTask = { ...multiTasks[0], status: "To Do", position: 1 };
    mockApiMoveTask.mockResolvedValue({ data: movedTask });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.moveTask("task1", "To Do", 1);
    });

    expect(mockApiMoveTask).toHaveBeenCalledWith("task1", {
      status: "To Do",
      position: 1,
    });

    const statuses = screen.getByTestId("task-statuses").textContent;
    expect(statuses).toContain("task1:To Do:1");
  });

  it("setTasks is exposed and can update tasks directly", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    expect(screen.getByTestId("task-count")).toHaveTextContent("1");

    act(() => {
      testHookValues.setTasks([]);
    });

    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
  });
});
