import type { Label, Priority, Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";

interface TaskCardProps {
  task: Task;
  onClick?: (taskId: string) => void;
}

export const PRIORITY_CLASSES: Record<Priority, string> = {
  low: "bg-gray-200 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(isoDate: string): boolean {
  const due = new Date(isoDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { labels } = useBoard();
  const labelMap = new Map<string, Label>(labels.map((l) => [l._id, l]));

  return (
    <div
      className="mb-2 cursor-pointer rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onClick?.(task._id)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(task._id);
              }
            }
          : undefined
      }
    >
      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[task.priority]}`}
        >
          {task.priority}
        </span>

        {task.labels.length > 0 && (
          <div className="flex gap-1">
            {task.labels.map((labelId) => {
              const label = labelMap.get(labelId);
              if (!label) return null;
              return (
                <span
                  key={labelId}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                  aria-label={label.name}
                />
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {task.dueDate && (
          <span
            className={`text-xs ${
              isOverdue(task.dueDate)
                ? "text-red-600 font-medium"
                : "text-gray-500"
            }`}
          >
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
