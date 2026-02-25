import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Board, Column, Label, Task } from "@taskboard/shared";
import {
  fetchBoard,
  fetchBoardTasks,
  addColumn as apiAddColumn,
  renameColumn as apiRenameColumn,
  deleteColumn as apiDeleteColumn,
  reorderColumns as apiReorderColumns,
} from "../api/boards";
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from "../api/tasks";
import type { UpdateTaskInput } from "../api/tasks";
import {
  fetchLabels as apiFetchLabels,
  createLabel as apiCreateLabel,
  updateLabel as apiUpdateLabel,
  deleteLabel as apiDeleteLabel,
} from "../api/labels";

interface BoardContextValue {
  board: Board | null;
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  loadBoard: (projectId: string) => Promise<void>;
  addColumn: (name: string) => Promise<Column>;
  renameColumn: (columnId: string, name: string) => Promise<Column>;
  removeColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
  createTask: (columnName: string, title: string) => Promise<Task>;
  moveTask: (taskId: string, status: string, position: number) => Promise<void>;
  updateTask: (taskId: string, updates: UpdateTaskInput) => Promise<Task>;
  removeTask: (taskId: string) => Promise<void>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  labels: Label[];
  addLabel: (name: string, color: string) => Promise<Label>;
  updateLabel: (labelId: string, input: { name?: string; color?: string }) => Promise<Label>;
  removeLabel: (labelId: string) => Promise<void>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);

  const loadBoard = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const boardResponse = await fetchBoard(projectId);
      const loadedBoard = boardResponse.data;
      setBoard(loadedBoard);

      const [tasksResponse, labelsResponse] = await Promise.all([
        fetchBoardTasks(loadedBoard._id),
        apiFetchLabels(loadedBoard.project),
      ]);
      setTasks(tasksResponse.data);
      setLabels(labelsResponse.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load board";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addColumn = useCallback(async (name: string): Promise<Column> => {
    if (!board) throw new Error("Board not loaded");
    const response = await apiAddColumn(board._id, name);
    const newColumn = response.data;
    setBoard((prev) =>
      prev ? { ...prev, columns: [...prev.columns, newColumn] } : prev,
    );
    return newColumn;
  }, [board]);

  const renameColumn = useCallback(
    async (columnId: string, name: string): Promise<Column> => {
      if (!board) throw new Error("Board not loaded");
      const response = await apiRenameColumn(board._id, columnId, name);
      const updated = response.data;
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((col) =>
                col._id === columnId ? { ...col, name: updated.name } : col,
              ),
            }
          : prev,
      );
      return updated;
    },
    [board],
  );

  const removeColumn = useCallback(async (columnId: string): Promise<void> => {
    if (!board) throw new Error("Board not loaded");
    await apiDeleteColumn(board._id, columnId);
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.filter((col) => col._id !== columnId),
          }
        : prev,
    );
  }, [board]);

  const reorderColumns = useCallback(
    async (columnIds: string[]): Promise<void> => {
      if (!board) throw new Error("Board not loaded");

      // Snapshot current columns for rollback
      const previousColumns = board.columns;

      // Optimistic update: reorder columns immediately
      const reordered = columnIds
        .map((id, index) => {
          const col = previousColumns.find((c) => c._id === id);
          return col ? { ...col, position: index } : null;
        })
        .filter((col): col is Column => col !== null);

      setBoard((prev) => (prev ? { ...prev, columns: reordered } : prev));

      try {
        await apiReorderColumns(board._id, columnIds);
      } catch (err) {
        // Revert to previous column order on failure
        setBoard((prev) =>
          prev ? { ...prev, columns: previousColumns } : prev,
        );
        setError(
          err instanceof Error ? err.message : "Failed to reorder columns",
        );
      }
    },
    [board],
  );

  const createTask = useCallback(
    async (columnName: string, title: string): Promise<Task> => {
      if (!board) throw new Error("Board not loaded");
      const response = await apiCreateTask(board._id, {
        title,
        status: columnName,
      });
      const newTask = response.data;
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    [board],
  );

  const moveTask = useCallback(
    async (taskId: string, status: string, position: number): Promise<void> => {
      if (!board) throw new Error("Board not loaded");

      // Snapshot for rollback
      const previousTasks = tasks;

      // Optimistic update
      setTasks((prev) => {
        const taskIndex = prev.findIndex((t) => t._id === taskId);
        if (taskIndex === -1) return prev;

        const task = prev[taskIndex];
        const remaining = prev.filter((t) => t._id !== taskId);

        // Reindex source column (fill gap left by removed task)
        const sourceColumnTasks = remaining
          .filter((t) => t.status === task.status)
          .sort((a, b) => a.position - b.position)
          .map((t, i) => ({ ...t, position: i }));

        // Get destination column tasks
        const destColumnTasks =
          status === task.status
            ? sourceColumnTasks
            : remaining
                .filter((t) => t.status === status)
                .sort((a, b) => a.position - b.position);

        // Clamp position to valid range
        const clampedPosition = Math.min(position, destColumnTasks.length);

        // Shift destination tasks at >= clampedPosition
        const shiftedDestTasks = destColumnTasks.map((t) =>
          t.position >= clampedPosition
            ? { ...t, position: t.position + 1 }
            : t,
        );

        // Build moved task
        const movedTask = { ...task, status, position: clampedPosition };

        // Reconstruct full task list
        const otherTasks = remaining.filter(
          (t) => t.status !== task.status && t.status !== status,
        );

        if (status === task.status) {
          return [...otherTasks, ...shiftedDestTasks, movedTask];
        }
        return [...otherTasks, ...sourceColumnTasks, ...shiftedDestTasks, movedTask];
      });

      try {
        await apiMoveTask(taskId, { status, position });
      } catch (err) {
        // Revert to snapshot
        setTasks(previousTasks);
        setError(
          err instanceof Error ? err.message : "Failed to move task",
        );
      }
    },
    [board, tasks],
  );

  const updateTask = useCallback(
    async (taskId: string, updates: UpdateTaskInput): Promise<Task> => {
      const response = await apiUpdateTask(taskId, updates);
      const updatedTask = response.data;
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? updatedTask : t)),
      );
      return updatedTask;
    },
    [],
  );

  const removeTask = useCallback(
    async (taskId: string): Promise<void> => {
      await apiDeleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    },
    [],
  );

  const addLabel = useCallback(
    async (name: string, color: string): Promise<Label> => {
      if (!board) throw new Error("Board not loaded");
      const response = await apiCreateLabel(board.project, { name, color });
      const newLabel = response.data;
      setLabels((prev) => [...prev, newLabel]);
      return newLabel;
    },
    [board],
  );

  const updateLabel = useCallback(
    async (labelId: string, input: { name?: string; color?: string }): Promise<Label> => {
      const response = await apiUpdateLabel(labelId, input);
      const updatedLabel = response.data;
      setLabels((prev) =>
        prev.map((l) => (l._id === labelId ? updatedLabel : l)),
      );
      return updatedLabel;
    },
    [],
  );

  const removeLabel = useCallback(
    async (labelId: string): Promise<void> => {
      await apiDeleteLabel(labelId);
      setLabels((prev) => prev.filter((l) => l._id !== labelId));
      setTasks((prev) =>
        prev.map((t) =>
          t.labels.includes(labelId)
            ? { ...t, labels: t.labels.filter((id) => id !== labelId) }
            : t,
        ),
      );
    },
    [],
  );

  return (
    <BoardContext.Provider
      value={{
        board,
        tasks,
        labels,
        isLoading,
        error,
        loadBoard,
        addColumn,
        renameColumn,
        removeColumn,
        reorderColumns,
        createTask,
        moveTask,
        updateTask,
        removeTask,
        setTasks,
        addLabel,
        updateLabel,
        removeLabel,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard(): BoardContextValue {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
}
