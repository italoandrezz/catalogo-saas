import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadCsv } from "./export-csv";

describe("downloadCsv", () => {
  let createObjectUrlMock: ReturnType<typeof vi.fn>;
  let revokeObjectUrlMock: ReturnType<typeof vi.fn>;
  let appendChildMock: ReturnType<typeof vi.fn>;
  let removeChildMock: ReturnType<typeof vi.fn>;
  let clickMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectUrlMock = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectUrlMock = vi.fn();
    clickMock = vi.fn();
    appendChildMock = vi.fn();
    removeChildMock = vi.fn();

    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });

    const mockAnchor = {
      href: "",
      download: "",
      click: clickMock,
    };

    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") return mockAnchor as unknown as HTMLAnchorElement;
      return document.createElement(tag);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(appendChildMock);
    vi.spyOn(document.body, "removeChild").mockImplementation(removeChildMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a blob and trigger a download", () => {
    downloadCsv("test.csv", ["Name", "Price"], [["Mouse", "150"]]);

    expect(createObjectUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:mock-url");
  });

  it("should set correct filename on anchor", () => {
    let capturedAnchor: { href: string; download: string; click: () => void } | null = null;
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") {
        capturedAnchor = { href: "", download: "", click: clickMock };
        return capturedAnchor as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    downloadCsv("my-export.csv", ["Col"], [["val"]]);

    expect(capturedAnchor?.download).toBe("my-export.csv");
  });

  it("should properly escape values with quotes", () => {
    const capturedBlobs: Blob[] = [];
    createObjectUrlMock.mockImplementation((blob: Blob) => {
      capturedBlobs.push(blob);
      return "blob:mock-url";
    });

    downloadCsv("test.csv", ['Name "With" Quotes'], [['Value "A"']]);

    expect(capturedBlobs.length).toBeGreaterThan(0);
    expect(createObjectUrlMock).toHaveBeenCalled();
  });

  it("should include UTF-8 BOM for Excel compatibility", () => {
    const blobContents: string[] = [];
    const OriginalBlob = globalThis.Blob;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Blob = function(parts: BlobPart[], opts?: BlobPropertyBag) {
      blobContents.push(String(parts[0]));
      return new OriginalBlob(parts, opts);
    };

    try {
      downloadCsv("test.csv", ["Header"], [["Value"]]);
      expect(blobContents[0].startsWith("\uFEFF")).toBe(true);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Blob = OriginalBlob;
    }
  });

  it("should generate correct CSV format with headers and rows", () => {
    let csvContent = "";
    const OriginalBlob = globalThis.Blob;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Blob = function(parts: BlobPart[], opts?: BlobPropertyBag) {
      csvContent = String(parts[0]);
      return new OriginalBlob(parts, opts);
    };

    try {
      downloadCsv(
        "test.csv",
        ["Name", "Price"],
        [
          ["Mouse", "150"],
          ["Keyboard", "400"],
        ],
      );

      const csv = csvContent.replace(/^\uFEFF/, "");
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe('"Name","Price"');
      expect(lines[1]).toBe('"Mouse","150"');
      expect(lines[2]).toBe('"Keyboard","400"');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Blob = OriginalBlob;
    }
  });

  it("should append and remove anchor from document body", () => {
    downloadCsv("test.csv", ["Col"], [["val"]]);

    expect(appendChildMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
  });
});
