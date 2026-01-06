/**
 * @file fn/diagram/index.ts
 * @description Diagram 纯函数模块导出
 *
 * 导出说明：
 * - diagram.fn.ts: Kroki URL 构建等基础函数
 * - diagram.render.fn.ts: 统一渲染接口（推荐使用）
 * - mermaid.render.fn.ts: Mermaid 专用函数（带主题支持）
 * - plantuml.render.fn.ts: PlantUML 专用函数（带重试支持）
 */

// ============================================================================
// 基础函数
// ============================================================================

export * from "./diagram.fn";

// ============================================================================
// 统一渲染接口（推荐使用）
// ============================================================================

export {
	// 类型
	type DiagramError,
	type DiagramErrorType,
	type DiagramType,
	type RenderDiagramConfig,
	type RenderFailure,
	type RenderResult,
	type RenderSuccess,
	// 统一接口
	renderDiagram,
	// 向后兼容
	renderDiagramSimple,
	// 单独渲染函数
	renderMermaid,
	renderPlantUML,
} from "./diagram.render.fn";

// ============================================================================
// Mermaid 专用函数（带主题支持）
// ============================================================================

export {
	getCurrentMermaidTheme,
	// 初始化和状态
	initMermaid,
	// 类型
	type MermaidInitConfig,
	type MermaidRenderError,
	type MermaidRenderResult,
	type MermaidRenderSuccess,
	type MermaidTheme,
	// 重命名导出以避免与统一接口冲突
	renderMermaid as renderMermaidWithTheme,
	resetMermaidState,
	// 验证
	validateMermaidCode,
} from "./mermaid.render.fn";

// ============================================================================
// PlantUML 专用函数（带重试支持）
// ============================================================================

export {
	// 健康检查
	checkKrokiServerHealth,
	// 类型
	type PlantUMLErrorType,
	type PlantUMLRenderConfig,
	type PlantUMLRenderError,
	type PlantUMLRenderResult,
	type PlantUMLRenderSuccess,
	// 重命名导出以避免与统一接口冲突
	renderPlantUML as renderPlantUMLWithRetry,
	// 简化版渲染
	renderPlantUMLSimple,
} from "./plantuml.render.fn";
