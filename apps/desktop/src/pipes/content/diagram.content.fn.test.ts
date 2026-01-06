/**
 * @file diagram.content.fn.test.ts
 * @description 图表内容生成纯函数测试
 *
 * 测试覆盖：
 * - Mermaid 内容生成
 * - PlantUML 内容生成
 * - 输出格式验证
 *
 * @requirements 1.5, 2.5
 */

import { describe, expect, it } from "vitest";
import {
	generateMermaidContent,
	generatePlantUMLContent,
} from "./diagram.content.fn";

// ============================================================================
// Mermaid Content Tests
// ============================================================================

describe("generateMermaidContent", () => {
	it("应该生成有效的 Mermaid flowchart 内容", () => {
		const content = generateMermaidContent(new Date());

		expect(content).toContain("flowchart TD");
		expect(content).toContain("-->");
	});

	it("应该包含开始和结束节点", () => {
		const content = generateMermaidContent(new Date());

		expect(content).toContain("开始");
		expect(content).toContain("结束");
	});

	it("应该包含判断条件节点", () => {
		const content = generateMermaidContent(new Date());

		expect(content).toContain("{判断条件}");
	});

	it("应该对不同日期返回相同的模板", () => {
		const date1 = new Date("2024-01-01");
		const date2 = new Date("2024-12-31");

		const content1 = generateMermaidContent(date1);
		const content2 = generateMermaidContent(date2);

		expect(content1).toBe(content2);
	});

	it("应该返回非空字符串", () => {
		const content = generateMermaidContent(new Date());

		expect(content).toBeTruthy();
		expect(content.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// PlantUML Content Tests
// ============================================================================

describe("generatePlantUMLContent", () => {
	it("应该生成有效的 PlantUML 内容", () => {
		const content = generatePlantUMLContent(new Date());

		expect(content).toContain("@startuml");
		expect(content).toContain("@enduml");
	});

	it("应该包含序列图箭头", () => {
		const content = generatePlantUMLContent(new Date());

		expect(content).toContain("->");
		expect(content).toContain("-->");
	});

	it("应该包含参与者", () => {
		const content = generatePlantUMLContent(new Date());

		expect(content).toContain("Alice");
		expect(content).toContain("Bob");
	});

	it("应该对不同日期返回相同的模板", () => {
		const date1 = new Date("2024-01-01");
		const date2 = new Date("2024-12-31");

		const content1 = generatePlantUMLContent(date1);
		const content2 = generatePlantUMLContent(date2);

		expect(content1).toBe(content2);
	});

	it("应该返回非空字符串", () => {
		const content = generatePlantUMLContent(new Date());

		expect(content).toBeTruthy();
		expect(content.length).toBeGreaterThan(0);
	});

	it("应该以 @startuml 开头", () => {
		const content = generatePlantUMLContent(new Date());

		expect(content.trim().startsWith("@startuml")).toBe(true);
	});

	it("应该以 @enduml 结尾", () => {
		const content = generatePlantUMLContent(new Date());

		expect(content.trim().endsWith("@enduml")).toBe(true);
	});
});

// ============================================================================
// 纯函数特性测试
// ============================================================================

describe("纯函数特性", () => {
	it("generateMermaidContent 应该是纯函数（相同输入相同输出）", () => {
		const date = new Date("2024-06-15T10:30:00Z");

		const result1 = generateMermaidContent(date);
		const result2 = generateMermaidContent(date);

		expect(result1).toBe(result2);
	});

	it("generatePlantUMLContent 应该是纯函数（相同输入相同输出）", () => {
		const date = new Date("2024-06-15T10:30:00Z");

		const result1 = generatePlantUMLContent(date);
		const result2 = generatePlantUMLContent(date);

		expect(result1).toBe(result2);
	});
});
