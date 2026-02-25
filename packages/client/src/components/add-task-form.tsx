import { useState, useRef, useEffect } from "react";
import { useBoard } from "../context/board-context";

interface AddTaskFormProps {
  columnName: string;
}

export function AddTaskForm({ columnName }: AddTaskFormProps) {
  const { createTask } = useBoard();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createTask(columnName, trimmed);
      setTitle("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setError(null);
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded px-2 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-200 transition-colors"
      >
        + Add task
      </button>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setIsOpen(false);
          }
        }}
        placeholder="Enter task title..."
        disabled={isSubmitting}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        aria-label="New task title"
      />
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
