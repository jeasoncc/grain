/**
 * @file code-editor.view.fn.tsx
 * @description CodeEditor 纯展示组件
 *
 * 基于 Monaco Editor 的代码编辑器组件。
 * 支持语法高亮、代码补全、Ctrl+S 保存快捷键。
 * 支持自定义主题颜色，适配应用的主题系统。
 *
 * @requirements 5.1, 5.4
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { memo, useCallback, useEffect, useRef } from "react";

import type { CodeEditorViewProps, EditorThemeColors } from "./code-editor.types";

// ==============================
// 主题注册
// ==============================

/** 已注册的自定义主题名称 */
const CUSTOM_THEME_LIGHT = "grain-custom-light";
const CUSTOM_THEME_DARK = "grain-custom-dark";

/** 跟踪主题是否已注册 */
let themesRegistered = false;

/**
 * 根据主题颜色生成 Monaco 主题定义
 */
const createMonacoTheme = (
	baseTheme: "vs" | "vs-dark",
	colors: EditorThemeColors,
): editor.IStandaloneThemeData => {
	const rules: editor.ITokenThemeRule[] = [];

	// 基础颜色配置
	const themeColors: Record<string, string> = {};

	if (colors.background) {
		themeColors["editor.background"] = colors.background;
	}
	if (colors.foreground) {
		themeColors["editor.foreground"] = colors.foreground;
	}
	if (colors.selection) {
		themeColors["editor.selectionBackground"] = colors.selection;
		themeColors["editor.inactiveSelectionBackground"] = colors.selection + "80"; // 50% 透明度
	}
	if (colors.lineHighlight) {
		themeColors["editor.lineHighlightBackground"] = colors.lineHighlight;
	}
	if (colors.cursor) {
		themeColors["editorCursor.foreground"] = colors.cursor;
	}
	if (colors.lineNumber) {
		themeColors["editorLineNumber.foreground"] = colors.lineNumber;
	}
	if (colors.lineNumberActive) {
		themeColors["editorLineNumber.activeForeground"] = colors.lineNumberActive;
	}

	return {
		base: baseTheme,
		inherit: true,
		rules,
		colors: themeColors,
	};
};

/**
 * 注册自定义主题到 Monaco
 */
const registerCustomThemes = (
	monaco: typeof import("monaco-editor"),
	themeColors?: EditorThemeColors,
) => {
	if (!themeColors) return;

	// 注册浅色自定义主题
	monaco.editor.defineTheme(
		CUSTOM_THEME_LIGHT,
		createMonacoTheme("vs", themeColors),
	);

	// 注册深色自定义主题
	monaco.editor.defineTheme(
		CUSTOM_THEME_DARK,
		createMonacoTheme("vs-dark", themeColors),
	);

	themesRegistered = true;
};

// ==============================
// 主组件
// ==============================

/**
 * CodeEditorView - 代码编辑器纯展示组件
 *
 * 纯函数式组件，只接收 props，无副作用。
 * 所有业务逻辑由 Container 组件处理。
 */
export const CodeEditorView = memo(function CodeEditorView({
	code,
	language,
	theme,
	themeColors,
	onCodeChange,
	onSave,
	readOnly = false,
	className,
	options,
}: CodeEditorViewProps) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

	/**
	 * 编辑器挂载回调
	 * 注册 Ctrl+S 快捷键和自定义主题
	 */
	const handleEditorMount: OnMount = useCallback(
		(editor, monaco) => {
			editorRef.current = editor;
			monacoRef.current = monaco;

			// 注册自定义主题
			if (themeColors) {
				registerCustomThemes(monaco, themeColors);
				// 应用自定义主题
				const customTheme = theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT;
				monaco.editor.setTheme(customTheme);
			}

			// 注册 Ctrl+S 快捷键
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
				onSave();
			});

			// 聚焦编辑器
			editor.focus();
		},
		[onSave, theme, themeColors],
	);

	/**
	 * 主题颜色变化时更新主题
	 */
	useEffect(() => {
		if (monacoRef.current && themeColors && themesRegistered) {
			registerCustomThemes(monacoRef.current, themeColors);
			const customTheme = theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT;
			monacoRef.current.editor.setTheme(customTheme);
		}
	}, [theme, themeColors]);

	/**
	 * 代码变化回调
	 */
	const handleChange = useCallback(
		(value: string | undefined) => {
			if (value !== undefined) {
				onCodeChange(value);
			}
		},
		[onCodeChange],
	);

	// 确定使用的主题
	// 如果有自定义颜色且已注册，使用自定义主题；否则使用默认主题
	const monacoTheme = themeColors && themesRegistered
		? (theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT)
		: (theme === "dark" ? "vs-dark" : "light");

	// 默认编辑器选项
	const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
		minimap: { enabled: false },
		fontSize: 14,
		lineNumbers: "on",
		wordWrap: "on",
		automaticLayout: true,
		scrollBeyondLastLine: false,
		readOnly,
		tabSize: 2,
		insertSpaces: false,
		renderWhitespace: "selection",
		bracketPairColorization: { enabled: true },
		...options,
	};

	return (
		<div className={className} style={{ height: "100%", width: "100%" }}>
			<Editor
				height="100%"
				language={language}
				value={code}
				theme={monacoTheme}
				onChange={handleChange}
				onMount={handleEditorMount}
				options={defaultOptions}
				loading={<div>Loading editor...</div>}
			/>
		</div>
	);
});
