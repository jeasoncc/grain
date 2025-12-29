/**
 * @file fn/diagram/mermaid.render.fn.ts
 * @description Mermaid 图表客户端渲染纯函数
 *
 * 功能说明：
 * - 使用 mermaid.js 进行客户端渲染
 * - 支持 light/dark 主题切换
 * - 无需服务器连接，完全离线支持
 *
 * 设计理念：
 * - 纯函数：相同输入 → 相同输出
 * - 错误处理：返回友好的错误信息
 * - 安全性：配置适当的 securityLevel
 */

import mermaid from "mermaid";

// ============================================================================
// Types
// ============================================================================

/** Mermaid 主题类型 */
export type MermaidTheme = "light" | "dark";

/** Mermaid 渲染成功结果 */
export interface MermaidRenderSuccess {
	readonly svg: string;
}

/** Mermaid 渲染错误结果 */
export interface MermaidRenderError {
	readonly error: string;
}

/** Mermaid 渲染结果 */
export type MermaidRenderResult = MermaidRenderSuccess | MermaidRenderError;

/** Mermaid 初始化配置 */
export interface MermaidInitConfig {
	readonly theme: MermaidTheme;
	readonly fontFamily?: string;
	/**
	 * Mermaid 安全级别：
	 *
	 * - "strict": 最严格，禁用所有 HTML 标签和点击事件
	 *   适用于：不信任的用户输入、公共网站
	 *
	 * - "antiscript": 禁用 script 标签，但允许其他 HTML
	 *   适用于：需要一些 HTML 格式但要防止 XSS
	 *
	 * - "loose": 允许 HTML 标签和点击事件
	 *   适用于：桌面应用、受信任的环境（默认值）
	 *
	 * - "sandbox": 在 iframe sandbox 中渲染
	 *   适用于：需要完全隔离的场景
	 */
	readonly securityLevel?: "strict" | "loose" | "antiscript" | "sandbox";
}

// ============================================================================
// State
// ============================================================================

/** 当前初始化的主题 */
let currentTheme: MermaidTheme | null = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 将主题转换为 Mermaid 主题名称
 */
const toMermaidTheme = (
	theme: MermaidTheme,
): "default" | "dark" | "forest" | "neutral" | "base" => {
	return theme === "dark" ? "dark" : "default";
};

/**
 * 解析 Mermaid 错误信息，返回友好的错误描述
 */
const parseMermaidError = (error: unknown): string => {
	if (error instanceof Error) {
		const message = error.message;

		// 常见语法错误的友好提示
		if (message.includes("Syntax error")) {
			return `语法错误: ${message.replace(/Syntax error.*?:\s*/, "")}`;
		}
		if (message.includes("Parse error")) {
			return `解析错误: ${message.replace(/Parse error.*?:\s*/, "")}`;
		}
		if (message.includes("Lexical error")) {
			return `词法错误: ${message.replace(/Lexical error.*?:\s*/, "")}`;
		}
		if (message.includes("Unknown diagram type")) {
			return "未知的图表类型，请检查图表声明（如 graph、flowchart、sequenceDiagram 等）";
		}
		if (message.includes("No diagram type detected")) {
			return "未检测到图表类型，请在代码开头添加图表类型声明";
		}

		return message;
	}

	return "Mermaid 渲染失败";
};

// ============================================================================
// Public Functions
// ============================================================================

/**
 * 初始化 Mermaid 配置
 *
 * @param theme - 主题类型 ("light" | "dark")
 * @param config - 可选的额外配置
 *
 * @example
 * ```typescript
 * // 初始化为暗色主题
 * initMermaid("dark");
 *
 * // 初始化为亮色主题，自定义字体
 * initMermaid("light", { fontFamily: "monospace" });
 * ```
 */
export const initMermaid = (
	theme: MermaidTheme,
	config?: Partial<Omit<MermaidInitConfig, "theme">>,
): void => {
	// 如果主题没有变化，跳过重新初始化
	if (currentTheme === theme) {
		return;
	}

	mermaid.initialize({
		startOnLoad: false,
		theme: toMermaidTheme(theme),
		// 使用 loose 允许点击事件等交互功能
		// 在桌面应用中这是安全的
		securityLevel: config?.securityLevel ?? "loose",
		fontFamily: config?.fontFamily ?? "inherit",
		// 禁用日志以避免控制台噪音
		logLevel: "error",
	});

	currentTheme = theme;
};

/**
 * 渲染 Mermaid 图表
 *
 * @param code - Mermaid 代码
 * @param containerId - 容器 ID（用于生成唯一的 SVG ID）
 * @returns 渲染结果，包含 SVG 字符串或错误信息
 *
 * @example
 * ```typescript
 * const result = await renderMermaid("graph TD\n  A --> B", "preview-1");
 * if ("svg" in result) {
 *   console.log("渲染成功:", result.svg);
 * } else {
 *   console.error("渲染失败:", result.error);
 * }
 * ```
 */
export const renderMermaid = async (
	code: string,
	containerId?: string,
): Promise<MermaidRenderResult> => {
	// 空代码检查
	if (!code.trim()) {
		return {
			error: "图表代码为空",
		};
	}

	try {
		// 确保 Mermaid 已初始化（默认使用 light 主题）
		if (currentTheme === null) {
			initMermaid("light");
		}

		// 生成唯一 ID
		const id = containerId ?? `mermaid-${crypto.randomUUID()}`;

		// 渲染图表
		const { svg } = await mermaid.render(id, code);

		return { svg };
	} catch (error) {
		return {
			error: parseMermaidError(error),
		};
	}
};

/**
 * 检查 Mermaid 代码是否有效（不实际渲染）
 *
 * @param code - Mermaid 代码
 * @returns 是否有效
 */
export const validateMermaidCode = async (code: string): Promise<boolean> => {
	if (!code.trim()) {
		return false;
	}

	try {
		// 确保 Mermaid 已初始化
		if (currentTheme === null) {
			initMermaid("light");
		}

		// 使用 parse 方法验证语法（不生成 SVG）
		await mermaid.parse(code);
		return true;
	} catch {
		return false;
	}
};

/**
 * 获取当前 Mermaid 主题
 *
 * @returns 当前主题，如果未初始化则返回 null
 */
export const getCurrentMermaidTheme = (): MermaidTheme | null => {
	return currentTheme;
};

/**
 * 重置 Mermaid 状态（主要用于测试）
 */
export const resetMermaidState = (): void => {
	currentTheme = null;
};
