import { useState } from "react";
import type { Label } from "@taskboard/shared";
import { useBoard } from "../context/board-context";
import { ConfirmDialog } from "./ui/confirm-dialog";

function randomColor(): string {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

interface LabelManagerProps {
  onClose: () => void;
}

export function LabelManager({ onClose }: LabelManagerProps) {
  const { labels, addLabel, updateLabel, removeLabel } = useBoard();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(() => randomColor());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await addLabel(trimmed, newColor);
      setNewName("");
      setNewColor(randomColor());
    } catch {
      // addLabel throws on API failure; form stays as-is for retry
    }
  }

  function handleStartEdit(label: Label) {
    setEditingId(label._id);
    setEditName(label.name);
    setEditColor(label.color);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    const currentLabel = labels.find((l) => l._id === editingId);
    if (!currentLabel) return;
    const changes: { name?: string; color?: string } = {};
    if (trimmed !== currentLabel.name) changes.name = trimmed;
    if (editColor !== currentLabel.color) changes.color = editColor;
    if (Object.keys(changes).length === 0) {
      setEditingId(null);
      return;
    }
    try {
      await updateLabel(editingId, changes);
      setEditingId(null);
    } catch {
      // Keep edit mode open so the user can retry
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await removeLabel(confirmDeleteId);
    } catch {
      // removeLabel throws on API failure; label remains in state
    }
    setConfirmDeleteId(null);
  }

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Manage Labels</span>
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
          aria-label="Close label manager"
        >
          ×
        </button>
      </div>

      {/* Create new label form */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-gray-300"
          aria-label="New label color"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Label name"
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="New label name"
        />
        <button
          onClick={handleCreate}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create
        </button>
      </div>

      {/* Existing labels list */}
      {labels.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No labels yet</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {labels.map((label) => (
            <li key={label._id} className="flex items-center gap-2">
              {editingId === label._id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-gray-300"
                    aria-label="Edit label color"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                      if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Edit label name"
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    aria-label="Save label"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-gray-400 hover:text-gray-600"
                    aria-label="Cancel edit"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-sm text-gray-700">{label.name}</span>
                  <button
                    onClick={() => handleStartEdit(label)}
                    className="text-sm text-gray-400 hover:text-gray-600"
                    aria-label={`Edit ${label.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(label._id)}
                    className="text-sm text-red-400 hover:text-red-600"
                    aria-label={`Delete ${label.name}`}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        message="This label will be removed from all tasks. Are you sure?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
