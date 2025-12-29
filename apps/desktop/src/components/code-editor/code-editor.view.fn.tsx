/**
 * CodeEditorView 组件
 *
 * 基于 Monaco Editor 的纯展示组件
 * 提供语法高亮、自动补全、快捷键支持等专业代码编辑体验
 */
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { memo, useCallback, useRef } from "react";
import { registerAllLanguages } from "./code-editor.languages";
import type { CodeEditorViewProps } from "./code-editor.types";

/**
 * CodeEditorView - 纯函数式代码编辑器展示组件
 *
 * 特性：
 * - 支持 PlantUML、Mermaid、JSON、Markdown 等语言的语法高亮
 * - 支持 light/dark 主题切换
 * - 支持 Ctrl+S 快捷键保存
 * - 自动布局适应容器大小
 * - 使用 memo 优化渲染性能
 *
 * @example
 * ```tsx
 * <CodeEditorView
 *   value={code}
 *   language="mermaid"
 *   theme="dark"
 *   onChange={handleChange}
 *   onSave={handleSave}
 * />
 * ```
 */
export const CodeEditorView = memo(function CodeEditorView({
	value,
	language,
	theme,
	onChange,
	onSave,
	readOnly = false,
	options,
}: CodeEditorViewProps) {
	// 保存 Monaco 实例引用，用于后续操作
	const monacoRef = useRef<Monaco | null>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	/**
	 * 处理编辑器挂载
	 *
	 * 在编辑器挂载时：
	 * 1. 注册自定义语言（PlantUML、Mermaid）
	 * 2. 注册 Ctrl+S 快捷键
	 * 3. 阻止浏览器默认保存对话框
	 */
	const handleEditorMount: OnMount = useCallback(
		(editor, monaco) => {
			// 保存引用
			monacoRef.current = monaco;
			editorRef.current = editor;

			// 注册自定义语言
			registerAllLanguages(monaco);

			// 注册 Ctrl+S 保存快捷键
			// KeyMod.CtrlCmd 在 Windows/Linux 上是 Ctrl，在 macOS 上是 Cmd
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
				// 阻止默认行为并调用保存回调
				onSave?.();
			});

			// 聚焦编辑器
			editor.focus();
		},
		[onSave],
	);

	/**
	 * 处理内容变化
	 *
	 * Monaco Editor 的 onChange 可能返回 undefined，需要处理
	 */
	const handleChange = useCallback(
		(newValue: string | undefined) => {
			onChange(newValue ?? "");
		},
		[onChange],
	);

	/**
	 * 处理编辑器加载前的配置
	 *
	 * 在 Monaco 加载前注册自定义语言，确保语言定义在编辑器创建前就绑定
	 */
	const handleBeforeMount = useCallback((monaco: Monaco) => {
		registerAllLanguages(monaco);
	}, []);

	return (
		<Editor
			value={value}
			language={language}
			theme={theme === "dark" ? "vs-dark" : "light"}
			onChange={handleChange}
			onMount={handleEditorMount}
			beforeMount={handleBeforeMount}
			options={{
				// 只读模式
				readOnly,
				// 禁用 minimap，节省空间
				minimap: { enabled: false },
				// 显示行号
				lineNumbers: "on",
				// 自动换行
				wordWrap: "on",
				// 字体大小
				fontSize: 14,
				// Tab 大小
				tabSize: 2,
				// 自动布局，响应容器大小变化
				automaticLayout: true,
				// 不在最后一行后滚动
				scrollBeyondLastLine: false,
				// 平滑滚动
				smoothScrolling: true,
				// 光标平滑动画
				cursorSmoothCaretAnimation: "on",
				// 括号匹配高亮
				matchBrackets: "always",
				// 自动闭合括号
				autoClosingBrackets: "always",
				// 自动闭合引号
				autoClosingQuotes: "always",
				// 渲染空白字符
				renderWhitespace: "selection",
				// 折叠控制
				folding: true,
				// 折叠策略
				foldingStrategy: "indentation",
				// 显示折叠控件
				showFoldingControls: "mouseover",
				// 行高
				lineHeight: 20,
				// 内边距
				padding: { top: 8, bottom: 8 },
				// 滚动条设置
				scrollbar: {
					vertical: "auto",
					horizontal: "auto",
					verticalScrollbarSize: 10,
					horizontalScrollbarSize: 10,
				},
				// 覆盖用户传入的选项
				...options,
			}}
			// 加载状态显示
			loading={
				<div className="flex h-full w-full items-center justify-center text-muted-foreground">
					加载编辑器中...
				</div>
			}
		/>
	);
});
