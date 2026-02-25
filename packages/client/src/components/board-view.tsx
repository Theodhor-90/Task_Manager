import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { AddTaskForm } from "./add-task-form";
import { LoadingSpinner } from "./ui/loading-spinner";
import { ErrorMessage } from "./ui/error-message";

function SortableTaskItem({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

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
    moveTask,
    setTasks,
  } = useBoard();

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const addColumnInputRef = useRef<HTMLInputElement>(null);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const tasksSnapshot = useRef<Task[]>([]);

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

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "task") {
      setActiveTask(active.data.current?.task as Task);
      setActiveColumnId(null);
      tasksSnapshot.current = tasks;
    } else if (type === "column") {
      setActiveColumnId(active.id as string);
      setActiveTask(null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const activeType = active.data.current?.type;
    if (activeType !== "task") return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Determine the destination column
    const overType = over.data.current?.type;
    let overColumnName: string | undefined;

    if (overType === "task") {
      const overTask = over.data.current?.task as Task | undefined;
      overColumnName = overTask?.status;
    } else {
      const col = board.columns.find((c) => c._id === overId);
      overColumnName = col?.name;
    }

    if (!overColumnName) return;

    // Find the active task's current column in state
    const activeTaskInState = tasks.find((t) => t._id === activeTaskId);
    if (!activeTaskInState) return;

    // If already in the same column, skip
    if (activeTaskInState.status === overColumnName) return;

    // Move task to the new column optimistically
    setTasks((prev) => {
      const taskIndex = prev.findIndex((t) => t._id === activeTaskId);
      if (taskIndex === -1) return prev;

      const task = prev[taskIndex];
      if (task.status === overColumnName) return prev;

      const remaining = prev.filter((t) => t._id !== activeTaskId);

      // Reindex source column
      const sourceReindexed = remaining
        .filter((t) => t.status === task.status)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }));

      // Count destination column tasks for position
      const destTasks = remaining.filter((t) => t.status === overColumnName);
      const newPosition = destTasks.length;

      const movedTask = { ...task, status: overColumnName!, position: newPosition };

      const otherTasks = remaining.filter(
        (t) => t.status !== task.status && t.status !== overColumnName,
      );

      return [...otherTasks, ...sourceReindexed, ...destTasks, movedTask];
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Clear active state
    setActiveTask(null);
    setActiveColumnId(null);

    if (!over || !board) return;

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      if (active.id === over.id) return;

      const oldIndex = board.columns.findIndex((col) => col._id === active.id);
      const newIndex = board.columns.findIndex((col) => col._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(board.columns, oldIndex, newIndex);
      const newColumnIds = newOrder.map((col) => col._id);
      reorderColumns(newColumnIds);
    } else if (activeType === "task") {
      const activeTaskId = active.id as string;

      // Determine final status and position from current tasks state
      const currentTask = tasks.find((t) => t._id === activeTaskId);
      if (!currentTask) {
        setTasks(tasksSnapshot.current);
        return;
      }

      const finalStatus = currentTask.status;

      // Compute final position
      let finalPosition: number;

      if (over.data.current?.type === "task" && over.id !== active.id) {
        const overTask = tasks.find((t) => t._id === over.id);
        if (overTask && overTask.status === finalStatus) {
          finalPosition = overTask.position;
        } else {
          finalPosition = currentTask.position;
        }
      } else {
        finalPosition = currentTask.position;
      }

      // Check if anything actually changed
      const snapshotTask = tasksSnapshot.current.find((t) => t._id === activeTaskId);
      if (
        snapshotTask &&
        snapshotTask.status === finalStatus &&
        snapshotTask.position === finalPosition
      ) {
        setTasks(tasksSnapshot.current);
        return;
      }

      // Restore snapshot and let moveTask handle the optimistic update
      setTasks(tasksSnapshot.current);
      moveTask(activeTaskId, finalStatus, finalPosition);
    }
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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => {
            const columnTasks = tasks
              .filter((t) => t.status === column.name)
              .sort((a, b) => a.position - b.position);

            const taskIds = columnTasks.map((t) => t._id);

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
                footer={<AddTaskForm columnName={column.name} />}
              >
                <SortableContext
                  items={taskIds}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map((task) => (
                    <SortableTaskItem key={task._id} task={task} />
                  ))}
                </SortableContext>
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

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-1 shadow-lg">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
