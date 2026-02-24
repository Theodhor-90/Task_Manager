import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorMessage } from "../error-message";

describe("ErrorMessage", () => {
  it("renders message text", () => {
    render(<ErrorMessage message="Test error" />);
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("has alert role", () => {
    render(<ErrorMessage message="Test error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders dismiss button when onDismiss provided", () => {
    render(<ErrorMessage message="Test error" onDismiss={() => {}} />);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("does not render dismiss button when onDismiss omitted", () => {
    render(<ErrorMessage message="Test error" />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
