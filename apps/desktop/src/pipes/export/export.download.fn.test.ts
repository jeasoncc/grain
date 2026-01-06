/**
 * @file export.download.fn.test.ts
 * @description 文件下载函数测试
 *
 * 由于这些函数依赖 DOM API，测试通过完全 mock document 和 URL 对象来验证行为
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DOM APIs before importing the module
const mockAnchor = {
	href: "",
	download: "",
	click: vi.fn(),
	remove: vi.fn(),
};

const mockCreateElement = vi.fn(() => mockAnchor);
const mockAppendChild = vi.fn(() => mockAnchor);
const mockCreateObjectURL = vi.fn(() => "blob:test-url");
const mockRevokeObjectURL = vi.fn();

// Setup global mocks
vi.stubGlobal("document", {
	createElement: mockCreateElement,
	body: {
		appendChild: mockAppendChild,
	},
});

vi.stubGlobal("URL", {
	createObjectURL: mockCreateObjectURL,
	revokeObjectURL: mockRevokeObjectURL,
});

// Import after mocking
import { triggerBlobDownload, triggerDownload } from "./export.download.fn";

describe("triggerDownload", () => {
	beforeEach(() => {
		// Reset mock state
		mockAnchor.href = "";
		mockAnchor.download = "";
		mockAnchor.click.mockClear();
		mockAnchor.remove.mockClear();
		mockCreateElement.mockClear();
		mockAppendChild.mockClear();
		mockCreateObjectURL.mockClear();
		mockRevokeObjectURL.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should create an anchor element", () => {
		triggerDownload("test.json", '{"key":"value"}');

		expect(mockCreateElement).toHaveBeenCalledWith("a");
	});

	it("should set correct filename", () => {
		triggerDownload("my-file.json", "content");

		expect(mockAnchor.download).toBe("my-file.json");
	});

	it("should create blob URL and set href", () => {
		triggerDownload("test.json", "content");

		expect(mockCreateObjectURL).toHaveBeenCalled();
		expect(mockAnchor.href).toBe("blob:test-url");
	});

	it("should append anchor to body and click", () => {
		triggerDownload("test.json", "content");

		expect(mockAppendChild).toHaveBeenCalled();
		expect(mockAnchor.click).toHaveBeenCalled();
	});

	it("should cleanup after download", () => {
		triggerDownload("test.json", "content");

		expect(mockAnchor.remove).toHaveBeenCalled();
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
	});

	it("should create blob with default JSON mime type", () => {
		triggerDownload("test.json", '{"key":"value"}');

		expect(mockCreateObjectURL).toHaveBeenCalled();
		const calls = mockCreateObjectURL.mock.calls as unknown[][];
		expect(calls.length).toBeGreaterThan(0);
		const blobArg = calls[0]?.[0] as Blob | undefined;
		expect(blobArg).toBeInstanceOf(Blob);
		expect(blobArg?.type).toBe("application/json;charset=utf-8");
	});

	it("should use custom mime type when provided", () => {
		triggerDownload("test.md", "# Title", "text/markdown;charset=utf-8");

		expect(mockCreateObjectURL).toHaveBeenCalled();
		const calls = mockCreateObjectURL.mock.calls as unknown[][];
		expect(calls.length).toBeGreaterThan(0);
		const blobArg = calls[0]?.[0] as Blob | undefined;
		expect(blobArg?.type).toBe("text/markdown;charset=utf-8");
	});

	it("should handle empty content", () => {
		triggerDownload("empty.json", "");

		expect(mockCreateObjectURL).toHaveBeenCalled();
		expect(mockAnchor.click).toHaveBeenCalled();
	});
});

describe("triggerBlobDownload", () => {
	beforeEach(() => {
		// Reset mock state
		mockAnchor.href = "";
		mockAnchor.download = "";
		mockAnchor.click.mockClear();
		mockAnchor.remove.mockClear();
		mockCreateElement.mockClear();
		mockAppendChild.mockClear();
		mockCreateObjectURL.mockClear();
		mockRevokeObjectURL.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should set correct filename", () => {
		const blob = new Blob(["content"], { type: "application/zip" });
		triggerBlobDownload("archive.zip", blob);

		expect(mockAnchor.download).toBe("archive.zip");
	});

	it("should create blob URL from provided blob", () => {
		const blob = new Blob(["content"], { type: "application/zip" });
		triggerBlobDownload("archive.zip", blob);

		expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
		expect(mockAnchor.href).toBe("blob:test-url");
	});

	it("should trigger click and cleanup", () => {
		const blob = new Blob(["content"], { type: "application/zip" });
		triggerBlobDownload("archive.zip", blob);

		expect(mockAnchor.click).toHaveBeenCalled();
		expect(mockAnchor.remove).toHaveBeenCalled();
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
	});

	it("should handle different blob types", () => {
		const pdfBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
		triggerBlobDownload("document.pdf", pdfBlob);

		expect(mockCreateObjectURL).toHaveBeenCalledWith(pdfBlob);
		expect(mockAnchor.download).toBe("document.pdf");
	});

	it("should create anchor element", () => {
		const blob = new Blob(["test"], { type: "text/plain" });
		triggerBlobDownload("test.txt", blob);

		expect(mockCreateElement).toHaveBeenCalledWith("a");
	});

	it("should append anchor to body", () => {
		const blob = new Blob(["test"], { type: "text/plain" });
		triggerBlobDownload("test.txt", blob);

		expect(mockAppendChild).toHaveBeenCalled();
	});
});
