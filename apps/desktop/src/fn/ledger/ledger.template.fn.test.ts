/**
 * @file ledger.template.fn.test.ts
 * @description 记账模板生成函数测试
 */

import { describe, expect, it } from "vitest";
import {
	generateLedgerContent,
	getLedgerFolderStructure,
} from "./ledger.template.fn";

describe("getLedgerFolderStructure", () => {
	it("应该生成正确的文件夹结构", () => {
		const date = new Date("2024-12-25T10:30:00");
		const structure = getLedgerFolderStructure(date);

		expect(structure.yearFolder).toBe("year-2024");
		expect(structure.monthFolder).toBe("month-12-December");
		expect(structure.filename).toBe("ledger-2024-12-25");
	});

	it("应该正确处理月份补零", () => {
		const date = new Date("2024-03-05T10:30:00");
		const structure = getLedgerFolderStructure(date);

		expect(structure.monthFolder).toBe("month-03-March");
		expect(structure.filename).toBe("ledger-2024-03-05");
	});

	it("应该使用当前日期作为默认值", () => {
		const structure = getLedgerFolderStructure();
		const now = new Date();

		expect(structure.yearFolder).toContain(`year-${now.getFullYear()}`);
	});
});

describe("generateLedgerContent", () => {
	it("应该生成有效的 JSON", () => {
		const date = new Date("2024-12-25T10:30:00");
		const content = generateLedgerContent(date);

		expect(() => JSON.parse(content)).not.toThrow();
	});

	it("应该包含 ledger 标签", () => {
		const date = new Date("2024-12-25T10:30:00");
		const content = generateLedgerContent(date);
		const parsed = JSON.parse(content);

		const firstParagraph = parsed.root.children[0];
		const tagNode = firstParagraph.children[0];

		expect(tagNode.type).toBe("tag");
		expect(tagNode.tagName).toBe("ledger");
	});

	it("应该包含日期标签", () => {
		const date = new Date("2024-12-25T10:30:00");
		const content = generateLedgerContent(date);
		const parsed = JSON.parse(content);

		const firstParagraph = parsed.root.children[0];
		const dateTagNode = firstParagraph.children[2];

		expect(dateTagNode.type).toBe("tag");
		expect(dateTagNode.tagName).toBe("2024-12-25");
	});

	it("应该包含标题", () => {
		const date = new Date("2024-12-25T10:30:00");
		const content = generateLedgerContent(date);
		const parsed = JSON.parse(content);

		// 第三个元素是 H2 标题
		const titleHeading = parsed.root.children[2];

		expect(titleHeading.type).toBe("heading");
		expect(titleHeading.tag).toBe("h2");
		expect(titleHeading.children[0].text).toContain("December 25, 2024");
		expect(titleHeading.children[0].text).toContain("Ledger");
	});

	it("应该包含 Income 区域", () => {
		const content = generateLedgerContent();
		const parsed = JSON.parse(content);

		const incomeHeading = parsed.root.children.find(
			(node: { type: string; children?: Array<{ text: string }> }) =>
				node.type === "heading" && node.children?.[0]?.text === "Income",
		);

		expect(incomeHeading).toBeDefined();
	});

	it("应该包含 Expenses 区域", () => {
		const content = generateLedgerContent();
		const parsed = JSON.parse(content);

		const expensesHeading = parsed.root.children.find(
			(node: { type: string; children?: Array<{ text: string }> }) =>
				node.type === "heading" && node.children?.[0]?.text === "Expenses",
		);

		expect(expensesHeading).toBeDefined();
	});

	it("应该包含 Summary 区域", () => {
		const content = generateLedgerContent();
		const parsed = JSON.parse(content);

		const summaryHeading = parsed.root.children.find(
			(node: { type: string; children?: Array<{ text: string }> }) =>
				node.type === "heading" && node.children?.[0]?.text === "Summary",
		);

		expect(summaryHeading).toBeDefined();
	});

	it("应该包含 Notes 区域", () => {
		const content = generateLedgerContent();
		const parsed = JSON.parse(content);

		const notesHeading = parsed.root.children.find(
			(node: { type: string; children?: Array<{ text: string }> }) =>
				node.type === "heading" && node.children?.[0]?.text === "Notes",
		);

		expect(notesHeading).toBeDefined();
	});

	it("应该包含列表项", () => {
		const content = generateLedgerContent();
		const parsed = JSON.parse(content);

		const listItems = parsed.root.children.filter(
			(node: { type: string }) => node.type === "listitem",
		);

		// 应该有 4 个列表项：1 个收入 + 1 个支出 + 3 个汇总
		expect(listItems.length).toBe(5);
	});
});
