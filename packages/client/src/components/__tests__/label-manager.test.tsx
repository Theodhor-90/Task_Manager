import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LabelManager } from "../label-manager";
import type { Label } from "@taskboard/shared";

vi.mock("../../context/board-context");
vi.mock("../ui/confirm-dialog", () => ({
  ConfirmDialog: ({ isOpen, message, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

import { useBoard } from "../../context/board-context";

const mockLabels: Label[] = [
  { _id: "label1", name: "Bug", color: "#ef4444", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
  { _id: "label2", name: "Feature", color: "#3b82f6", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" },
];

function setupMocks(overrides: Partial<ReturnType<typeof useBoard>> = {}) {
  const mocks = {
    labels: mockLabels,
    addLabel: vi.fn().mockResolvedValue({ _id: "label3", name: "New", color: "#000000", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" }),
    updateLabel: vi.fn().mockResolvedValue({ _id: "label1", name: "Updated", color: "#000000", project: "proj1", createdAt: "2025-01-01T00:00:00.000Z" }),
    removeLabel: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  vi.mocked(useBoard).mockReturnValue(mocks as any);
  return mocks;
}

describe("LabelManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with close button", () => {
    setupMocks();
    const onClose = vi.fn();
    render(<LabelManager onClose={onClose} />);

    expect(screen.getByText("Manage Labels")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close label manager"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders create form with color input and name input", () => {
    setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    expect(screen.getByLabelText("New label color")).toBeInTheDocument();
    expect(screen.getByLabelText("New label name")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("displays existing labels with color swatch and name", () => {
    setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit Bug")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete Bug")).toBeInTheDocument();
  });

  it("shows empty state when no labels exist", () => {
    setupMocks({ labels: [] });
    render(<LabelManager onClose={vi.fn()} />);

    expect(screen.getByText("No labels yet")).toBeInTheDocument();
  });

  it("creates a new label and resets the form", async () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    const nameInput = screen.getByLabelText("New label name");
    fireEvent.change(nameInput, { target: { value: "Urgent" } });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mocks.addLabel).toHaveBeenCalledWith("Urgent", expect.stringMatching(/^#[0-9a-f]{6}$/));
    });

    // Form resets after successful create
    await waitFor(() => {
      expect(nameInput).toHaveValue("");
    });
  });

  it("creates a label on Enter key in name input", async () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    const nameInput = screen.getByLabelText("New label name");
    fireEvent.change(nameInput, { target: { value: "Hotfix" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });

    await waitFor(() => {
      expect(mocks.addLabel).toHaveBeenCalledWith("Hotfix", expect.any(String));
    });
  });

  it("does not create a label with empty name", () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("Create"));

    expect(mocks.addLabel).not.toHaveBeenCalled();
  });

  it("enters edit mode showing name and color inputs", () => {
    setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Edit Bug"));

    expect(screen.getByLabelText("Edit label name")).toHaveValue("Bug");
    expect(screen.getByLabelText("Edit label color")).toHaveValue("#ef4444");
    expect(screen.getByLabelText("Save label")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel edit")).toBeInTheDocument();
  });

  it("saves edited label and exits edit mode", async () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Edit Bug"));
    fireEvent.change(screen.getByLabelText("Edit label name"), { target: { value: "Critical Bug" } });
    fireEvent.click(screen.getByLabelText("Save label"));

    await waitFor(() => {
      expect(mocks.updateLabel).toHaveBeenCalledWith("label1", { name: "Critical Bug" });
    });

    // Exits edit mode
    await waitFor(() => {
      expect(screen.queryByLabelText("Edit label name")).not.toBeInTheDocument();
    });
  });

  it("cancels edit mode without saving", () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Edit Bug"));
    fireEvent.change(screen.getByLabelText("Edit label name"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByLabelText("Cancel edit"));

    expect(mocks.updateLabel).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Edit label name")).not.toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("cancels edit mode on Escape key", () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Edit Bug"));
    fireEvent.keyDown(screen.getByLabelText("Edit label name"), { key: "Escape" });

    expect(mocks.updateLabel).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Edit label name")).not.toBeInTheDocument();
  });

  it("shows confirm dialog and deletes label on confirm", async () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Delete Bug"));

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText("This label will be removed from all tasks. Are you sure?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mocks.removeLabel).toHaveBeenCalledWith("label1");
    });
  });

  it("cancels delete confirmation without deleting", () => {
    const mocks = setupMocks();
    render(<LabelManager onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Delete Bug"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    expect(mocks.removeLabel).not.toHaveBeenCalled();
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });
});
