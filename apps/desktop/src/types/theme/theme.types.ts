/**
 * @file types/theme/theme.types.ts
 * @description 主题类型定义
 */

/**
 * 主题颜色配置接口
 */
export interface ThemeColors {
	// 基础背景
	readonly background: string
	readonly foreground: string
	readonly card: string
	readonly cardForeground: string
	readonly popover: string
	readonly popoverForeground: string

	// 主色调
	readonly primary: string
	readonly primaryForeground: string

	// 次要色
	readonly secondary: string
	readonly secondaryForeground: string

	// 柔和色
	readonly muted: string
	readonly mutedForeground: string

	// 强调色
	readonly accent: string
	readonly accentForeground: string

	// 边框和输入
	readonly border: string
	readonly input: string
	readonly ring: string

	// 侧边栏
	readonly sidebar: string
	readonly sidebarForeground: string
	readonly sidebarPrimary: string
	readonly sidebarPrimaryForeground: string
	readonly sidebarAccent: string
	readonly sidebarAccentForeground: string
	readonly sidebarBorder: string
	readonly folderColor: string

	// Toast 提示框（可选）
	readonly toastBackground?: string
	readonly toastForeground?: string
	readonly toastBorder?: string

	// 编辑器扩展颜色
	readonly editorCursor?: string
	readonly editorSelection: string // Required - background color for selected text
	readonly editorLineHighlight?: string

	// 状态颜色（可选）
	readonly success?: string
	readonly warning?: string
	readonly error?: string
	readonly info?: string

	// 编辑器语法高亮（可选）
	readonly syntaxHeading?: string
	readonly syntaxBold?: string
	readonly syntaxItalic?: string
	readonly syntaxLink?: string
	readonly syntaxCode?: string
	readonly syntaxQuote?: string
	readonly syntaxComment?: string
}

/**
 * 主题配置接口
 */
export interface Theme {
	readonly key: string
	readonly name: string
	readonly description: string
	readonly type: "light" | "dark"
	readonly colors: ThemeColors
}
