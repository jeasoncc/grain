/**
 * Global Search提供者
 * 处理Global Search快捷键和状态
 */
import { type ReactNode, useEffect, useState } from "react";
import { GlobalSearchDialogConnected } from "./global-search-dialog-connected";

interface GlobalSearchProviderProps {
	children: ReactNode;
	workspaceId?: string;
}

export function GlobalSearchProvider({
	children,
	workspaceId,
}: GlobalSearchProviderProps) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Ctrl/Cmd + Shift + F 打开Global Search
			if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === "F"
			) {
				event.preventDefault();
				setIsOpen(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<>
			{children}
			<GlobalSearchDialogConnected
				open={isOpen}
				onOpenChange={setIsOpen}
				workspaceId={workspaceId}
			/>
		</>
	);
}
