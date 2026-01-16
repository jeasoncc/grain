import type { WikiHoverPreviewHook, WikiPreviewState } from "@grain/editor-lexical"
import { useCallback, useEffect, useRef, useState } from "react"

export function useWikiHoverPreview(): WikiHoverPreviewHook {
	const [previewState, setPreviewState] = useState<WikiPreviewState>({
		anchorElement: null,
		entryId: null,
		isVisible: false,
	})

	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>(undefined)

	// Clear timeout when component unmounts or timeout changes
	useEffect(() => {
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
		}
	}, [timeoutId])

	const showPreview = useCallback(
		(entryId: string, anchorElement: HTMLElement) => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}

			// Slight delay to avoid flickering when moving fast
			const newTimeoutId = setTimeout(() => {
				setPreviewState({
					anchorElement,
					entryId,
					isVisible: true,
				})
				setTimeoutId(undefined)
			}, 300)
			setTimeoutId(newTimeoutId)
		},
		[timeoutId],
	)

	const hidePreview = useCallback(() => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}

		// Delay hiding to allow moving mouse to the tooltip
		const newTimeoutId = setTimeout(() => {
			setPreviewState((prev) => ({
				...prev,
				isVisible: false,
			}))
			setTimeoutId(undefined)
		}, 300)
		setTimeoutId(newTimeoutId)
	}, [timeoutId])

	const hidePreviewImmediately = useCallback(() => {
		if (timeoutId) {
			clearTimeout(timeoutId)
			setTimeoutId(undefined)
		}
		setPreviewState((prev) => ({
			...prev,
			isVisible: false,
		}))
	}, [timeoutId])

	return {
		hidePreview,
		hidePreviewImmediately,
		previewState,
		showPreview,
	}
}
