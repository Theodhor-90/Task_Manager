import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingSpinner } from "../loading-spinner";

describe("LoadingSpinner", () => {
  it("renders with default size", () => {
    render(<LoadingSpinner />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("h-8", "w-8");
  });

  it("renders with sm size", () => {
    render(<LoadingSpinner size="sm" />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("h-4", "w-4");
  });

  it("renders with lg size", () => {
    render(<LoadingSpinner size="lg" />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("h-12", "w-12");
  });

  it("has accessible role", () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has animate-spin class", () => {
    render(<LoadingSpinner />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("animate-spin");
  });
});
