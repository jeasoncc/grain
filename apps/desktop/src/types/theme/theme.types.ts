/**
 * @file types/theme/theme.types.ts
 * @description 主题类型定义
 */

/**
 * 主题颜色配置接口
 */
export interface ThemeColors {
	// 基础背景
	background: string;
	foreground: string;
	card: string;
	cardForeground: string;
	popover: string;
	popoverForeground: string;

	// 主色调
	primary: string;
	primaryForeground: string;

	// 次要色
	secondary: string;
	secondaryForeground: string;

	// 柔和色
	muted: string;
	mutedForeground: string;

	// 强调色
	accent: string;
	accentForeground: string;

	// 边框和输入
	border: string;
	input: string;
	ring: string;

	// 侧边栏
	sidebar: string;
	sidebarForeground: string;
	sidebarPrimary: string;
	sidebarPrimaryForeground: string;
	sidebarAccent: string;
	sidebarAccentForeground: string;
	sidebarBorder: string;
	folderColor: string;

	// Toast 提示框（可选）
	toastBackground?: string;
	toastForeground?: string;
	toastBorder?: string;

	// 编辑器扩展颜色
	editorCursor?: string;
	editorSelection: string; // Required - background color for selected text
	editorLineHighlight?: string;

	// 状态颜色（可选）
	success?: string;
	warning?: string;
	error?: string;
	info?: string;

	// 编辑器语法高亮（可选）
	syntaxHeading?: string;
	syntaxBold?: string;
	syntaxItalic?: string;
	syntaxLink?: string;
	syntaxCode?: string;
	syntaxQuote?: string;
	syntaxComment?: string;
}

/**
 * 主题配置接口
 */
export interface Theme {
	key: string;
	name: string;
	description: string;
	type: "light" | "dark";
	colors: ThemeColors;
}
