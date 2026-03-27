import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ConfirmModal } from "./confirm-modal";

afterEach(() => {
  cleanup();
});

describe("ConfirmModal", () => {
  it("should not render when isOpen is false", () => {
    const { container } = render(
      <ConfirmModal
        isOpen={false}
        title="Delete item?"
        message="This action cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete item?"
        message="This action cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        confirmLabel="Yes, delete"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Yes, delete" });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        cancelLabel="No, keep it"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "No, keep it" });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should disable buttons when isProcessing is true", () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isProcessing={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Deleting..." });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should use default labels when not provided", () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
