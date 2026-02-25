import { useState, useRef, useEffect } from "react";
import type { Priority } from "@taskboard/shared";
import { useBoard } from "../context/board-context";

export interface FilterState {
  labels: string[];
  priorities: Priority[];
  dueDateFrom: string | null;
  dueDateTo: string | null;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function FilterBar({ onFilterChange, totalCount, filteredCount }: FilterBarProps) {
  const { labels: projectLabels } = useBoard();
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    selectedLabels.length > 0 ||
    selectedPriorities.length > 0 ||
    dueDateFrom !== "" ||
    dueDateTo !== "";

  useEffect(() => {
    if (!labelDropdownOpen && !priorityDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        labelDropdownOpen &&
        labelDropdownRef.current &&
        !labelDropdownRef.current.contains(e.target as Node)
      ) {
        setLabelDropdownOpen(false);
      }
      if (
        priorityDropdownOpen &&
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(e.target as Node)
      ) {
        setPriorityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [labelDropdownOpen, priorityDropdownOpen]);

  function handleLabelToggle(labelId: string) {
    const updated = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId];
    setSelectedLabels(updated);
    onFilterChange({
      labels: updated,
      priorities: selectedPriorities,
      dueDateFrom: dueDateFrom || null,
      dueDateTo: dueDateTo || null,
    });
  }

  function handlePriorityToggle(priority: Priority) {
    const updated = selectedPriorities.includes(priority)
      ? selectedPriorities.filter((p) => p !== priority)
      : [...selectedPriorities, priority];
    setSelectedPriorities(updated);
    onFilterChange({
      labels: selectedLabels,
      priorities: updated,
      dueDateFrom: dueDateFrom || null,
      dueDateTo: dueDateTo || null,
    });
  }

  function handleDueDateFromChange(value: string) {
    setDueDateFrom(value);
    onFilterChange({
      labels: selectedLabels,
      priorities: selectedPriorities,
      dueDateFrom: value || null,
      dueDateTo: dueDateTo || null,
    });
  }

  function handleDueDateToChange(value: string) {
    setDueDateTo(value);
    onFilterChange({
      labels: selectedLabels,
      priorities: selectedPriorities,
      dueDateFrom: dueDateFrom || null,
      dueDateTo: value || null,
    });
  }

  function handleClear() {
    setSelectedLabels([]);
    setSelectedPriorities([]);
    setDueDateFrom("");
    setDueDateTo("");
    setLabelDropdownOpen(false);
    setPriorityDropdownOpen(false);
    onFilterChange({
      labels: [],
      priorities: [],
      dueDateFrom: null,
      dueDateTo: null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
      {/* Label filter */}
      <div ref={labelDropdownRef} className="relative">
        <button
          onClick={() => setLabelDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
            selectedLabels.length > 0
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
          aria-label="Filter by label"
        >
          Labels
          {selectedLabels.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              {selectedLabels.length}
            </span>
          )}
        </button>

        {labelDropdownOpen && (
          <div className="absolute z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
            {projectLabels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No labels available
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto py-1">
                {projectLabels.map((label) => (
                  <li key={label._id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedLabels.includes(label._id)}
                        onChange={() => handleLabelToggle(label._id)}
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
          </div>
        )}
      </div>

      {/* Priority filter */}
      <div ref={priorityDropdownRef} className="relative">
        <button
          onClick={() => setPriorityDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
            selectedPriorities.length > 0
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
          aria-label="Filter by priority"
        >
          Priority
          {selectedPriorities.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              {selectedPriorities.length}
            </span>
          )}
        </button>

        {priorityDropdownOpen && (
          <div className="absolute z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg">
            <ul className="py-1">
              {PRIORITY_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(opt.value)}
                      onChange={() => handlePriorityToggle(opt.value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Due date range filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Due:</span>
        <input
          type="date"
          value={dueDateFrom}
          onChange={(e) => handleDueDateFromChange(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Due date from"
        />
        <span className="text-sm text-gray-400">–</span>
        <input
          type="date"
          value={dueDateTo}
          onChange={(e) => handleDueDateToChange(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Due date to"
        />
      </div>

      {/* Clear filters + count summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">
            Showing {filteredCount} of {totalCount} tasks
          </span>
          <button
            onClick={handleClear}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
