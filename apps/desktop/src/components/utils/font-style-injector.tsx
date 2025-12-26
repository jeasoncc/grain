// Font Style Injector - Apply font settings globally
import { useEffect, useRef } from "react";
import { useFontSettings } from "@/stores/font.store";
import { CARD_SIZE_OPTIONS, UI_SCALE_OPTIONS } from "@/types/font";

export function FontStyleInjector() {
	const {
		fontFamily,
		uiFontFamily,
		uiFontSize,
		uiScale,
		cardSize,
		cardBorderRadius,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
	} = useFontSettings();

	const rafRef = useRef<number | null>(null);
	const styleElRef = useRef<HTMLStyleElement | null>(null);

	useEffect(() => {
		// Cancel any pending update
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
		}

		// Use requestAnimationFrame to batch DOM updates
		rafRef.current = requestAnimationFrame(() => {
			const scaleOption = UI_SCALE_OPTIONS.find((s) => s.value === uiScale);
			const cardSizeOption = CARD_SIZE_OPTIONS.find(
				(c) => c.value === cardSize,
			);
			const scale = scaleOption?.scale || 1;
			const cardPadding = cardSizeOption?.padding || "1rem";

			// Create style element only once
			if (!styleElRef.current) {
				const existing = document.getElementById(
					"font-settings-style",
				) as HTMLStyleElement;
				if (existing) {
					styleElRef.current = existing;
				} else {
					styleElRef.current = document.createElement("style");
					styleElRef.current.id = "font-settings-style";
					document.head.appendChild(styleElRef.current);
				}
			}

			// Apply font settings to editor and global UI
			styleElRef.current.textContent = `
      /* Global UI Font Settings */
      :root {
        --font-sans: ${uiFontFamily};
        --font-editor: ${fontFamily};
        --ui-font-size: ${uiFontSize}px;
        --ui-scale: ${scale};
        --card-padding: ${cardPadding};
        --card-border-radius: ${cardBorderRadius}px;
        --editor-font-size: ${fontSize}px;
        --editor-line-height: ${lineHeight};
        --editor-letter-spacing: ${letterSpacing}em;
        --paragraph-spacing: ${paragraphSpacing}em;
        --first-line-indent: ${firstLineIndent}em;
      }
      
      body {
        font-family: var(--font-sans);
        font-size: calc(var(--ui-font-size) * var(--ui-scale));
      }

      /* Sidebar and Navigation */
      aside,
      nav,
      .sidebar,
      [data-sidebar] {
        font-size: calc(var(--ui-font-size) * var(--ui-scale));
      }

      /* Cards and UI Components */
      .card,
      [data-card],
      [role="dialog"],
      [role="menu"] {
        font-size: calc(var(--ui-font-size) * var(--ui-scale));
        border-radius: var(--card-border-radius);
      }

      /* Card Header and Content - Use CSS Variables */
      .card-header,
      .card-content,
      .card-footer {
        padding: var(--card-padding);
      }

      /* Button Scaling */
      button,
      [role="button"] {
        font-size: calc(var(--ui-font-size) * var(--ui-scale) * 0.875);
      }

      /* Input Scaling */
      input,
      textarea,
      select {
        font-size: calc(var(--ui-font-size) * var(--ui-scale) * 0.9);
      }

      /* Label Scaling */
      label {
        font-size: calc(var(--ui-font-size) * var(--ui-scale) * 0.85);
      }

      /* Editor Font Settings */
      .editor-container,
      .editor-container p,
      .editor-container div[contenteditable="true"],
      .ProseMirror,
      .lexical-editor {
        font-family: ${fontFamily} !important;
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        letter-spacing: ${letterSpacing}em !important;
      }

      /* Paragraph Styles */
      .editor-container p,
      .ProseMirror p,
      .lexical-editor p {
        text-indent: ${firstLineIndent}em !important;
        margin-bottom: ${paragraphSpacing}em !important;
      }

      /* Cursor Optimization */
      .editor-container [contenteditable="true"],
      .ProseMirror,
      .lexical-editor {
        caret-color: hsl(var(--primary));
      }

      /* Text Selection Highlight */
      .editor-container ::selection,
      .ProseMirror ::selection,
      .lexical-editor ::selection {
        background-color: var(--editor-selection);
      }
    `;
		});

		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [
		fontFamily,
		uiFontFamily,
		uiFontSize,
		uiScale,
		cardSize,
		cardBorderRadius,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (styleElRef.current?.parentNode) {
				styleElRef.current.parentNode.removeChild(styleElRef.current);
			}
		};
	}, []);

	return null;
}
