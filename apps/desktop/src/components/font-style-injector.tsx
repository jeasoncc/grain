// 字体样式注入器 - 将字体设置应用到全局
import { useEffect } from "react";
import { AVAILABLE_FONTS, useFontSettings } from "@/stores/font";

export function FontStyleInjector() {
	const {
		fontFamily,
		uiFontFamily,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
	} = useFontSettings();

	useEffect(() => {
		const font = AVAILABLE_FONTS.find((f) => f.value === fontFamily);
		const uiFont = AVAILABLE_FONTS.find((f) => f.value === uiFontFamily);
		if (!font) return;

		// 创建或更新 style 标签
		let styleEl = document.getElementById(
			"font-settings-style",
		) as HTMLStyleElement;
		if (!styleEl) {
			styleEl = document.createElement("style");
			styleEl.id = "font-settings-style";
			document.head.appendChild(styleEl);
		}

		// 应用字体设置到编辑器和全局
		styleEl.textContent = `
      /* 全局 UI 字体设置 */
      :root {
        --font-sans: ${uiFont ? uiFont.family : "system-ui, sans-serif"};
      }
      
      body {
        font-family: var(--font-sans);
      }

      /* 编辑器字体设置 */
      .editor-container,
      .editor-container p,
      .editor-container div[contenteditable="true"],
      .ProseMirror,
      .lexical-editor {
        font-family: ${font.family} !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        letter-spacing: ${letterSpacing}em !important;
      }

      /* 段落样式 */
      .editor-container p,
      .ProseMirror p,
      .lexical-editor p {
        text-indent: ${firstLineIndent}em !important;
        margin-bottom: ${paragraphSpacing}em !important;
      }

      /* 光标优化 */
      .editor-container [contenteditable="true"],
      .ProseMirror,
      .lexical-editor {
        caret-color: hsl(var(--primary));
      }

      /* 选中文本高亮 */
      .editor-container ::selection,
      .ProseMirror ::selection,
      .lexical-editor ::selection {
        background-color: var(--editor-selection);
      }
    `;

		return () => {
			// 清理
			if (styleEl && styleEl.parentNode) {
				styleEl.parentNode.removeChild(styleEl);
			}
		};
	}, [
		fontFamily,
		uiFontFamily,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
	]);

	return null;
}
