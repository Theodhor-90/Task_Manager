import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useProjects } from "../context/projects-context";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Projects";
  if (/^\/projects\/[^/]+\/board$/.test(pathname)) return "Board";
  return "Projects";
}

export function AppLayout() {
  const location = useLocation();
  const { projects, isLoading } = useProjects();

  const handleCreateProject = () => {
    // Phase 2 will add create project modal
  };

  return (
    <div className="flex h-screen flex-col">
      <Header title={getPageTitle(location.pathname)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects}
          isLoading={isLoading}
          onCreateProject={handleCreateProject}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
