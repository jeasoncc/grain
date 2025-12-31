/**
 * CodeHighlightPlugin - 代码块语法高亮插件
 *
 * 使用 @lexical/code 的 registerCodeHighlighting 函数
 * 为代码块提供语法高亮支持
 *
 * 支持的语言包括：JavaScript、TypeScript、Python、Java、C、C++、
 * Go、Rust、Ruby、PHP、SQL、HTML、CSS、JSON、Markdown 等
 */

import { registerCodeHighlighting } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

/**
 * 代码高亮插件
 *
 * 在编辑器挂载时注册代码高亮功能，
 * 使用 Prism.js 作为默认的 tokenizer
 */
export default function CodeHighlightPlugin(): null {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		// 注册代码高亮，使用默认的 PrismTokenizer
		return registerCodeHighlighting(editor);
	}, [editor]);

	return null;
}
