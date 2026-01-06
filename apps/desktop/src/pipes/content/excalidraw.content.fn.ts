/**
 * @file fn/content/excalidraw.content.fn.ts
 * @description Excalidraw JSON 内容生成的纯函数
 *
 * 功能说明：
 * - 生成有效的 Excalidraw JSON 结构
 * - 支持自定义 width 和 height
 * - 创建空白画布的初始状态
 *
 * 这些函数无副作用，可组合，可测试。
 */

// ==============================
// Types
// ==============================

/**
 * Excalidraw 内容生成参数
 */
export interface ExcalidrawContentParams {
	/** 画布宽度，默认 1920 */
	readonly width?: number;
	/** 画布高度，默认 1080 */
	readonly height?: number;
}

/**
 * Excalidraw 缩放配置
 */
export interface ExcalidrawZoom {
	readonly value: number;
}

/**
 * Excalidraw 应用状态
 */
export interface ExcalidrawAppState {
	readonly viewBackgroundColor: string;
	readonly currentItemStrokeColor: string;
	readonly currentItemBackgroundColor: string;
	readonly currentItemFillStyle: string;
	readonly currentItemStrokeWidth: number;
	readonly currentItemStrokeStyle: string;
	readonly currentItemRoughness: number;
	readonly currentItemOpacity: number;
	readonly currentItemFontFamily: number;
	readonly currentItemFontSize: number;
	readonly currentItemTextAlign: string;
	readonly currentItemStartArrowhead: string | null;
	readonly currentItemEndArrowhead: string;
	readonly scrollX: number;
	readonly scrollY: number;
	readonly zoom: ExcalidrawZoom;
	readonly currentItemRoundness: string;
	readonly gridSize: number | null;
	readonly colorPalette: Record<string, unknown>;
}

/**
 * Excalidraw 元素（绘图元素）
 */
export type ExcalidrawElement = Record<string, unknown>;

/**
 * Excalidraw 文件（嵌入的图片等）
 */
export type ExcalidrawFiles = Record<string, unknown>;

/**
 * Excalidraw 文档结构
 */
export interface ExcalidrawDocument {
	readonly type: "excalidraw";
	readonly version: number;
	readonly source: string;
	readonly elements: ExcalidrawElement[];
	readonly appState: ExcalidrawAppState;
	readonly files: ExcalidrawFiles;
}

// ==============================
// Constants
// ==============================

/** 默认画布宽度 */
export const DEFAULT_WIDTH = 1920;

/** 默认画布高度 */
export const DEFAULT_HEIGHT = 1080;

/** Excalidraw 版本 */
export const EXCALIDRAW_VERSION = 2;

/** 来源标识 */
export const EXCALIDRAW_SOURCE = "grain-editor";

// ==============================
// Pure Functions
// ==============================

/**
 * 创建默认的 Excalidraw 应用状态
 *
 * 注意：必须设置 scrollX, scrollY, zoom 为安全值
 * 避免 Canvas exceeds max size 错误
 * 参考：https://github.com/excalidraw/excalidraw/issues/2723
 *
 * @returns Excalidraw 应用状态对象（最小化版本）
 */
export function createDefaultAppState(): Partial<ExcalidrawAppState> {
	return {
		viewBackgroundColor: "#ffffff",
		gridSize: null,
		// 必须设置这些值为安全的初始值
		scrollX: 0,
		scrollY: 0,
		zoom: { value: 1 },
	};
}

/**
 * 创建 Excalidraw 文档对象
 *
 * @param elements - 绘图元素数组
 * @param appState - 应用状态（最小化版本）
 * @param files - 嵌入文件
 * @returns Excalidraw 文档对象
 */
export function createExcalidrawDocument(
	elements: ExcalidrawElement[] = [],
	appState: Partial<ExcalidrawAppState> = createDefaultAppState(),
	files: ExcalidrawFiles = {},
): Omit<ExcalidrawDocument, "appState"> & {
	appState: Partial<ExcalidrawAppState>;
} {
	return {
		type: "excalidraw",
		version: EXCALIDRAW_VERSION,
		source: EXCALIDRAW_SOURCE,
		elements,
		appState,
		files,
	};
}

/**
 * 生成 Excalidraw 内容
 *
 * 创建一个空白的 Excalidraw 画布 JSON 字符串。
 * 支持自定义宽度和高度参数（用于未来扩展）。
 *
 * @param params - 内容生成参数
 * @returns Excalidraw JSON 字符串
 *
 * @example
 * // 使用默认尺寸
 * const content = generateExcalidrawContent();
 *
 * @example
 * // 使用自定义尺寸
 * const content = generateExcalidrawContent({ width: 2560, height: 1440 });
 */
export function generateExcalidrawContent(
	params: ExcalidrawContentParams = {},
): string {
	// 解构参数，使用默认值
	const _width = params.width ?? DEFAULT_WIDTH;
	const _height = params.height ?? DEFAULT_HEIGHT;

	// 创建文档对象
	const document = createExcalidrawDocument();

	// 返回格式化的 JSON 字符串
	return JSON.stringify(document, null, 2);
}

/**
 * 解析 Excalidraw JSON 内容
 *
 * @param content - Excalidraw JSON 字符串
 * @returns 解析后的 Excalidraw 文档对象，解析失败返回 null
 */
export function parseExcalidrawContent(
	content: string,
): ExcalidrawDocument | null {
	try {
		const parsed = JSON.parse(content);

		// 验证基本结构
		if (
			parsed &&
			typeof parsed === "object" &&
			parsed.type === "excalidraw" &&
			Array.isArray(parsed.elements) &&
			typeof parsed.appState === "object" &&
			typeof parsed.files === "object"
		) {
			return parsed as ExcalidrawDocument;
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * 验证 Excalidraw 内容是否有效
 *
 * @param content - Excalidraw JSON 字符串
 * @returns 是否为有效的 Excalidraw 内容
 */
export function isValidExcalidrawContent(content: string): boolean {
	return parseExcalidrawContent(content) !== null;
}
