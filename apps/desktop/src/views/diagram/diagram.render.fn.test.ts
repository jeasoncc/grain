/**
 * @file diagram.render.fn.test.ts
 * @description 图表渲染统一接口测试
 *
 * 测试覆盖：
 * - renderMermaid: Mermaid 客户端渲染
 * - renderPlantUML: PlantUML Kroki 服务器渲染
 * - renderDiagram: 统一渲染入口
 * - 错误处理
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderDiagram, renderMermaid, renderPlantUML } from "./diagram.render.fn"

// ============================================================================
// Mocks
// ============================================================================

// Mock mermaid.render.fn.ts
vi.mock("./mermaid.render.fn", () => ({
	initMermaid: vi.fn(),
	renderMermaid: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
	getCurrentMermaidTheme: vi.fn().mockReturnValue("light"),
}))

// Mock plantuml.render.fn.ts
vi.mock("./plantuml.render.fn", () => ({
	renderPlantUML: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
}))

// ============================================================================
// Test Helpers
// ============================================================================

const getMermaidMock = async () => {
	const mermaidModule = await import("./mermaid.render.fn")
	return {
		initMermaid: mermaidModule.initMermaid as ReturnType<typeof vi.fn>,
		renderMermaid: mermaidModule.renderMermaid as ReturnType<typeof vi.fn>,
	}
}

const getPlantUMLMock = async () => {
	const plantUMLModule = await import("./plantuml.render.fn")
	return {
		renderPlantUML: plantUMLModule.renderPlantUML as ReturnType<typeof vi.fn>,
	}
}

// ============================================================================
// renderMermaid Tests
// ============================================================================

describe("renderMermaid", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return error for empty code", async () => {
		const result = await renderMermaid("")

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("syntax")
			expect(result.error.message).toBe("图表代码为空")
			expect(result.error.retryable).toBe(false)
		}
	})

	it("should return error for whitespace-only code", async () => {
		const result = await renderMermaid("   \n\t  ")

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("syntax")
		}
	})

	it("should render valid mermaid code successfully", async () => {
		const mermaid = await getMermaidMock()
		const mockSvg = "<svg>test</svg>"
		mermaid.renderMermaid.mockResolvedValue({ svg: mockSvg })

		const result = await renderMermaid("flowchart TD\n  A --> B")

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.svg).toBe(mockSvg)
		}
		expect(mermaid.initMermaid).toHaveBeenCalledWith("light")
	})

	it("should initialize mermaid with dark theme", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ svg: "<svg></svg>" })

		await renderMermaid("flowchart TD\n  A --> B", "dark")

		expect(mermaid.initMermaid).toHaveBeenCalledWith("dark")
	})

	it("should return syntax error when mermaid returns error", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ error: "Parse error" })

		const result = await renderMermaid("invalid mermaid code")

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("syntax")
			expect(result.error.message).toBe("Parse error")
			expect(result.error.retryable).toBe(false)
		}
	})

	it("should pass containerId to mermaid render", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ svg: "<svg></svg>" })

		await renderMermaid("flowchart TD\n  A --> B", "light", "my-container")

		expect(mermaid.renderMermaid).toHaveBeenCalledWith("flowchart TD\n  A --> B", "my-container")
	})
})

// ============================================================================
// renderPlantUML Tests
// ============================================================================

describe("renderPlantUML", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return error for empty code", async () => {
		const result = await renderPlantUML("", "https://kroki.io")

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("syntax")
			expect(result.error.message).toBe("图表代码为空")
		}
	})

	it("should return error when kroki URL is not configured", async () => {
		const result = await renderPlantUML("@startuml\nAlice -> Bob\n@enduml", "")

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("config")
			expect(result.error.message).toBe("Kroki 服务器 URL 未配置")
		}
	})

	it("should render valid PlantUML code successfully", async () => {
		const plantUML = await getPlantUMLMock()
		const mockSvg = "<svg>plantuml</svg>"
		plantUML.renderPlantUML.mockResolvedValue({ svg: mockSvg })

		const result = await renderPlantUML("@startuml\nAlice -> Bob\n@enduml", "https://kroki.io")

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.svg).toBe(mockSvg)
		}
		expect(plantUML.renderPlantUML).toHaveBeenCalledWith(
			"@startuml\nAlice -> Bob\n@enduml",
			expect.objectContaining({
				krokiServerUrl: "https://kroki.io",
			}),
		)
	})

	it("should return error when plantuml render fails", async () => {
		const plantUML = await getPlantUMLMock()
		plantUML.renderPlantUML.mockResolvedValue({
			error: "Syntax error",
			errorType: "syntax",
			retryable: false,
		})

		const result = await renderPlantUML("invalid plantuml", "https://kroki.io")

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("syntax")
			expect(result.error.message).toBe("Syntax error")
			expect(result.error.retryable).toBe(false)
		}
	})

	it("should pass onRetryAttempt callback", async () => {
		const plantUML = await getPlantUMLMock()
		plantUML.renderPlantUML.mockResolvedValue({ svg: "<svg></svg>" })

		const onRetryAttempt = vi.fn()
		await renderPlantUML("@startuml\nAlice -> Bob\n@enduml", "https://kroki.io", onRetryAttempt)

		expect(plantUML.renderPlantUML).toHaveBeenCalledWith(
			"@startuml\nAlice -> Bob\n@enduml",
			expect.objectContaining({
				krokiServerUrl: "https://kroki.io",
				onRetryAttempt,
			}),
		)
	})
})

// ============================================================================
// renderDiagram Tests (Unified Interface)
// ============================================================================

describe("renderDiagram", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should use renderMermaid for mermaid type", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ svg: "<svg>mermaid</svg>" })

		const result = await renderDiagram({
			code: "flowchart TD\n  A --> B",
			diagramType: "mermaid",
		})

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.svg).toBe("<svg>mermaid</svg>")
		}
		expect(mermaid.renderMermaid).toHaveBeenCalled()
	})

	it("should use renderPlantUML for plantuml type", async () => {
		const plantUML = await getPlantUMLMock()
		plantUML.renderPlantUML.mockResolvedValue({ svg: "<svg>plantuml</svg>" })

		const result = await renderDiagram({
			code: "@startuml\nAlice -> Bob\n@enduml",
			diagramType: "plantuml",
			krokiServerUrl: "https://kroki.io",
		})

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.svg).toBe("<svg>plantuml</svg>")
		}
		expect(plantUML.renderPlantUML).toHaveBeenCalled()
	})

	it("should pass theme to mermaid renderer", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ svg: "<svg></svg>" })

		await renderDiagram({
			code: "flowchart TD\n  A --> B",
			diagramType: "mermaid",
			theme: "dark",
		})

		expect(mermaid.initMermaid).toHaveBeenCalledWith("dark")
	})

	it("should pass containerId to mermaid renderer", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ svg: "<svg></svg>" })

		await renderDiagram({
			code: "flowchart TD\n  A --> B",
			diagramType: "mermaid",
			containerId: "preview-123",
		})

		expect(mermaid.renderMermaid).toHaveBeenCalledWith("flowchart TD\n  A --> B", "preview-123")
	})

	it("should return error for plantuml without kroki URL", async () => {
		const result = await renderDiagram({
			code: "@startuml\nAlice -> Bob\n@enduml",
			diagramType: "plantuml",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("config")
		}
	})

	it("should pass onRetryAttempt to plantuml renderer", async () => {
		const plantUML = await getPlantUMLMock()
		plantUML.renderPlantUML.mockResolvedValue({ svg: "<svg></svg>" })

		const onRetryAttempt = vi.fn()
		await renderDiagram({
			code: "@startuml\nAlice -> Bob\n@enduml",
			diagramType: "plantuml",
			krokiServerUrl: "https://kroki.io",
			onRetryAttempt,
		})

		expect(plantUML.renderPlantUML).toHaveBeenCalledWith(
			"@startuml\nAlice -> Bob\n@enduml",
			expect.objectContaining({
				onRetryAttempt,
			}),
		)
	})

	it("should use default light theme for mermaid", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({ svg: "<svg></svg>" })

		await renderDiagram({
			code: "flowchart TD\n  A --> B",
			diagramType: "mermaid",
		})

		expect(mermaid.initMermaid).toHaveBeenCalledWith("light")
	})
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Error Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should handle mermaid syntax errors", async () => {
		const mermaid = await getMermaidMock()
		mermaid.renderMermaid.mockResolvedValue({
			error: "Unknown diagram type",
		})

		const result = await renderDiagram({
			code: "invalid",
			diagramType: "mermaid",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("syntax")
			expect(result.error.retryable).toBe(false)
		}
	})

	it("should handle plantuml network errors", async () => {
		const plantUML = await getPlantUMLMock()
		plantUML.renderPlantUML.mockResolvedValue({
			error: "Network error",
			errorType: "network",
			retryable: true,
		})

		const result = await renderDiagram({
			code: "@startuml\n@enduml",
			diagramType: "plantuml",
			krokiServerUrl: "https://kroki.io",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("network")
			expect(result.error.retryable).toBe(true)
		}
	})

	it("should handle plantuml server errors", async () => {
		const plantUML = await getPlantUMLMock()
		plantUML.renderPlantUML.mockResolvedValue({
			error: "Server error",
			errorType: "server",
			retryable: false,
		})

		const result = await renderDiagram({
			code: "@startuml\n@enduml",
			diagramType: "plantuml",
			krokiServerUrl: "https://kroki.io",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.type).toBe("server")
		}
	})
})
