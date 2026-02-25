import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProjects } from "../context/projects-context";
import { BoardProvider, useBoard } from "../context/board-context";
import { BoardView } from "../components/board-view";
import { LoadingSpinner } from "../components/ui/loading-spinner";

function BoardContent({ projectId }: { projectId: string }) {
  const { loadBoard } = useBoard();

  useEffect(() => {
    loadBoard(projectId);
  }, [projectId, loadBoard]);

  return <BoardView />;
}

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
    <BoardProvider>
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{project.name}</h2>
        <BoardContent projectId={project._id} />
      </div>
    </BoardProvider>
  );
}
