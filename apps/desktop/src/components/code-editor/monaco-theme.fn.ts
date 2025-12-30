/**
 * Monaco Editor 主题生成模块
 *
 * 根据应用主题的颜色配置生成对应的 Monaco Editor 主题
 * 实现 Monaco 主题与应用主题的同步
 *
 * @module code-editor/monaco-theme
 */

import type { editor } from "monaco-editor";
import type { Theme } from "@/lib/themes";

/**
 * Monaco 主题定义类型
 */
export type MonacoThemeData = editor.IStandaloneThemeData;

/**
 * 已注册的 Monaco 主题缓存
 * 避免重复注册相同的主题
 */
const registeredThemes = new Set<string>();

/**
 * 生成 Monaco 主题名称
 *
 * @param themeKey - 应用主题的 key
 * @returns Monaco 主题名称
 */
export const getMonacoThemeName = (themeKey: string): string => {
	return `grain-${themeKey}`;
};

/**
 * 根据应用主题生成 Monaco 主题数据
 *
 * 将应用主题的颜色映射到 Monaco Editor 的主题配置
 * 包括编辑器背景、前景、选择、光标等颜色
 *
 * @param theme - 应用主题对象
 * @returns Monaco 主题数据
 */
export const generateMonacoTheme = (theme: Theme): MonacoThemeData => {
	const { colors, type } = theme;

	// 基础主题：light 或 vs-dark
	const base: "vs" | "vs-dark" = type === "light" ? "vs" : "vs-dark";

	// 编辑器颜色配置
	const editorColors: editor.IColors = {
		// 编辑器背景和前景
		"editor.background": colors.background,
		"editor.foreground": colors.foreground,

		// 选择和高亮
		"editor.selectionBackground": colors.editorSelection,
		"editor.lineHighlightBackground":
			colors.editorLineHighlight ||
			(type === "light" ? "#f5f5f5" : "#2a2a2a"),

		// 光标
		"editorCursor.foreground": colors.editorCursor || colors.primary,

		// 行号
		"editorLineNumber.foreground": colors.mutedForeground,
		"editorLineNumber.activeForeground": colors.foreground,

		// 缩进参考线
		"editorIndentGuide.background": colors.border,
		"editorIndentGuide.activeBackground": colors.mutedForeground,

		// 括号匹配
		"editorBracketMatch.background":
			type === "light" ? "#0000001a" : "#ffffff1a",
		"editorBracketMatch.border": colors.primary,

		// 滚动条
		"scrollbarSlider.background":
			type === "light" ? "#00000020" : "#ffffff20",
		"scrollbarSlider.hoverBackground":
			type === "light" ? "#00000040" : "#ffffff40",
		"scrollbarSlider.activeBackground":
			type === "light" ? "#00000060" : "#ffffff60",

		// 小地图
		"minimap.background": colors.background,

		// 编辑器组
		"editorGroup.border": colors.border,
		"editorGroupHeader.tabsBackground": colors.card,

		// 编辑器小部件
		"editorWidget.background": colors.popover,
		"editorWidget.foreground": colors.popoverForeground,
		"editorWidget.border": colors.border,

		// 输入框
		"input.background": colors.input,
		"input.foreground": colors.foreground,
		"input.border": colors.border,

		// 下拉菜单
		"dropdown.background": colors.popover,
		"dropdown.foreground": colors.popoverForeground,
		"dropdown.border": colors.border,

		// 列表
		"list.activeSelectionBackground": colors.accent,
		"list.activeSelectionForeground": colors.accentForeground,
		"list.hoverBackground": colors.muted,
		"list.hoverForeground": colors.foreground,
	};

	// 语法高亮规则
	const tokenColors: editor.ITokenThemeRule[] = [
		// 注释
		{
			token: "comment",
			foreground: hexToMonacoColor(
				colors.syntaxComment || colors.mutedForeground,
			),
			fontStyle: "italic",
		},

		// 关键字
		{
			token: "keyword",
			foreground: hexToMonacoColor(colors.primary),
			fontStyle: "bold",
		},

		// 字符串
		{
			token: "string",
			foreground: hexToMonacoColor(
				colors.success || (type === "light" ? "#22c55e" : "#4ade80"),
			),
		},

		// 数字
		{
			token: "number",
			foreground: hexToMonacoColor(
				colors.warning || (type === "light" ? "#f59e0b" : "#fbbf24"),
			),
		},

		// 类型
		{
			token: "type",
			foreground: hexToMonacoColor(colors.syntaxHeading || colors.primary),
		},

		// 函数
		{
			token: "function",
			foreground: hexToMonacoColor(colors.syntaxLink || colors.primary),
		},

		// 变量
		{
			token: "variable",
			foreground: hexToMonacoColor(colors.foreground),
		},

		// 操作符
		{
			token: "operator",
			foreground: hexToMonacoColor(colors.foreground),
		},

		// 标点符号
		{
			token: "delimiter",
			foreground: hexToMonacoColor(colors.mutedForeground),
		},

		// Mermaid 特定 token
		{
			token: "mermaid-keyword",
			foreground: hexToMonacoColor(colors.primary),
			fontStyle: "bold",
		},
		{
			token: "mermaid-node",
			foreground: hexToMonacoColor(colors.syntaxLink || colors.primary),
		},
		{
			token: "mermaid-arrow",
			foreground: hexToMonacoColor(colors.mutedForeground),
		},
		{
			token: "mermaid-text",
			foreground: hexToMonacoColor(
				colors.success || (type === "light" ? "#22c55e" : "#4ade80"),
			),
		},

		// PlantUML 特定 token
		{
			token: "plantuml-keyword",
			foreground: hexToMonacoColor(colors.primary),
			fontStyle: "bold",
		},
		{
			token: "plantuml-type",
			foreground: hexToMonacoColor(colors.syntaxHeading || colors.primary),
		},
		{
			token: "plantuml-string",
			foreground: hexToMonacoColor(
				colors.success || (type === "light" ? "#22c55e" : "#4ade80"),
			),
		},
	];

	return {
		base,
		inherit: true,
		rules: tokenColors,
		colors: editorColors,
	};
};

/**
 * 将十六进制颜色转换为 Monaco 颜色格式
 *
 * Monaco 需要不带 # 的十六进制颜色
 *
 * @param hex - 十六进制颜色（如 #ffffff）
 * @returns Monaco 颜色格式（如 ffffff）
 */
const hexToMonacoColor = (hex: string): string => {
	return hex.replace("#", "");
};

/**
 * 注册 Monaco 主题
 *
 * 将应用主题注册到 Monaco Editor
 * 使用缓存避免重复注册
 *
 * @param monaco - Monaco 实例
 * @param theme - 应用主题对象
 * @returns 注册的 Monaco 主题名称
 */
export const registerMonacoTheme = (
	monaco: typeof import("monaco-editor"),
	theme: Theme,
): string => {
	const themeName = getMonacoThemeName(theme.key);

	// 检查是否已注册
	if (!registeredThemes.has(themeName)) {
		const themeData = generateMonacoTheme(theme);
		monaco.editor.defineTheme(themeName, themeData);
		registeredThemes.add(themeName);
	}

	return themeName;
};

/**
 * 清除已注册主题缓存
 *
 * 用于测试或需要重新注册主题时
 */
export const clearRegisteredThemes = (): void => {
	registeredThemes.clear();
};

/**
 * 检查主题是否已注册
 *
 * @param themeKey - 应用主题的 key
 * @returns 是否已注册
 */
export const isThemeRegistered = (themeKey: string): boolean => {
	return registeredThemes.has(getMonacoThemeName(themeKey));
};
