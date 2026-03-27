import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SuccessModal } from "./success-modal";

afterEach(() => {
  cleanup();
});

describe("SuccessModal", () => {
  it("should not render when isOpen is false", () => {
    const { container } = render(
      <SuccessModal
        isOpen={false}
        title="Success!"
        message="Action completed."
        onConfirm={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(
      <SuccessModal
        isOpen={true}
        title="Success!"
        message="Action completed successfully."
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(
      screen.getByText("Action completed successfully."),
    ).toBeInTheDocument();
  });

  it("should call onConfirm when button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <SuccessModal
        isOpen={true}
        title="Success!"
        message="Done."
        confirmLabel="Continue"
        onConfirm={onConfirm}
      />,
    );

    const button = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(button);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should use default label when not provided", () => {
    render(
      <SuccessModal
        isOpen={true}
        title="Success!"
        message="Done."
        onConfirm={() => {}}
      />,
    );

    expect(screen.queryAllByRole("button").some((btn) => btn.textContent === "OK")).toBe(true);
  });
});
