/**
 * 字数统计徽章 - 浮动显示当前字数
 */

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WordCountBadgeProps {
	wordCount: number;
	show?: boolean;
}

export function WordCountBadge({
	wordCount,
	show = true,
}: WordCountBadgeProps) {
	const [visible, setVisible] = useState(false);
	const [lastCount, setLastCount] = useState(wordCount);

	// 字数变化时显示徽章
	useEffect(() => {
		if (wordCount !== lastCount && show) {
			setVisible(true);
			setLastCount(wordCount);

			const timer = setTimeout(() => {
				setVisible(false);
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [wordCount, lastCount, show]);

	if (!show) return null;

	return (
		<div
			className={cn(
				"fixed bottom-12 right-6 z-40",
				"flex items-center gap-2 px-3 py-1.5",
				"bg-background/90 backdrop-blur-sm",
				"border border-border/50 rounded-lg shadow-sm",
				"text-xs font-medium text-muted-foreground",
				"transition-all duration-300",
				visible
					? "opacity-100 translate-y-0"
					: "opacity-0 translate-y-4 pointer-events-none",
			)}
		>
			<FileText className="size-3.5 text-primary/70" />
			<span className="tabular-nums text-foreground">
				{wordCount.toLocaleString()}
			</span>
			<span>字</span>
		</div>
	);
}
