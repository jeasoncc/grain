/**
 * @file fn/export/export.json.fn.test.ts
 * @description JSON 导出函数的单元测试
 */

import * as E from "fp-ts/Either";
import { describe, expect, it } from "vitest";
import {
	createDocument,
	createHeadingNode,
	createParagraphNode,
	createTextNode,
} from "../content/content.generate.fn";
import {
	createExportDocument,
	exportMultipleToJson,
	exportRawJson,
	exportToJson,
	parseLexicalContent,
	serializeToJson,
} from "./export.json.fn";

describe("export.json.fn", () => {
	// ==============================
	// Test Data
	// ==============================

	const createTestDocument = () =>
		createDocument([
			createParagraphNode([createTextNode("Hello World")]),
			createHeadingNode("Test Title", "h2"),
		]);

	const createTestContent = () => JSON.stringify(createTestDocument());

	// ==============================
	// parseLexicalContent Tests
	// ==============================

	describe("parseLexicalContent", () => {
		it("should parse valid Lexical JSON", () => {
			const content = createTestContent();
			const result = parseLexicalContent(content);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.root).toBeDefined();
				expect(result.right.root.type).toBe("root");
			}
		});

		it("should return error for empty content", () => {
			const result = parseLexicalContent("");

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("INVALID_CONTENT");
			}
		});

		it("should return error for invalid JSON", () => {
			const result = parseLexicalContent("not valid json");

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("PARSE_ERROR");
			}
		});

		it("should return error for JSON without root", () => {
			const result = parseLexicalContent('{"data": "test"}');

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("INVALID_CONTENT");
				expect(result.left.message).toContain("root");
			}
		});
	});

	// ==============================
	// serializeToJson Tests
	// ==============================

	describe("serializeToJson", () => {
		it("should serialize with pretty formatting by default", () => {
			const doc = createTestDocument();
			const result = serializeToJson(doc);

			expect(result).toContain("\n");
			expect(result).toContain("  ");
		});

		it("should serialize without formatting when pretty is false", () => {
			const doc = createTestDocument();
			const result = serializeToJson(doc, { pretty: false });

			expect(result).not.toContain("\n  ");
		});

		it("should use custom indent", () => {
			const doc = createTestDocument();
			const result = serializeToJson(doc, { pretty: true, indent: 4 });

			expect(result).toContain("    ");
		});
	});

	// ==============================
	// createExportDocument Tests
	// ==============================

	describe("createExportDocument", () => {
		it("should create export document with metadata", () => {
			const doc = createTestDocument();
			const result = createExportDocument(doc, {
				title: "Test Document",
				author: "Test Author",
			});

			expect(result.metadata.title).toBe("Test Document");
			expect(result.metadata.author).toBe("Test Author");
			expect(result.metadata.exportedAt).toBeDefined();
			expect(result.content).toEqual(doc);
		});

		it("should add exportedAt timestamp automatically", () => {
			const doc = createTestDocument();
			const result = createExportDocument(doc);

			expect(result.metadata.exportedAt).toBeDefined();
		});

		it("should preserve provided exportedAt", () => {
			const doc = createTestDocument();
			const customDate = "2024-01-01T00:00:00.000Z";
			const result = createExportDocument(doc, { exportedAt: customDate });

			expect(result.metadata.exportedAt).toBe(customDate);
		});
	});

	// ==============================
	// exportToJson Tests
	// ==============================

	describe("exportToJson", () => {
		it("should export valid content to JSON", () => {
			const content = createTestContent();
			const result = exportToJson(content);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.root).toBeDefined();
			}
		});

		it("should include metadata when option is set", () => {
			const content = createTestContent();
			const result = exportToJson(content, {
				includeMetadata: true,
				metadata: { title: "Test" },
			});

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.metadata).toBeDefined();
				expect(parsed.metadata.title).toBe("Test");
				expect(parsed.content).toBeDefined();
			}
		});

		it("should return error for invalid content", () => {
			const result = exportToJson("invalid");

			expect(E.isLeft(result)).toBe(true);
		});

		it("should respect pretty option", () => {
			const content = createTestContent();
			const prettyResult = exportToJson(content, { pretty: true });
			const compactResult = exportToJson(content, { pretty: false });

			expect(E.isRight(prettyResult)).toBe(true);
			expect(E.isRight(compactResult)).toBe(true);

			if (E.isRight(prettyResult) && E.isRight(compactResult)) {
				expect(prettyResult.right.length).toBeGreaterThan(
					compactResult.right.length,
				);
			}
		});
	});

	// ==============================
	// exportRawJson Tests
	// ==============================

	describe("exportRawJson", () => {
		it("should export raw JSON without metadata", () => {
			const content = createTestContent();
			const result = exportRawJson(content);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.root).toBeDefined();
				expect(parsed.metadata).toBeUndefined();
			}
		});

		it("should format output when pretty is true", () => {
			const content = createTestContent();
			const result = exportRawJson(content, { pretty: true });

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toContain("\n");
			}
		});
	});

	// ==============================
	// exportMultipleToJson Tests
	// ==============================

	describe("exportMultipleToJson", () => {
		it("should export multiple documents", () => {
			const contents = [
				{ id: "1", content: createTestContent() },
				{ id: "2", content: createTestContent() },
			];
			const result = exportMultipleToJson(contents);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.documents).toHaveLength(2);
				expect(parsed.documents[0].id).toBe("1");
				expect(parsed.documents[1].id).toBe("2");
			}
		});

		it("should include metadata when option is set", () => {
			const contents = [{ id: "1", content: createTestContent() }];
			const result = exportMultipleToJson(contents, {
				includeMetadata: true,
				metadata: { title: "Collection" },
			});

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.metadata).toBeDefined();
				expect(parsed.metadata.title).toBe("Collection");
				expect(parsed.metadata.count).toBe(1);
			}
		});

		it("should return error if any content is invalid", () => {
			const contents = [
				{ id: "1", content: createTestContent() },
				{ id: "2", content: "invalid" },
			];
			const result = exportMultipleToJson(contents);

			expect(E.isLeft(result)).toBe(true);
		});

		it("should handle empty array", () => {
			const result = exportMultipleToJson([]);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.documents).toHaveLength(0);
			}
		});
	});
});
