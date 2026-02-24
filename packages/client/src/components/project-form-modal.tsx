import { useEffect, useState } from "react";
import type { Project } from "@taskboard/shared";
import { Modal } from "./ui/modal";
import { ErrorMessage } from "./ui/error-message";
import { useProjects } from "../context/projects-context";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
}

export function ProjectFormModal({ isOpen, onClose, project }: ProjectFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addProject, updateProject } = useProjects();
  const isEditMode = Boolean(project);

  useEffect(() => {
    if (!isOpen) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setError(null);
  }, [isOpen, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        await updateProject(project!._id, { name: trimmedName, description });
      } else {
        await addProject({ name: trimmedName, description });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Project" : "New Project"}>
      <form role="form" onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Project name"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional description"
          />
        </div>

        {error && <div className="mb-4"><ErrorMessage message={error} onDismiss={() => setError(null)} /></div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save" : "Create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
