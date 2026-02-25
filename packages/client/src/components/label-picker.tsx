import { useState, useRef, useEffect } from "react";
import type { Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";
import { LabelManager } from "./label-manager";

interface LabelPickerProps {
  taskId: string;
  labels: string[];
  onUpdate: (updatedTask: Task) => void;
}

export function LabelPicker({ taskId, labels: taskLabels, onUpdate }: LabelPickerProps) {
  const { labels: projectLabels, updateTask } = useBoard();
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleToggle(labelId: string) {
    const isAttached = taskLabels.includes(labelId);
    const updatedLabels = isAttached
      ? taskLabels.filter((id) => id !== labelId)
      : [...taskLabels, labelId];
    try {
      const updatedTask = await updateTask(taskId, { labels: updatedLabels });
      onUpdate(updatedTask);
    } catch {
      // No revert needed — checkbox reflects taskLabels prop which hasn't changed
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700">Labels</label>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        aria-label="Toggle label picker"
      >
        {taskLabels.length > 0 ? (
          <>
            {taskLabels.map((id) => {
              const label = projectLabels.find((l) => l._id === id);
              if (!label) return null;
              return (
                <span
                  key={id}
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              );
            })}
            <span className="ml-1 text-gray-500">
              {taskLabels.length} label{taskLabels.length !== 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <span className="text-gray-400">No labels</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
          {projectLabels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No labels created yet
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {projectLabels.map((label) => (
                <li key={label._id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={taskLabels.includes(label._id)}
                      onChange={() => handleToggle(label._id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-gray-700">{label.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-200 px-3 py-2">
            <button
              onClick={() => setShowManager(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage labels
            </button>
          </div>
        </div>
      )}

      {showManager && (
        <LabelManager onClose={() => setShowManager(false)} />
      )}
    </div>
  );
}
