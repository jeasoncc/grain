// Font Style Injector - Apply font settings globally
import { useEffect, useRef } from "react"
import { useFontSettings } from "@/state/font.state"
import { UI_SCALE_OPTIONS } from "@/types/font"

export function FontStyleInjector() {
	const {
		fontFamily,
		uiFontFamily,
		uiFontSize,
		uiScale,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
	} = useFontSettings()

	const rafRef = useRef<number | null>(null)
	const styleElRef = useRef<HTMLStyleElement | null>(null)

	useEffect(() => {
		// Cancel any pending update
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current)
		}

		// Use requestAnimationFrame to batch DOM updates
		rafRef.current = requestAnimationFrame(() => {
			const scaleOption = UI_SCALE_OPTIONS.find((s) => s.value === uiScale)
			const scale = scaleOption?.scale || 1

			// Create style element only once
			if (!styleElRef.current) {
				const existing = document.getElementById("font-settings-style") as HTMLStyleElement
				if (existing) {
					styleElRef.current = existing
				} else {
					styleElRef.current = document.createElement("style")
					styleElRef.current.id = "font-settings-style"
					document.head.appendChild(styleElRef.current)
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

      /* Dialogs and menus share UI typography, not card roundness. */
      [role="dialog"],
      [role="menu"] {
        font-size: calc(var(--ui-font-size) * var(--ui-scale));
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


      /* Org source lines share typography, not legacy HTML paragraph semantics. */
      .cm-editor .cm-content {
        letter-spacing: ${letterSpacing}em;
      }

    `
		})

		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current)
			}
		}
	}, [
		fontFamily,
		uiFontFamily,
		uiFontSize,
		uiScale,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
	])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (styleElRef.current?.parentNode) {
				styleElRef.current.parentNode.removeChild(styleElRef.current)
			}
		}
	}, [])

	return null
}
