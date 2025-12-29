/**
 * @file fn/diagram/index.ts
 * @description Diagram 纯函数模块导出
 */

export * from "./diagram.fn";
export * from "./diagram.render.fn";
// Mermaid 专用函数（带主题支持）
// 重命名导出以避免与 diagram.render.fn 中的 renderMermaid 冲突
export {
	getCurrentMermaidTheme,
	initMermaid,
	type MermaidInitConfig,
	type MermaidRenderError,
	type MermaidRenderResult,
	type MermaidRenderSuccess,
	type MermaidTheme,
	renderMermaid as renderMermaidWithTheme,
	resetMermaidState,
	validateMermaidCode,
} from "./mermaid.render.fn";
