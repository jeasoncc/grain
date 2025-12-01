/**
 * 全局搜索提供者
 * 处理全局搜索快捷键和状态
 */
import { type ReactNode, useEffect, useState } from "react";
import { GlobalSearchDialog } from "./global-search-dialog";

interface GlobalSearchProviderProps {
	children: ReactNode;
	projectId?: string;
}

export function GlobalSearchProvider({
	children,
	projectId,
}: GlobalSearchProviderProps) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Ctrl/Cmd + Shift + F 打开全局搜索
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
			<GlobalSearchDialog
				open={isOpen}
				onOpenChange={setIsOpen}
				projectId={projectId}
			/>
		</>
	);
}
