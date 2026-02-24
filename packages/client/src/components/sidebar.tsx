import { NavLink } from "react-router-dom";
import type { Project } from "@taskboard/shared";
import { LoadingSpinner } from "./ui/loading-spinner";

interface SidebarProps {
  projects: Project[];
  isLoading: boolean;
  onCreateProject: () => void;
}

export function Sidebar({ projects, isLoading, onCreateProject }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50">
      <div className="px-4 py-5">
        <h2 className="text-lg font-bold text-gray-900">TaskBoard</h2>
      </div>
      <div className="px-3 pb-4">
        <button
          onClick={onCreateProject}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        {isLoading ? (
          <div className="py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No projects yet</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project._id}>
                <NavLink
                  to={`/projects/${project._id}/board`}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  {project.name}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
