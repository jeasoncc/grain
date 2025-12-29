/**
 * @file diagram.render.fn.test.ts
 * @description 图表渲染纯函数测试
 *
 * 测试覆盖：
 * - renderMermaid: Mermaid 客户端渲染
 * - renderPlantUML: PlantUML Kroki 服务器渲染
 * - renderDiagram: 统一渲染入口
 * - 错误处理和重试逻辑
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	renderDiagram,
	renderMermaid,
	renderPlantUML,
} from "./diagram.render.fn";

// ============================================================================
// Mocks
// ============================================================================

// Mock mermaid
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
	},
}));

// Mock fetch for PlantUML tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// Test Helpers
// ============================================================================

const getMermaidMock = async () => {
	const mermaid = await import("mermaid");
	return mermaid.default as unknown as {
		initialize: ReturnType<typeof vi.fn>;
		render: ReturnType<typeof vi.fn>;
	};
};

const createSuccessResponse = (svg: string) => ({
	ok: true,
	text: () => Promise.resolve(svg),
});

const createErrorResponse = (status: number, message: string) => ({
	ok: false,
	status,
	text: () => Promise.resolve(message),
});

// ============================================================================
// renderMermaid Tests
// ============================================================================

describe("renderMermaid", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for empty code", async () => {
		const result = await renderMermaid("");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("syntax");
			expect(result.error.message).toBe("Empty diagram code");
			expect(result.error.retryable).toBe(false);
		}
	});

	it("should return error for whitespace-only code", async () => {
		const result = await renderMermaid("   \n\t  ");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("syntax");
		}
	});

	it("should render valid mermaid code successfully", async () => {
		const mermaid = await getMermaidMock();
		const mockSvg = "<svg>test</svg>";
		mermaid.render.mockResolvedValue({ svg: mockSvg });

		const result = await renderMermaid("flowchart TD\n  A --> B");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.svg).toBe(mockSvg);
		}
		expect(mermaid.initialize).toHaveBeenCalled();
	});

	it("should return syntax error when mermaid throws", async () => {
		const mermaid = await getMermaidMock();
		mermaid.render.mockRejectedValue(new Error("Parse error"));

		const result = await renderMermaid("invalid mermaid code");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("syntax");
			// 错误消息现在会被解析为更友好的格式
			expect(result.error.message).toContain("Parse error");
			expect(result.error.retryable).toBe(false);
		}
	});

	it("should call mermaid render for each call", async () => {
		const mermaid = await getMermaidMock();
		mermaid.render.mockResolvedValue({ svg: "<svg></svg>" });

		await renderMermaid("flowchart TD\n  A --> B");
		await renderMermaid("flowchart TD\n  C --> D");

		// render 应该被调用两次
		expect(mermaid.render).toHaveBeenCalledTimes(2);
	});
});

// ============================================================================
// renderPlantUML Tests
// ============================================================================

describe("renderPlantUML", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return error for empty code", async () => {
		const result = await renderPlantUML("", "https://kroki.io");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("syntax");
			expect(result.error.message).toBe("Empty diagram code");
		}
	});

	it("should return error when kroki URL is not configured", async () => {
		const result = await renderPlantUML("@startuml\nAlice -> Bob\n@enduml", "");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("network");
			expect(result.error.message).toBe("Kroki server URL not configured");
		}
	});

	it("should render valid PlantUML code successfully", async () => {
		const mockSvg = "<svg>plantuml</svg>";
		mockFetch.mockResolvedValue(createSuccessResponse(mockSvg));

		const result = await renderPlantUML(
			"@startuml\nAlice -> Bob\n@enduml",
			"https://kroki.io",
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.svg).toBe(mockSvg);
		}
		expect(mockFetch).toHaveBeenCalledWith(
			"https://kroki.io/plantuml/svg",
			expect.objectContaining({
				method: "POST",
				body: "@startuml\nAlice -> Bob\n@enduml",
			}),
		);
	});

	it("should return syntax error for 4xx responses", async () => {
		mockFetch.mockResolvedValue(createErrorResponse(400, "Syntax error"));

		const result = await renderPlantUML("invalid plantuml", "https://kroki.io");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("syntax");
			expect(result.error.retryable).toBe(false);
		}
	});

	it("should return server error for 5xx responses and retry", async () => {
		vi.useFakeTimers();

		// 第一次失败，第二次成功
		mockFetch
			.mockResolvedValueOnce(createErrorResponse(500, "Server error"))
			.mockResolvedValueOnce(createSuccessResponse("<svg>success</svg>"));

		const onRetryAttempt = vi.fn();
		const resultPromise = renderPlantUML(
			"@startuml\nAlice -> Bob\n@enduml",
			"https://kroki.io",
			0,
			onRetryAttempt,
		);

		// 快进时间以触发重试
		await vi.advanceTimersByTimeAsync(1000);

		const result = await resultPromise;

		expect(result.success).toBe(true);
		expect(onRetryAttempt).toHaveBeenCalledWith(1);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("should stop retrying after max attempts", async () => {
		vi.useFakeTimers();

		// 所有请求都失败
		mockFetch.mockResolvedValue(createErrorResponse(500, "Server error"));

		const onRetryAttempt = vi.fn();
		const resultPromise = renderPlantUML(
			"@startuml\nAlice -> Bob\n@enduml",
			"https://kroki.io",
			0,
			onRetryAttempt,
		);

		// 快进所有重试延迟
		await vi.advanceTimersByTimeAsync(1000); // 第一次重试
		await vi.advanceTimersByTimeAsync(2000); // 第二次重试
		await vi.advanceTimersByTimeAsync(4000); // 第三次重试

		const result = await resultPromise;

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("server");
			expect(result.error.retryable).toBe(false);
			expect(result.error.retryCount).toBe(3);
		}
	});

	it("should handle network errors and retry", async () => {
		vi.useFakeTimers();

		// 第一次网络错误，第二次成功
		mockFetch
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce(createSuccessResponse("<svg>success</svg>"));

		const resultPromise = renderPlantUML(
			"@startuml\nAlice -> Bob\n@enduml",
			"https://kroki.io",
		);

		await vi.advanceTimersByTimeAsync(1000);

		const result = await resultPromise;

		expect(result.success).toBe(true);
	});
});

// ============================================================================
// renderDiagram Tests
// ============================================================================

describe("renderDiagram", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockReset();
	});

	it("should use renderMermaid for mermaid type", async () => {
		const mermaid = await getMermaidMock();
		mermaid.render.mockResolvedValue({ svg: "<svg>mermaid</svg>" });

		const result = await renderDiagram("flowchart TD\n  A --> B", "mermaid");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.svg).toBe("<svg>mermaid</svg>");
		}
	});

	it("should use renderPlantUML for plantuml type", async () => {
		mockFetch.mockResolvedValue(createSuccessResponse("<svg>plantuml</svg>"));

		const result = await renderDiagram(
			"@startuml\nAlice -> Bob\n@enduml",
			"plantuml",
			"https://kroki.io",
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.svg).toBe("<svg>plantuml</svg>");
		}
	});

	it("should return error for plantuml without kroki URL", async () => {
		const result = await renderDiagram(
			"@startuml\nAlice -> Bob\n@enduml",
			"plantuml",
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("network");
		}
	});
});

// ============================================================================
// Error Classification Tests
// ============================================================================

describe("Error Classification", () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it("should classify 400 errors as syntax errors", async () => {
		mockFetch.mockResolvedValue(createErrorResponse(400, "Bad request"));

		const result = await renderPlantUML("invalid", "https://kroki.io");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("syntax");
		}
	});

	it("should classify 500 errors as server errors", async () => {
		vi.useFakeTimers();
		mockFetch.mockResolvedValue(createErrorResponse(500, "Internal error"));

		const resultPromise = renderPlantUML(
			"@startuml\n@enduml",
			"https://kroki.io",
		);

		// 快进所有重试延迟
		await vi.advanceTimersByTimeAsync(1000); // 第一次重试
		await vi.advanceTimersByTimeAsync(2000); // 第二次重试
		await vi.advanceTimersByTimeAsync(4000); // 第三次重试

		const result = await resultPromise;

		// 由于重试，需要等待所有重试完成
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.type).toBe("server");
		}

		vi.useRealTimers();
	});
});
