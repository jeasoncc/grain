/**
 * Monaco Editor 导入验证测试
 *
 * 验证 @monaco-editor/react 包可以正常导入
 */
import { describe, expect, it } from "vitest";

describe("Monaco Editor Import", () => {
	it("should import Editor component from @monaco-editor/react", async () => {
		const monaco = await import("@monaco-editor/react");
		expect(monaco.Editor).toBeDefined();
		expect(typeof monaco.Editor).toBe("object"); // React.memo 返回 object
	});

	it("should import loader from @monaco-editor/react", async () => {
		const monaco = await import("@monaco-editor/react");
		expect(monaco.loader).toBeDefined();
	});

	it("should import useMonaco hook from @monaco-editor/react", async () => {
		const monaco = await import("@monaco-editor/react");
		expect(monaco.useMonaco).toBeDefined();
		expect(typeof monaco.useMonaco).toBe("function");
	});

	it("should import DiffEditor component from @monaco-editor/react", async () => {
		const monaco = await import("@monaco-editor/react");
		expect(monaco.DiffEditor).toBeDefined();
	});
});
