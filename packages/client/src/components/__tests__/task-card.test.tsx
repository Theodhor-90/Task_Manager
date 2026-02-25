import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task, Priority, Label } from "@taskboard/shared";

const mockLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label3", name: "Enhancement", color: "#10b981", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

vi.mock("../../context/board-context", () => ({
  useBoard: vi.fn(() => ({ labels: mockLabels })),
}));

import { TaskCard, PRIORITY_CLASSES } from "../task-card";

const baseTask: Task = {
  _id: "task1",
  title: "Implement login page",
  status: "To Do",
  priority: "medium",
  position: 0,
  labels: [],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function renderCard(
  props?: Partial<{
    task: Task;
    onClick: (taskId: string) => void;
  }>,
) {
  const defaultProps = {
    task: baseTask,
  };
  const finalProps = { ...defaultProps, ...props };
  return render(<TaskCard {...finalProps} />);
}

describe("TaskCard", () => {
  it("renders task title", () => {
    renderCard();
    expect(screen.getByText("Implement login page")).toBeInTheDocument();
  });

  it("renders priority badge with correct text", () => {
    renderCard({ task: { ...baseTask, priority: "high" } });
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders priority badge with correct color classes for each priority", () => {
    const priorities: Priority[] = ["low", "medium", "high", "urgent"];
    for (const priority of priorities) {
      const { unmount } = renderCard({
        task: { ...baseTask, priority },
      });
      const badge = screen.getByText(priority);
      const expectedClasses = PRIORITY_CLASSES[priority].split(" ");
      for (const cls of expectedClasses) {
        expect(badge.className).toContain(cls);
      }
      unmount();
    }
  });

  it("renders due date in 'MMM D' format", () => {
    renderCard({
      task: { ...baseTask, dueDate: "2025-06-15T00:00:00.000Z" },
    });
    expect(screen.getByText("Jun 15")).toBeInTheDocument();
  });

  it("renders overdue date in red", () => {
    renderCard({
      task: { ...baseTask, dueDate: "2020-01-01T00:00:00.000Z" },
    });
    const dateElement = screen.getByText("Jan 1");
    expect(dateElement.className).toContain("text-red-600");
  });

  it("renders non-overdue date without red styling", () => {
    renderCard({
      task: { ...baseTask, dueDate: "2099-12-31T00:00:00.000Z" },
    });
    const dateElement = screen.getByText("Dec 31");
    expect(dateElement.className).toContain("text-gray-500");
    expect(dateElement.className).not.toContain("text-red-600");
  });

  it("does not render due date when absent", () => {
    renderCard();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const month of months) {
      expect(screen.queryByText(new RegExp(`^${month} \\d`))).not.toBeInTheDocument();
    }
  });

  it("renders label dots when labels are present", () => {
    renderCard({
      task: { ...baseTask, labels: ["label1", "label2", "label3"] },
    });
    expect(screen.getByLabelText("Bug")).toBeInTheDocument();
    expect(screen.getByLabelText("Feature")).toBeInTheDocument();
    expect(screen.getByLabelText("Enhancement")).toBeInTheDocument();
  });

  it("does not render label dots when labels array is empty", () => {
    renderCard();
    expect(screen.queryByLabelText("Bug")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Feature")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Enhancement")).not.toBeInTheDocument();
  });

  it("calls onClick with task ID when card is clicked", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    fireEvent.click(screen.getByText("Implement login page"));
    expect(onClick).toHaveBeenCalledWith("task1");
  });

  it("does not throw when clicked without onClick handler", () => {
    renderCard();
    expect(() => {
      fireEvent.click(screen.getByText("Implement login page"));
    }).not.toThrow();
  });

  it("has role='button' and tabIndex when onClick is provided", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole("button");
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("does not have role='button' when onClick is not provided", () => {
    renderCard();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("truncates long titles with line-clamp", () => {
    renderCard({
      task: {
        ...baseTask,
        title: "This is a very long task title that should be truncated because it exceeds two lines of content",
      },
    });
    const title = screen.getByText(/This is a very long task title/);
    expect(title.className).toContain("line-clamp-2");
  });

  it("keyboard activation with Enter key", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("task1");
  });

  it("keyboard activation with Space key", () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledWith("task1");
  });

  it("renders label dots with correct colors", () => {
    renderCard({
      task: { ...baseTask, labels: ["label1", "label2"] },
    });
    const bugDot = screen.getByLabelText("Bug");
    const featureDot = screen.getByLabelText("Feature");
    expect(bugDot).toHaveStyle({ backgroundColor: "#ef4444" });
    expect(featureDot).toHaveStyle({ backgroundColor: "#3b82f6" });
  });

  it("renders label dots with title tooltip showing label name", () => {
    renderCard({
      task: { ...baseTask, labels: ["label1"] },
    });
    const dot = screen.getByLabelText("Bug");
    expect(dot).toHaveAttribute("title", "Bug");
  });

  it("skips rendering dots for missing label IDs", () => {
    renderCard({
      task: { ...baseTask, labels: ["nonexistent_id"] },
    });
    // No label dots should be rendered since the ID doesn't match any label
    expect(screen.queryByTitle("Bug")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Feature")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Enhancement")).not.toBeInTheDocument();
  });
});
