import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column as ColumnType, Task } from "@taskboard/shared";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { ErrorMessage } from "./ui/error-message";

interface ColumnProps {
  column: ColumnType;
  taskCount: number;
  onRename: (columnId: string, name: string) => Promise<void>;
  onDelete: (columnId: string) => Promise<void>;
  children: ReactNode;
  footer?: ReactNode;
}

export function Column({ column, taskCount, onRename, onDelete, children, footer }: ColumnProps) {
  // --- dnd-kit sortable ---
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column._id, data: { type: "column" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // --- inline rename state ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- delete state ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // --- handlers ---
  function handleDoubleClick() {
    setEditName(column.name);
    setIsEditing(true);
  }

  async function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === column.name) {
      setIsEditing(false);
      return;
    }
    try {
      await onRename(column._id, trimmed);
    } catch {
      // Rename failed — revert to original
      setEditName(column.name);
    }
    setIsEditing(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditName(column.name);
      setIsEditing(false);
    }
  }

  async function handleDelete() {
    setShowConfirm(false);
    setDeleteError(null);
    try {
      await onDelete(column._id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete column";
      setDeleteError(message);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-72 flex-shrink-0 flex-col rounded-lg bg-gray-100 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder column"
        >
          {/* Grip icon SVG — 6-dot grip pattern */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Column name: editable or static */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            className="min-w-0 flex-1 rounded border border-blue-300 px-1 py-0.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Column name"
          />
        ) : (
          <h3
            onDoubleClick={handleDoubleClick}
            className="flex-1 cursor-pointer truncate text-sm font-semibold text-gray-900"
            title="Double-click to rename"
          >
            {column.name}
          </h3>
        )}

        {/* Task count badge */}
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
          {taskCount}
        </span>

        {/* Delete button */}
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
          aria-label="Delete column"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.78.72l.5 6a.75.75 0 01-1.5.12l-.5-6a.75.75 0 01.72-.78zm2.06.72a.75.75 0 011.5-.12l.5 6a.75.75 0 11-1.5.12l-.5-6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="px-3 pb-2">
          <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      )}

      {/* Task list — scrollable */}
      <div className="min-h-[2rem] flex-1 overflow-y-auto px-3 pb-3">
        {children}
      </div>

      {/* Footer (e.g., AddTaskForm) */}
      {footer && (
        <div className="px-3 pb-3">
          {footer}
        </div>
      )}

      {/* Confirm dialog for delete */}
      <ConfirmDialog
        isOpen={showConfirm}
        message={`Are you sure you want to delete the "${column.name}" column?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
