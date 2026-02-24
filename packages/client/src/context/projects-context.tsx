import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Project } from "@taskboard/shared";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api/projects";
import type { CreateProjectInput, UpdateProjectInput } from "../api/projects";

interface ProjectsContextValue {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  addProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((response) => {
        setProjects(response.data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const addProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    const response = await createProject(input);
    const newProject = response.data;
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  }, []);

  const handleUpdateProject = useCallback(
    async (id: string, input: UpdateProjectInput): Promise<Project> => {
      const response = await updateProject(id, input);
      const updated = response.data;
      setProjects((prev) =>
        prev.map((p) => (p._id === id ? updated : p)),
      );
      return updated;
    },
    [],
  );

  const removeProject = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => prev.filter((p) => p._id !== id));
    try {
      await deleteProject(id);
    } catch (err) {
      try {
        const response = await fetchProjects();
        setProjects(response.data);
      } catch {
        // If re-fetch also fails, leave state as-is
      }
      throw err;
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        isLoading,
        error,
        addProject,
        updateProject: handleUpdateProject,
        removeProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
