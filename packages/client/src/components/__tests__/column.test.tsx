import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Column } from "../column";
import type { Column as ColumnType } from "@taskboard/shared";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: { role: "button", tabIndex: 0 },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

const mockColumn: ColumnType = {
  _id: "col1",
  name: "To Do",
  position: 0,
};

function renderColumn(
  props?: Partial<{
    column: ColumnType;
    taskCount: number;
    onRename: (columnId: string, name: string) => Promise<void>;
    onDelete: (columnId: string) => Promise<void>;
    children: React.ReactNode;
  }>,
) {
  const defaultProps = {
    column: mockColumn,
    taskCount: 3,
    onRename: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    children: <div data-testid="task-stub">Task 1</div>,
  };
  const finalProps = { ...defaultProps, ...props };
  return { ...render(<Column {...finalProps} />), ...finalProps };
}

describe("Column", () => {
  it("renders column name", () => {
    renderColumn();
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("renders task count badge", () => {
    renderColumn({ taskCount: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders children", () => {
    renderColumn();
    expect(screen.getByTestId("task-stub")).toBeInTheDocument();
  });

  it("renders drag handle with correct aria-label", () => {
    renderColumn();
    expect(screen.getByLabelText("Drag to reorder column")).toBeInTheDocument();
  });

  it("renders delete button with correct aria-label", () => {
    renderColumn();
    expect(screen.getByLabelText("Delete column")).toBeInTheDocument();
  });

  it("double-click enters edit mode", () => {
    renderColumn();
    fireEvent.doubleClick(screen.getByText("To Do"));
    const input = screen.getByLabelText("Column name");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("To Do");
  });

  it("Enter saves rename and calls onRename", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    renderColumn({ onRename });
    fireEvent.doubleClick(screen.getByText("To Do"));
    const input = screen.getByLabelText("Column name");
    fireEvent.change(input, { target: { value: "Backlog" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith("col1", "Backlog");
    });
  });

  it("Escape cancels rename without calling onRename", () => {
    const onRename = vi.fn();
    renderColumn({ onRename });
    fireEvent.doubleClick(screen.getByText("To Do"));
    const input = screen.getByLabelText("Column name");
    fireEvent.change(input, { target: { value: "Backlog" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("rename with empty string does not call onRename", async () => {
    const onRename = vi.fn();
    renderColumn({ onRename });
    fireEvent.doubleClick(screen.getByText("To Do"));
    const input = screen.getByLabelText("Column name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).not.toHaveBeenCalled();
  });

  it("rename with unchanged name does not call onRename", async () => {
    const onRename = vi.fn();
    renderColumn({ onRename });
    fireEvent.doubleClick(screen.getByText("To Do"));
    const input = screen.getByLabelText("Column name");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).not.toHaveBeenCalled();
  });

  it("delete button opens confirm dialog", () => {
    renderColumn();
    fireEvent.click(screen.getByLabelText("Delete column"));
    expect(screen.getByText(/Are you sure you want to delete the "To Do" column/)).toBeInTheDocument();
  });

  it("confirming delete calls onDelete", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderColumn({ onDelete });
    fireEvent.click(screen.getByLabelText("Delete column"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("col1");
    });
  });

  it("cancelling delete does not call onDelete", () => {
    const onDelete = vi.fn();
    renderColumn({ onDelete });
    fireEvent.click(screen.getByLabelText("Delete column"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("delete error displays ErrorMessage", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("Cannot delete column that contains tasks"));
    renderColumn({ onDelete });
    fireEvent.click(screen.getByLabelText("Delete column"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText("Cannot delete column that contains tasks")).toBeInTheDocument();
    });
  });

  it("dismissing delete error clears it", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("Cannot delete column that contains tasks"));
    renderColumn({ onDelete });
    fireEvent.click(screen.getByLabelText("Delete column"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText("Cannot delete column that contains tasks")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByText("Cannot delete column that contains tasks")).not.toBeInTheDocument();
  });
});
