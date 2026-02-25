import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Board, Column, Task } from "@taskboard/shared";
import {
  fetchBoard,
  fetchBoardTasks,
  addColumn as apiAddColumn,
  renameColumn as apiRenameColumn,
  deleteColumn as apiDeleteColumn,
  reorderColumns as apiReorderColumns,
} from "../api/boards";

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
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const boardResponse = await fetchBoard(projectId);
      const loadedBoard = boardResponse.data;
      setBoard(loadedBoard);

      const tasksResponse = await fetchBoardTasks(loadedBoard._id);
      setTasks(tasksResponse.data);
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

  return (
    <BoardContext.Provider
      value={{
        board,
        tasks,
        isLoading,
        error,
        loadBoard,
        addColumn,
        renameColumn,
        removeColumn,
        reorderColumns,
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
