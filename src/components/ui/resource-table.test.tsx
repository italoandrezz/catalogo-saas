import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ResourceTable } from "./resource-table";

type TestItem = {
  id: string;
  name: string;
  value: number;
};

afterEach(() => {
  cleanup();
});

describe("ResourceTable", () => {
  const mockItems: TestItem[] = [
    { id: "1", name: "Item 1", value: 100 },
    { id: "2", name: "Item 2", value: 200 },
    { id: "3", name: "Item 3", value: 300 },
  ];

  it("should render table with title and columns", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
      />,
    );

    expect(screen.getByText("Test Table")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("should render all rows", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
      />,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("should display empty message when no rows", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={[]}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
      />,
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
  });

  it("should paginate rows when pageSize is provided", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.queryByText("Item 3")).not.toBeInTheDocument();
  });

  it("should navigate to next page", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1]; // Last button is "Próxima"
    fireEvent.click(nextButton);

    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("should navigate to previous page", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1]; // Last button is "Próxima"
    fireEvent.click(nextButton);

    cleanup();
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    const buttons2 = screen.getAllByRole("button");
    const nextBtn = buttons2[buttons2.length - 1]; // Próxima
    fireEvent.click(nextBtn);

    const prevBtn = buttons2[buttons2.length - 2]; // Anterior
    fireEvent.click(prevBtn);

    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("should disable previous button on first page", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[buttons.length - 2]; // Anterior
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons[buttons.length - 1]; // Próxima
    fireEvent.click(nextBtn);

    // After clicking next, the next button should be disabled
    const updatedButtons = screen.getAllByRole("button");
    const updatedNextBtn = updatedButtons[updatedButtons.length - 1];
    expect(updatedNextBtn).toBeDisabled();
  });

  it("should display pagination info", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        pageSize={2}
      />,
    );

    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
  });

  it("should use custom getRowKey function", () => {
    render(
      <ResourceTable
        title="Test Table"
        columns={["ID", "Name", "Value"]}
        rows={mockItems}
        renderRow={(item) => [item.id, item.name, String(item.value)]}
        emptyMessage="No items found"
        getRowKey={(item) => item.id}
      />,
    );

    // Check that rows exist (they use custom keys)
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });
});
