import { useParams } from "react-router-dom";
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const project = projects.find((p) => p._id === id);

  if (!project) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">{project.name}</h2>
      <div className="mt-6 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">Board coming in Milestone 4</p>
      </div>
    </div>
  );
}
