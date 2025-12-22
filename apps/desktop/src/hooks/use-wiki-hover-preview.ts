import type { WikiHoverPreviewHook, WikiPreviewState } from "@grain/editor";
import { useCallback, useRef, useState } from "react";

export function useWikiHoverPreview(): WikiHoverPreviewHook {
	const [previewState, setPreviewState] = useState<WikiPreviewState>({
		isVisible: false,
		entryId: null,
		anchorElement: null,
	});

	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	const showPreview = useCallback(
		(entryId: string, anchorElement: HTMLElement) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Slight delay to avoid flickering when moving fast
			timeoutRef.current = setTimeout(() => {
				setPreviewState({
					isVisible: true,
					entryId,
					anchorElement,
				});
			}, 300);
		},
		[],
	);

	const hidePreview = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// Delay hiding to allow moving mouse to the tooltip
		timeoutRef.current = setTimeout(() => {
			setPreviewState((prev) => ({
				...prev,
				isVisible: false,
			}));
		}, 300);
	}, []);

	const hidePreviewImmediately = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setPreviewState((prev) => ({
			...prev,
			isVisible: false,
		}));
	}, []);

	return {
		previewState,
		showPreview,
		hidePreview,
		hidePreviewImmediately,
	};
}
