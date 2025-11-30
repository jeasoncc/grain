/**
 * 完整主题配置系统 - VS Code 风格
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
	
	// 编辑器扩展颜色（可选）
	editorCursor?: string;
	editorSelection?: string;
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

export interface Theme {
	key: string;
	name: string;
	description: string;
	type: "light" | "dark";
	colors: ThemeColors;
}

export const themes: Theme[] = [
	// ============ 浅色主题 ============
	{
		key: "default-light",
		name: "Default Light",
		description: "默认浅色主题",
		type: "light",
		colors: {
			background: "#ffffff",
			foreground: "#1f2937",
			card: "#ffffff",
			cardForeground: "#1f2937",
			popover: "#ffffff",
			popoverForeground: "#1f2937",
			primary: "#2563eb",
			primaryForeground: "#ffffff",
			secondary: "#f3f4f6",
			secondaryForeground: "#1f2937",
			muted: "#f3f4f6",
			mutedForeground: "#6b7280",
			accent: "#eff6ff",
			accentForeground: "#1f2937",
			border: "#e5e7eb",
			input: "#e5e7eb",
			ring: "#2563eb",
			sidebar: "#f9fafb",
			sidebarForeground: "#1f2937",
			sidebarPrimary: "#2563eb",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#eff6ff",
			sidebarAccentForeground: "#1f2937",
			sidebarBorder: "#e5e7eb",
			// 编辑器扩展颜色
			editorCursor: "#2563eb",
			editorSelection: "#bfdbfe",
			editorLineHighlight: "#f8fafc",
		},
	},
	{
		key: "github-light",
		name: "GitHub Light",
		description: "GitHub 浅色主题",
		type: "light",
		colors: {
			background: "#ffffff",
			foreground: "#24292f",
			card: "#ffffff",
			cardForeground: "#24292f",
			popover: "#ffffff",
			popoverForeground: "#24292f",
			primary: "#0969da",
			primaryForeground: "#ffffff",
			secondary: "#f6f8fa",
			secondaryForeground: "#24292f",
			muted: "#f6f8fa",
			mutedForeground: "#57606a",
			accent: "#ddf4ff",
			accentForeground: "#24292f",
			border: "#d0d7de",
			input: "#d0d7de",
			ring: "#0969da",
			sidebar: "#f6f8fa",
			sidebarForeground: "#24292f",
			sidebarPrimary: "#0969da",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#ddf4ff",
			sidebarAccentForeground: "#24292f",
			sidebarBorder: "#d0d7de",
			// 编辑器扩展颜色
			editorCursor: "#0969da",
			editorSelection: "#b6e3ff",
			editorLineHighlight: "#f6f8fa",
		},
	},
	{
		key: "solarized-light",
		name: "Solarized Light",
		description: "护眼浅色主题",
		type: "light",
		colors: {
			background: "#fdf6e3",
			foreground: "#657b83",
			card: "#fdf6e3",
			cardForeground: "#657b83",
			popover: "#fdf6e3",
			popoverForeground: "#657b83",
			primary: "#268bd2",
			primaryForeground: "#fdf6e3",
			secondary: "#eee8d5",
			secondaryForeground: "#657b83",
			muted: "#eee8d5",
			mutedForeground: "#93a1a1",
			accent: "#eee8d5",
			accentForeground: "#657b83",
			border: "#93a1a1",
			input: "#93a1a1",
			ring: "#268bd2",
			sidebar: "#eee8d5",
			sidebarForeground: "#657b83",
			sidebarPrimary: "#268bd2",
			sidebarPrimaryForeground: "#fdf6e3",
			sidebarAccent: "#fdf6e3",
			sidebarAccentForeground: "#657b83",
			sidebarBorder: "#93a1a1",
		},
	},
	{
		key: "quiet-light",
		name: "Quiet Light",
		description: "柔和温暖的浅色主题",
		type: "light",
		colors: {
			background: "#f5f5f5",
			foreground: "#333333",
			card: "#ffffff",
			cardForeground: "#333333",
			popover: "#ffffff",
			popoverForeground: "#333333",
			primary: "#4078c0",
			primaryForeground: "#ffffff",
			secondary: "#e8e8e8",
			secondaryForeground: "#333333",
			muted: "#e8e8e8",
			mutedForeground: "#777777",
			accent: "#d3e8f8",
			accentForeground: "#333333",
			border: "#d4d4d4",
			input: "#d4d4d4",
			ring: "#4078c0",
			sidebar: "#f3f3f3",
			sidebarForeground: "#333333",
			sidebarPrimary: "#4078c0",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#d3e8f8",
			sidebarAccentForeground: "#333333",
			sidebarBorder: "#d4d4d4",
			// 扩展颜色
			editorCursor: "#4078c0",
			editorSelection: "#c8ddf0",
			editorLineHighlight: "#f0f0f0",
			success: "#22863a",
			warning: "#b08800",
			error: "#d73a49",
			info: "#4078c0",
			syntaxHeading: "#005cc5",
			syntaxBold: "#24292e",
			syntaxItalic: "#6a737d",
			syntaxLink: "#0366d6",
			syntaxCode: "#d73a49",
			syntaxQuote: "#6a737d",
			syntaxComment: "#6a737d",
		},
	},
	{
		key: "light-plus",
		name: "Light+",
		description: "VSCode 默认浅色主题",
		type: "light",
		colors: {
			background: "#ffffff",
			foreground: "#000000",
			card: "#ffffff",
			cardForeground: "#000000",
			popover: "#ffffff",
			popoverForeground: "#000000",
			primary: "#0066bf",
			primaryForeground: "#ffffff",
			secondary: "#f3f3f3",
			secondaryForeground: "#000000",
			muted: "#f3f3f3",
			mutedForeground: "#6a737d",
			accent: "#e8f2ff",
			accentForeground: "#000000",
			border: "#e5e5e5",
			input: "#e5e5e5",
			ring: "#0066bf",
			sidebar: "#f3f3f3",
			sidebarForeground: "#000000",
			sidebarPrimary: "#0066bf",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#e8f2ff",
			sidebarAccentForeground: "#000000",
			sidebarBorder: "#e5e5e5",
		},
	},
	{
		key: "atom-one-light",
		name: "Atom One Light",
		description: "流行的 Atom 浅色主题",
		type: "light",
		colors: {
			background: "#fafafa",
			foreground: "#383a42",
			card: "#ffffff",
			cardForeground: "#383a42",
			popover: "#ffffff",
			popoverForeground: "#383a42",
			primary: "#4078f2",
			primaryForeground: "#ffffff",
			secondary: "#f0f0f0",
			secondaryForeground: "#383a42",
			muted: "#f0f0f0",
			mutedForeground: "#a0a1a7",
			accent: "#e5f0ff",
			accentForeground: "#383a42",
			border: "#e5e5e6",
			input: "#e5e5e6",
			ring: "#4078f2",
			sidebar: "#f0f0f0",
			sidebarForeground: "#383a42",
			sidebarPrimary: "#4078f2",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#e5f0ff",
			sidebarAccentForeground: "#383a42",
			sidebarBorder: "#e5e5e6",
		},
	},
	{
		key: "winter-light",
		name: "Winter is Coming (Light)",
		description: "清新的蓝色调浅色主题",
		type: "light",
		colors: {
			background: "#ffffff",
			foreground: "#0e293f",
			card: "#ffffff",
			cardForeground: "#0e293f",
			popover: "#ffffff",
			popoverForeground: "#0e293f",
			primary: "#0073a1",
			primaryForeground: "#ffffff",
			secondary: "#f7f9fb",
			secondaryForeground: "#0e293f",
			muted: "#f7f9fb",
			mutedForeground: "#5a7a8c",
			accent: "#e3f2fd",
			accentForeground: "#0e293f",
			border: "#d9e7f1",
			input: "#d9e7f1",
			ring: "#0073a1",
			sidebar: "#f7f9fb",
			sidebarForeground: "#0e293f",
			sidebarPrimary: "#0073a1",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#e3f2fd",
			sidebarAccentForeground: "#0e293f",
			sidebarBorder: "#d9e7f1",
		},
	},
	{
		key: "ayu-light",
		name: "Ayu Light",
		description: "现代简约的浅色主题",
		type: "light",
		colors: {
			background: "#fafafa",
			foreground: "#5c6166",
			card: "#ffffff",
			cardForeground: "#5c6166",
			popover: "#ffffff",
			popoverForeground: "#5c6166",
			primary: "#399ee6",
			primaryForeground: "#ffffff",
			secondary: "#f3f4f5",
			secondaryForeground: "#5c6166",
			muted: "#f3f4f5",
			mutedForeground: "#828c99",
			accent: "#e7f3fa",
			accentForeground: "#5c6166",
			border: "#e7e8e9",
			input: "#e7e8e9",
			ring: "#399ee6",
			sidebar: "#f8f9fa",
			sidebarForeground: "#5c6166",
			sidebarPrimary: "#399ee6",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#e7f3fa",
			sidebarAccentForeground: "#5c6166",
			sidebarBorder: "#e7e8e9",
		},
	},
	{
		key: "gruvbox-light",
		name: "Gruvbox Light",
		description: "复古温暖浅色主题",
		type: "light",
		colors: {
			background: "#fbf1c7",
			foreground: "#3c3836",
			card: "#f9f5d7",
			cardForeground: "#3c3836",
			popover: "#f9f5d7",
			popoverForeground: "#3c3836",
			primary: "#076678",
			primaryForeground: "#fbf1c7",
			secondary: "#ebdbb2",
			secondaryForeground: "#3c3836",
			muted: "#ebdbb2",
			mutedForeground: "#7c6f64",
			accent: "#d5c4a1",
			accentForeground: "#3c3836",
			border: "#d5c4a1",
			input: "#d5c4a1",
			ring: "#076678",
			sidebar: "#f2e5bc",
			sidebarForeground: "#3c3836",
			sidebarPrimary: "#076678",
			sidebarPrimaryForeground: "#fbf1c7",
			sidebarAccent: "#d5c4a1",
			sidebarAccentForeground: "#3c3836",
			sidebarBorder: "#d5c4a1",
		},
	},
	// ============ 深色主题 ============
	{
		key: "default-dark",
		name: "Default Dark",
		description: "默认深色主题",
		type: "dark",
		colors: {
			background: "#0f172a",
			foreground: "#f1f5f9",
			card: "#1e293b",
			cardForeground: "#f1f5f9",
			popover: "#1e293b",
			popoverForeground: "#f1f5f9",
			primary: "#3b82f6",
			primaryForeground: "#ffffff",
			secondary: "#1e293b",
			secondaryForeground: "#f1f5f9",
			muted: "#334155",
			mutedForeground: "#94a3b8",
			accent: "#1e3a5f",
			accentForeground: "#f1f5f9",
			border: "#334155",
			input: "#334155",
			ring: "#3b82f6",
			sidebar: "#0f172a",
			sidebarForeground: "#f1f5f9",
			sidebarPrimary: "#3b82f6",
			sidebarPrimaryForeground: "#ffffff",
			sidebarAccent: "#1e3a5f",
			sidebarAccentForeground: "#f1f5f9",
			sidebarBorder: "#334155",
			// 编辑器扩展颜色
			editorCursor: "#60a5fa",
			editorSelection: "#1e3a5f",
			editorLineHighlight: "#1e293b",
		},
	},
	{
		key: "github-dark",
		name: "GitHub Dark",
		description: "GitHub 深色主题",
		type: "dark",
		colors: {
			background: "#0d1117",
			foreground: "#c9d1d9",
			card: "#161b22",
			cardForeground: "#c9d1d9",
			popover: "#161b22",
			popoverForeground: "#c9d1d9",
			primary: "#58a6ff",
			primaryForeground: "#0d1117",
			secondary: "#21262d",
			secondaryForeground: "#c9d1d9",
			muted: "#21262d",
			mutedForeground: "#8b949e",
			accent: "#1f6feb33",
			accentForeground: "#c9d1d9",
			border: "#30363d",
			input: "#30363d",
			ring: "#58a6ff",
			sidebar: "#010409",
			sidebarForeground: "#c9d1d9",
			sidebarPrimary: "#58a6ff",
			sidebarPrimaryForeground: "#0d1117",
			sidebarAccent: "#1f6feb33",
			sidebarAccentForeground: "#c9d1d9",
			sidebarBorder: "#30363d",
			// 编辑器扩展颜色
			editorCursor: "#58a6ff",
			editorSelection: "#264f78",
			editorLineHighlight: "#161b22",
		},
	},
	{
		key: "one-dark-pro",
		name: "One Dark Pro",
		description: "经典 Atom 深色主题",
		type: "dark",
		colors: {
			background: "#282c34",
			foreground: "#abb2bf",
			card: "#21252b",
			cardForeground: "#abb2bf",
			popover: "#21252b",
			popoverForeground: "#abb2bf",
			primary: "#61afef",
			primaryForeground: "#282c34",
			secondary: "#3e4451",
			secondaryForeground: "#abb2bf",
			muted: "#3e4451",
			mutedForeground: "#5c6370",
			accent: "#2c313a",
			accentForeground: "#abb2bf",
			border: "#3e4451",
			input: "#3e4451",
			ring: "#61afef",
			sidebar: "#21252b",
			sidebarForeground: "#abb2bf",
			sidebarPrimary: "#61afef",
			sidebarPrimaryForeground: "#282c34",
			sidebarAccent: "#2c313a",
			sidebarAccentForeground: "#abb2bf",
			sidebarBorder: "#3e4451",
			// 编辑器扩展颜色
			editorCursor: "#528bff",
			editorSelection: "#3e4451",
			editorLineHighlight: "#2c313c",
		},
	},
	{
		key: "dracula",
		name: "Dracula",
		description: "吸血鬼紫色主题",
		type: "dark",
		colors: {
			background: "#282a36",
			foreground: "#f8f8f2",
			card: "#21222c",
			cardForeground: "#f8f8f2",
			popover: "#21222c",
			popoverForeground: "#f8f8f2",
			primary: "#bd93f9",
			primaryForeground: "#282a36",
			secondary: "#44475a",
			secondaryForeground: "#f8f8f2",
			muted: "#44475a",
			mutedForeground: "#6272a4",
			accent: "#44475a",
			accentForeground: "#f8f8f2",
			border: "#44475a",
			input: "#44475a",
			ring: "#bd93f9",
			sidebar: "#21222c",
			sidebarForeground: "#f8f8f2",
			sidebarPrimary: "#bd93f9",
			sidebarPrimaryForeground: "#282a36",
			sidebarAccent: "#44475a",
			sidebarAccentForeground: "#f8f8f2",
			sidebarBorder: "#44475a",
			// 扩展颜色
			editorCursor: "#f8f8f0",
			editorSelection: "#44475a",
			editorLineHighlight: "#44475a",
			success: "#50fa7b",
			warning: "#f1fa8c",
			error: "#ff5555",
			info: "#8be9fd",
			syntaxHeading: "#bd93f9",
			syntaxBold: "#f8f8f2",
			syntaxItalic: "#f1fa8c",
			syntaxLink: "#8be9fd",
			syntaxCode: "#ff79c6",
			syntaxQuote: "#6272a4",
			syntaxComment: "#6272a4",
		},
	},
	{
		key: "nord",
		name: "Nord",
		description: "北欧冷色调主题",
		type: "dark",
		colors: {
			background: "#2e3440",
			foreground: "#eceff4",
			card: "#3b4252",
			cardForeground: "#eceff4",
			popover: "#3b4252",
			popoverForeground: "#eceff4",
			primary: "#88c0d0",
			primaryForeground: "#2e3440",
			secondary: "#3b4252",
			secondaryForeground: "#eceff4",
			muted: "#434c5e",
			mutedForeground: "#d8dee9",
			accent: "#434c5e",
			accentForeground: "#eceff4",
			border: "#4c566a",
			input: "#4c566a",
			ring: "#88c0d0",
			sidebar: "#2e3440",
			sidebarForeground: "#eceff4",
			sidebarPrimary: "#88c0d0",
			sidebarPrimaryForeground: "#2e3440",
			sidebarAccent: "#434c5e",
			sidebarAccentForeground: "#eceff4",
			sidebarBorder: "#4c566a",
			// 编辑器扩展颜色
			editorCursor: "#d8dee9",
			editorSelection: "#434c5e",
			editorLineHighlight: "#3b4252",
		},
	},
	{
		key: "monokai-pro",
		name: "Monokai Pro",
		description: "经典 Monokai 主题",
		type: "dark",
		colors: {
			background: "#2d2a2e",
			foreground: "#fcfcfa",
			card: "#221f22",
			cardForeground: "#fcfcfa",
			popover: "#221f22",
			popoverForeground: "#fcfcfa",
			primary: "#ffd866",
			primaryForeground: "#2d2a2e",
			secondary: "#403e41",
			secondaryForeground: "#fcfcfa",
			muted: "#403e41",
			mutedForeground: "#939293",
			accent: "#403e41",
			accentForeground: "#fcfcfa",
			border: "#5b595c",
			input: "#5b595c",
			ring: "#ffd866",
			sidebar: "#221f22",
			sidebarForeground: "#fcfcfa",
			sidebarPrimary: "#ffd866",
			sidebarPrimaryForeground: "#2d2a2e",
			sidebarAccent: "#403e41",
			sidebarAccentForeground: "#fcfcfa",
			sidebarBorder: "#5b595c",
		},
	},
	{
		key: "solarized-dark",
		name: "Solarized Dark",
		description: "护眼深色主题",
		type: "dark",
		colors: {
			background: "#002b36",
			foreground: "#839496",
			card: "#073642",
			cardForeground: "#839496",
			popover: "#073642",
			popoverForeground: "#839496",
			primary: "#268bd2",
			primaryForeground: "#fdf6e3",
			secondary: "#073642",
			secondaryForeground: "#839496",
			muted: "#073642",
			mutedForeground: "#586e75",
			accent: "#073642",
			accentForeground: "#839496",
			border: "#586e75",
			input: "#586e75",
			ring: "#268bd2",
			sidebar: "#002b36",
			sidebarForeground: "#839496",
			sidebarPrimary: "#268bd2",
			sidebarPrimaryForeground: "#fdf6e3",
			sidebarAccent: "#073642",
			sidebarAccentForeground: "#839496",
			sidebarBorder: "#586e75",
		},
	},
	{
		key: "tokyo-night",
		name: "Tokyo Night",
		description: "流行的深蓝紫色主题",
		type: "dark",
		colors: {
			background: "#1a1b26",
			foreground: "#a9b1d6",
			card: "#16161e",
			cardForeground: "#a9b1d6",
			popover: "#16161e",
			popoverForeground: "#a9b1d6",
			primary: "#7aa2f7",
			primaryForeground: "#1a1b26",
			secondary: "#24283b",
			secondaryForeground: "#a9b1d6",
			muted: "#24283b",
			mutedForeground: "#565f89",
			accent: "#292e42",
			accentForeground: "#a9b1d6",
			border: "#414868",
			input: "#414868",
			ring: "#7aa2f7",
			sidebar: "#16161e",
			sidebarForeground: "#a9b1d6",
			sidebarPrimary: "#7aa2f7",
			sidebarPrimaryForeground: "#1a1b26",
			sidebarAccent: "#292e42",
			sidebarAccentForeground: "#a9b1d6",
			sidebarBorder: "#414868",
			// 扩展颜色
			editorCursor: "#c0caf5",
			editorSelection: "#364a82",
			editorLineHighlight: "#1f2335",
			success: "#9ece6a",
			warning: "#e0af68",
			error: "#f7768e",
			info: "#7aa2f7",
			syntaxHeading: "#bb9af7",
			syntaxBold: "#c0caf5",
			syntaxItalic: "#7dcfff",
			syntaxLink: "#7aa2f7",
			syntaxCode: "#ff9e64",
			syntaxQuote: "#565f89",
			syntaxComment: "#565f89",
		},
	},
	{
		key: "material-ocean",
		name: "Material Theme Ocean",
		description: "优雅的海洋蓝主题",
		type: "dark",
		colors: {
			background: "#0f111a",
			foreground: "#8f93a2",
			card: "#090b10",
			cardForeground: "#8f93a2",
			popover: "#090b10",
			popoverForeground: "#8f93a2",
			primary: "#82aaff",
			primaryForeground: "#0f111a",
			secondary: "#1e2030",
			secondaryForeground: "#8f93a2",
			muted: "#1e2030",
			mutedForeground: "#464b5d",
			accent: "#1e2030",
			accentForeground: "#8f93a2",
			border: "#464b5d",
			input: "#464b5d",
			ring: "#82aaff",
			sidebar: "#090b10",
			sidebarForeground: "#8f93a2",
			sidebarPrimary: "#82aaff",
			sidebarPrimaryForeground: "#0f111a",
			sidebarAccent: "#1e2030",
			sidebarAccentForeground: "#8f93a2",
			sidebarBorder: "#464b5d",
		},
	},
	{
		key: "palenight",
		name: "Palenight",
		description: "柔和的紫色深色主题",
		type: "dark",
		colors: {
			background: "#292d3e",
			foreground: "#a6accd",
			card: "#1f2233",
			cardForeground: "#a6accd",
			popover: "#1f2233",
			popoverForeground: "#a6accd",
			primary: "#82aaff",
			primaryForeground: "#292d3e",
			secondary: "#3a3f58",
			secondaryForeground: "#a6accd",
			muted: "#3a3f58",
			mutedForeground: "#676e95",
			accent: "#3a3f58",
			accentForeground: "#a6accd",
			border: "#4e5579",
			input: "#4e5579",
			ring: "#82aaff",
			sidebar: "#1f2233",
			sidebarForeground: "#a6accd",
			sidebarPrimary: "#82aaff",
			sidebarPrimaryForeground: "#292d3e",
			sidebarAccent: "#3a3f58",
			sidebarAccentForeground: "#a6accd",
			sidebarBorder: "#4e5579",
		},
	},
	{
		key: "gruvbox-dark",
		name: "Gruvbox Dark",
		description: "复古温暖深色主题",
		type: "dark",
		colors: {
			background: "#282828",
			foreground: "#ebdbb2",
			card: "#1d2021",
			cardForeground: "#ebdbb2",
			popover: "#1d2021",
			popoverForeground: "#ebdbb2",
			primary: "#83a598",
			primaryForeground: "#282828",
			secondary: "#3c3836",
			secondaryForeground: "#ebdbb2",
			muted: "#3c3836",
			mutedForeground: "#a89984",
			accent: "#504945",
			accentForeground: "#ebdbb2",
			border: "#504945",
			input: "#504945",
			ring: "#83a598",
			sidebar: "#1d2021",
			sidebarForeground: "#ebdbb2",
			sidebarPrimary: "#83a598",
			sidebarPrimaryForeground: "#282828",
			sidebarAccent: "#504945",
			sidebarAccentForeground: "#ebdbb2",
			sidebarBorder: "#504945",
		},
	},
];

// 将 camelCase 转换为 kebab-case
function toKebabCase(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// 将十六进制颜色转换为 HSL 格式（用于 Tailwind CSS 变量）
function hexToHSL(hex: string): string {
	// 移除 # 号
	hex = hex.replace(/^#/, "");
	
	// 处理 3 位十六进制
	if (hex.length === 3) {
		hex = hex.split("").map(char => char + char).join("");
	}
	
	// 转换为 RGB
	const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
	const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
	const b = Number.parseInt(hex.substring(4, 6), 16) / 255;
	
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		
		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}
	
	// 转换为度数和百分比
	h = Math.round(h * 360);
	s = Math.round(s * 100);
	const lPercent = Math.round(l * 100);
	
	// 返回 Tailwind CSS 格式：h s% l%
	return `${h} ${s}% ${lPercent}%`;
}

// 生成默认的扩展颜色
function getExtendedColors(colors: ThemeColors, type: "light" | "dark"): Required<ThemeColors> {
	return {
		...colors,
		// 编辑器颜色
		editorCursor: colors.editorCursor || colors.primary,
		editorSelection: colors.editorSelection || colors.accent,
		editorLineHighlight: colors.editorLineHighlight || (type === "light" ? "#f5f5f5" : "#2a2a2a"),
		
		// 状态颜色
		success: colors.success || (type === "light" ? "#22c55e" : "#4ade80"),
		warning: colors.warning || (type === "light" ? "#f59e0b" : "#fbbf24"),
		error: colors.error || (type === "light" ? "#ef4444" : "#f87171"),
		info: colors.info || colors.primary,
		
		// 语法高亮
		syntaxHeading: colors.syntaxHeading || colors.primary,
		syntaxBold: colors.syntaxBold || (type === "light" ? "#1f2937" : "#f1f5f9"),
		syntaxItalic: colors.syntaxItalic || colors.mutedForeground,
		syntaxLink: colors.syntaxLink || colors.primary,
		syntaxCode: colors.syntaxCode || (type === "light" ? "#dc2626" : "#f87171"),
		syntaxQuote: colors.syntaxQuote || colors.mutedForeground,
		syntaxComment: colors.syntaxComment || colors.mutedForeground,
	};
}

// 应用主题
export function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	
	// 设置主题类型
	root.classList.remove("light", "dark");
	root.classList.add(theme.type);
	
	// 获取完整的颜色配置（包括默认扩展颜色）
	const fullColors = getExtendedColors(theme.colors, theme.type);
	
	// 应用所有颜色变量（直接使用十六进制颜色）
	Object.entries(fullColors).forEach(([key, value]) => {
		root.style.setProperty(`--${toKebabCase(key)}`, value);
	});
}

// 获取主题
export function getThemeByKey(key: string): Theme | undefined {
	return themes.find((t) => t.key === key);
}

// 获取浅色主题
export function getLightThemes(): Theme[] {
	return themes.filter((t) => t.type === "light");
}

// 获取深色主题
export function getDarkThemes(): Theme[] {
	return themes.filter((t) => t.type === "dark");
}
