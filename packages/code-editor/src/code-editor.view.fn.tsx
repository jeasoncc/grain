/**
 * @file code-editor.view.fn.tsx
 * @description CodeEditor 纯展示组件
 *
 * 基于 Monaco Editor 的代码编辑器组件。
 * 支持语法高亮、代码补全、Ctrl+S 保存快捷键。
 *
 * @requirements 5.1, 5.4
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import { memo, useCallback, useRef } from "react";
import type { editor } from "monaco-editor";
import type { CodeEditorViewProps } from "./code-editor.types";

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
	onCodeChange,
	onSave,
	readOnly = false,
	className,
	options,
}: CodeEditorViewProps) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	/**
	 * 编辑器挂载回调
	 * 注册 Ctrl+S 快捷键
	 */
	const handleEditorMount: OnMount = useCallback(
		(editor, monaco) => {
			editorRef.current = editor;

			// 注册 Ctrl+S 快捷键
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
				onSave();
			});

			// 聚焦编辑器
			editor.focus();
		},
		[onSave],
	);

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

	// Monaco 主题映射
	const monacoTheme = theme === "dark" ? "vs-dark" : "light";

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
