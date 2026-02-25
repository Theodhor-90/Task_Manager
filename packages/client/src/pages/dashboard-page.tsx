import { useState } from "react";
import type { Project } from "@taskboard/shared";
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ErrorMessage } from "../components/ui/error-message";
import { ProjectFormModal } from "../components/project-form-modal";
import { ProjectCard } from "../components/project-card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";

export function DashboardPage() {
  const { projects, isLoading, error, removeProject } = useProjects();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm() {
    if (!deletingProject) return;
    const projectToDelete = deletingProject;
    setDeletingProject(null);
    setDeleteError(null);
    try {
      await removeProject(projectToDelete._id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Projects</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {deleteError && (
        <div className="mb-4">
          <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      )}

      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={(p) => setEditingProject(p)}
              onDelete={(p) => setDeletingProject(p)}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <ProjectFormModal
        isOpen={editingProject !== null}
        onClose={() => setEditingProject(null)}
        project={editingProject ?? undefined}
      />

      <ConfirmDialog
        isOpen={deletingProject !== null}
        message={`Are you sure you want to delete "${deletingProject?.name}"? All boards, tasks, comments, and labels in this project will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
}
