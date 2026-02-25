import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@taskboard/shared";
import { fetchTask } from "../api/tasks";
import { useBoard } from "../context/board-context";
import { LoadingSpinner } from "./ui/loading-spinner";
import { ErrorMessage } from "./ui/error-message";
import Markdown from "react-markdown";

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("preview");
  const [editDescription, setEditDescription] = useState("");

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const { updateTask } = useBoard();

  // Data loading effect
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchTask(taskId);
        if (!cancelled) {
          setTask(response.data);
          setEditDescription(response.data.description ?? "");
          setDescriptionTab(response.data.description ? "preview" : "write");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load task";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [taskId]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isEditingTitle) {
          // Cancel title editing instead of closing the panel
          setEditTitle(task?.title ?? "");
          setIsEditingTitle(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isEditingTitle, task]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Auto-focus title input on edit mode entry
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Title editing handlers
  function handleTitleClick() {
    if (!task) return;
    setEditTitle(task.title);
    setIsEditingTitle(true);
  }

  async function handleTitleSave() {
    if (!task) return;
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const updated = await updateTask(taskId, { title: trimmed });
      setTask(updated);
    } catch {
      // Revert input to current title on failure
      setEditTitle(task.title);
    }
    setIsEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    }
    // Note: Escape is handled by the document-level keydown listener
  }

  async function handleDescriptionBlur() {
    if (!task) return;
    const currentDescription = task.description ?? "";
    if (editDescription === currentDescription) return;
    try {
      const updated = await updateTask(taskId, { description: editDescription });
      setTask(updated);
    } catch {
      // Revert to current description on failure
      setEditDescription(task.description ?? "");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex"
      data-testid="task-detail-overlay"
    >
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/20"
        onClick={onClose}
        data-testid="task-detail-backdrop"
      />

      {/* Panel */}
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-medium text-gray-500">Task Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {isLoading && <LoadingSpinner />}

          {error && <ErrorMessage message={error} />}

          {!isLoading && !error && task && (
            <>
              {/* Title — inline editable */}
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleSave}
                  className="w-full rounded border border-blue-300 px-2 py-1 text-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Task title"
                />
              ) : (
                <h2
                  onClick={handleTitleClick}
                  className="cursor-pointer text-xl font-bold text-gray-900 hover:text-blue-600"
                  title="Click to edit title"
                >
                  {task.title}
                </h2>
              )}

              {/* Status label */}
              <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                {task.status}
              </span>

              {/* Description section */}
              <div className="mt-6">
                <div className="flex border-b border-gray-200">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      descriptionTab === "write"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setDescriptionTab("write")}
                  >
                    Write
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      descriptionTab === "preview"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setDescriptionTab("preview")}
                  >
                    Preview
                  </button>
                </div>

                {descriptionTab === "write" ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    className="mt-2 w-full min-h-[150px] rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Add a description..."
                    aria-label="Task description"
                  />
                ) : (
                  <div className="prose-custom mt-2 min-h-[150px] text-sm text-gray-900">
                    {editDescription.trim() ? (
                      <Markdown>{editDescription}</Markdown>
                    ) : (
                      <p className="italic text-gray-400">Add a description...</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
