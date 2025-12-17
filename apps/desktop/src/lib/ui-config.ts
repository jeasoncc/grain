// UI 配置 - 统一的尺寸和间距规范

export const UI_CONFIG = {
	// 字体大小
	fontSize: {
		xs: "0.75rem", // 12px
		sm: "0.8125rem", // 13px
		base: "0.875rem", // 14px
		lg: "1rem", // 16px
		xl: "1.125rem", // 18px
		"2xl": "1.25rem", // 20px
	},

	// 间距
	spacing: {
		xs: "0.25rem", // 4px
		sm: "0.5rem", // 8px
		md: "0.75rem", // 12px
		lg: "1rem", // 16px
		xl: "1.5rem", // 24px
		"2xl": "2rem", // 32px
	},

	// 圆角
	radius: {
		sm: "0.25rem", // 4px
		md: "0.375rem", // 6px
		lg: "0.5rem", // 8px
		xl: "0.75rem", // 12px
		full: "9999px",
	},

	// 高度
	height: {
		input: "2rem", // 32px
		button: "2rem", // 32px
		toolbar: "2.5rem", // 40px
		header: "2.75rem", // 44px
		statusbar: "1.75rem", // 28px
	},

	// 图标大小
	iconSize: {
		xs: "0.875rem", // 14px
		sm: "1rem", // 16px
		md: "1.125rem", // 18px
		lg: "1.25rem", // 20px
		xl: "1.5rem", // 24px
	},

	// 阴影
	shadow: {
		sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
		lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
		xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
	},

	// 过渡时长
	transition: {
		fast: "150ms",
		normal: "200ms",
		slow: "300ms",
	},
} as const;

// Export类型
export type FontSize = keyof typeof UI_CONFIG.fontSize;
export type Spacing = keyof typeof UI_CONFIG.spacing;
export type Radius = keyof typeof UI_CONFIG.radius;
