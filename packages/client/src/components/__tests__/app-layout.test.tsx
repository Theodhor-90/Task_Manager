import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppLayout } from "../app-layout";
import type { Project } from "@taskboard/shared";

const mockProjects: Project[] = [
  {
    _id: "proj1",
    name: "Project Alpha",
    owner: "user1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const mockLogout = vi.fn();

vi.mock("../../context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@test.com", name: "Admin User" },
    token: "mock-token",
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

const mockUseProjects = vi.fn();
vi.mock("../../context/projects-context", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

function renderAppLayout(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div data-testid="dashboard">Dashboard Content</div>} />
          <Route path="/projects/:id/board" element={<div data-testid="board">Board Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    mockUseProjects.mockReturnValue({
      projects: mockProjects,
      isLoading: false,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
    });
  });

  it('renders the Header with page title "Projects" on root route', () => {
    renderAppLayout(["/"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projects");
  });

  it('renders the Header with page title "Board" on board route', () => {
    renderAppLayout(["/projects/abc/board"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Board");
  });

  it("renders the Sidebar with branding", () => {
    renderAppLayout();
    expect(screen.getByText("TaskBoard")).toBeInTheDocument();
  });

  it("renders the Sidebar with project list", () => {
    renderAppLayout();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  });

  it('renders the Sidebar "New Project" button', () => {
    renderAppLayout();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("renders child route content via Outlet", () => {
    renderAppLayout(["/"]);
    expect(screen.getByTestId("dashboard")).toHaveTextContent("Dashboard Content");
  });

  it("renders board page content via Outlet", () => {
    renderAppLayout(["/projects/abc/board"]);
    expect(screen.getByTestId("board")).toHaveTextContent("Board Content");
  });

  it("renders user name in the Header", () => {
    renderAppLayout();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("shows loading spinner in Sidebar when projects are loading", () => {
    mockUseProjects.mockReturnValue({
      projects: [],
      isLoading: true,
      error: null,
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
    });
    renderAppLayout();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it('opens create project modal when sidebar "New Project" button is clicked', () => {
    renderAppLayout();
    const newProjectButton = screen.getByRole("button", { name: "New Project" });
    fireEvent.click(newProjectButton);
    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
  });

  it("closes create project modal when Cancel is clicked", () => {
    renderAppLayout();
    fireEvent.click(screen.getByRole("button", { name: "New Project" }));
    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "New Project" })).not.toBeInTheDocument();
  });

  it("sidebar create button works on board route", () => {
    renderAppLayout(["/projects/abc/board"]);
    const newProjectButton = screen.getByRole("button", { name: "New Project" });
    fireEvent.click(newProjectButton);
    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
  });
});
