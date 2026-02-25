import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useBoard } from "../context/board-context";
import { Column } from "./column";
import { LoadingSpinner } from "./ui/loading-spinner";
import { ErrorMessage } from "./ui/error-message";

export function BoardView() {
  const {
    board,
    tasks,
    isLoading,
    error,
    addColumn,
    renameColumn,
    removeColumn,
    reorderColumns,
  } = useBoard();

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const addColumnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingColumn && addColumnInputRef.current) {
      addColumnInputRef.current.focus();
    }
  }, [isAddingColumn]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !board) return;

    const oldIndex = board.columns.findIndex((col) => col._id === active.id);
    const newIndex = board.columns.findIndex((col) => col._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(board.columns, oldIndex, newIndex);
    const newColumnIds = newOrder.map((col) => col._id);
    reorderColumns(newColumnIds);
  }

  async function handleAddColumn() {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    try {
      await addColumn(trimmed);
      setNewColumnName("");
      setIsAddingColumn(false);
    } catch {
      // Error is handled by the context or ignored here;
      // the form stays open so the user can retry
    }
  }

  function handleAddColumnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddColumn();
    } else if (e.key === "Escape") {
      setNewColumnName("");
      setIsAddingColumn(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!board) {
    return null;
  }

  const columnIds = board.columns.map((col) => col._id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => {
            const columnTasks = tasks
              .filter((t) => t.status === column.name)
              .sort((a, b) => a.position - b.position);

            return (
              <Column
                key={column._id}
                column={column}
                taskCount={columnTasks.length}
                onRename={async (columnId, name) => {
                  await renameColumn(columnId, name);
                }}
                onDelete={async (columnId) => {
                  await removeColumn(columnId);
                }}
              >
                {columnTasks.map((task) => (
                  <div
                    key={task._id}
                    className="mb-2 rounded bg-white p-2 text-sm shadow-sm"
                  >
                    {task.title}
                  </div>
                ))}
              </Column>
            );
          })}

          {/* Add Column UI */}
          {isAddingColumn ? (
            <div className="flex w-72 flex-shrink-0 flex-col gap-2 rounded-lg bg-gray-100 p-3">
              <input
                ref={addColumnInputRef}
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={handleAddColumnKeyDown}
                placeholder="Column name"
                className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                aria-label="New column name"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setNewColumnName("");
                    setIsAddingColumn(false);
                  }}
                  className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex h-10 w-72 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
            >
              + Add Column
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
