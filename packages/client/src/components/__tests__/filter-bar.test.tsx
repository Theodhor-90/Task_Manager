import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "../filter-bar";
import type { Label } from "@taskboard/shared";

vi.mock("../../context/board-context");

import { useBoard } from "../../context/board-context";

const mockLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label3", name: "Enhancement", color: "#10b981", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

function renderFilterBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  vi.mocked(useBoard).mockReturnValue({ labels: mockLabels } as any);
  const onFilterChange = vi.fn();
  const props = {
    onFilterChange,
    totalCount: 12,
    filteredCount: 12,
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return { onFilterChange };
}

describe("FilterBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label, priority, and due date filter controls", () => {
    renderFilterBar();

    expect(screen.getByLabelText("Filter by label")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Due date from")).toBeInTheDocument();
    expect(screen.getByLabelText("Due date to")).toBeInTheDocument();
  });

  it("does not show clear button or count when no filters are active", () => {
    renderFilterBar();

    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("opens label dropdown and shows all project labels", () => {
    renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by label"));

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Enhancement")).toBeInTheDocument();
  });

  it("toggling a label checkbox calls onFilterChange with label added", () => {
    const { onFilterChange } = renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by label"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Toggle Bug

    expect(onFilterChange).toHaveBeenCalledWith({
      labels: ["label1"],
      priorities: [],
      dueDateFrom: null,
      dueDateTo: null,
    });
  });

  it("toggling a label checkbox off calls onFilterChange with label removed", () => {
    const { onFilterChange } = renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by label"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Toggle Bug on
    fireEvent.click(checkboxes[0]); // Toggle Bug off

    expect(onFilterChange).toHaveBeenLastCalledWith({
      labels: [],
      priorities: [],
      dueDateFrom: null,
      dueDateTo: null,
    });
  });

  it("shows badge count on label button when labels are selected", () => {
    renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by label"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Toggle Bug

    expect(screen.getByLabelText("Filter by label")).toHaveTextContent("Labels1");
  });

  it("opens priority dropdown and shows all priority options", () => {
    renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by priority"));

    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("toggling a priority checkbox calls onFilterChange with priority added", () => {
    const { onFilterChange } = renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by priority"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Toggle Low

    expect(onFilterChange).toHaveBeenCalledWith({
      labels: [],
      priorities: ["low"],
      dueDateFrom: null,
      dueDateTo: null,
    });
  });

  it("setting due date from calls onFilterChange", () => {
    const { onFilterChange } = renderFilterBar();

    fireEvent.change(screen.getByLabelText("Due date from"), {
      target: { value: "2026-01-01" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      labels: [],
      priorities: [],
      dueDateFrom: "2026-01-01",
      dueDateTo: null,
    });
  });

  it("setting due date to calls onFilterChange", () => {
    const { onFilterChange } = renderFilterBar();

    fireEvent.change(screen.getByLabelText("Due date to"), {
      target: { value: "2026-03-31" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      labels: [],
      priorities: [],
      dueDateFrom: null,
      dueDateTo: "2026-03-31",
    });
  });

  it("shows task count summary when filters are active", () => {
    renderFilterBar({ totalCount: 12, filteredCount: 5 });

    fireEvent.change(screen.getByLabelText("Due date from"), {
      target: { value: "2026-01-01" },
    });

    expect(screen.getByText("Showing 5 of 12 tasks")).toBeInTheDocument();
  });

  it("clear filters resets all filters and calls onFilterChange", () => {
    const { onFilterChange } = renderFilterBar();

    fireEvent.change(screen.getByLabelText("Due date from"), {
      target: { value: "2026-01-01" },
    });

    fireEvent.click(screen.getByText("Clear filters"));

    expect(onFilterChange).toHaveBeenLastCalledWith({
      labels: [],
      priorities: [],
      dueDateFrom: null,
      dueDateTo: null,
    });

    expect(screen.getByLabelText("Due date from")).toHaveValue("");
    expect(screen.getByLabelText("Due date to")).toHaveValue("");
  });

  it("closes label dropdown when clicking outside", () => {
    renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by label"));
    expect(screen.getByText("Bug")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("closes priority dropdown when clicking outside", () => {
    renderFilterBar();

    fireEvent.click(screen.getByLabelText("Filter by priority"));
    expect(screen.getByText("Low")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
  });

  it("handles empty project labels list in label filter", () => {
    vi.mocked(useBoard).mockReturnValue({ labels: [] } as any);
    const onFilterChange = vi.fn();
    render(<FilterBar onFilterChange={onFilterChange} totalCount={5} filteredCount={5} />);

    fireEvent.click(screen.getByLabelText("Filter by label"));
    expect(screen.getByText("No labels available")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
