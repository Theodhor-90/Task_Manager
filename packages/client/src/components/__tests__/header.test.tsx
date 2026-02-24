import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "../header";

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

describe("Header", () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it("renders the page title", () => {
    render(<Header title="Projects" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projects");
  });

  it("renders the user display name", () => {
    render(<Header title="Projects" />);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("renders the logout button", () => {
    render(<Header title="Projects" />);
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });

  it("calls logout when logout button is clicked", () => {
    render(<Header title="Projects" />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders with different title", () => {
    render(<Header title="Board — My Project" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Board — My Project");
  });
});
