/**
 * Global Search 组件
 *
 * 纯展示组件，通过 props 接收搜索函数
 */

import { useNavigate } from "@tanstack/react-router";
import { FileText, Loader2, Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { GlobalSearchViewProps, SearchResult, SearchResultType } from "./global-search.types";

const typeIcons: Record<
	SearchResultType,
	React.ComponentType<{ className?: string }>
> = {
	project: FileText,
	node: FileText,
};

const typeLabels: Record<SearchResultType, string> = {
	project: "项目",
	node: "文件",
};

const typeColors: Record<SearchResultType, string> = {
	project: "bg-purple-500/10 text-purple-500",
	node: "bg-blue-500/10 text-blue-500",
};

export const GlobalSearchView = memo(({
	open,
	onOpenChange,
	onSearch,
}: GlobalSearchViewProps) => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const navigate = useNavigate();

	// Execute Search
	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}

			setLoading(true);
			try {
				const searchResults = await onSearch(searchQuery, { limit: 30 });
				setResults(searchResults);
				setSelectedIndex(0);
			} catch (error) {
				console.error("Search failed:", error);
				setResults([]);
			} finally {
				setLoading(false);
			}
		},
		[onSearch],
	);

	// Debounced Search
	useEffect(() => {
		const timer = setTimeout(() => {
			performSearch(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query, performSearch]);

	// 选择结果
	const handleSelectResult = useCallback(
		(result: SearchResult) => {
			onOpenChange(false);

			// 根据类型导航到对应页面
			switch (result.type) {
				case "node":
				case "project":
					// Navigate to Home，通过文件树打开
					navigate({ to: "/" });
					break;
			}

			// 清空搜索
			setQuery("");
			setResults([]);
		},
		[onOpenChange, navigate],
	);

	// Keyboard Navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!open) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) => Math.max(prev - 1, 0));
					break;
				case "Enter":
					e.preventDefault();
					if (results[selectedIndex]) {
						handleSelectResult(results[selectedIndex]);
					}
					break;
				case "Escape":
					e.preventDefault();
					onOpenChange(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, results, selectedIndex, onOpenChange, handleSelectResult]);

	// 高亮匹配文本
	const highlightText = (text: string, query: string) => {
		if (!query.trim()) return text;

		const parts = text.split(new RegExp(`(${query})`, "gi"));
		return parts.map((part, index) =>
			part.toLowerCase() === query.toLowerCase() ? (
				<mark
					// biome-ignore lint/suspicious/noArrayIndexKey: 文本片段顺序稳定
					key={index}
					className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground"
				>
					{part}
				</mark>
			) : (
				part
			),
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl p-0 gap-0">
				<DialogHeader className="px-4 pt-4 pb-0">
					<DialogTitle className="sr-only">Global Search</DialogTitle>
				</DialogHeader>

				{/* 搜索输入 */}
				<div className="relative px-4 py-3">
					<Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="搜索文件..."
						className="pl-9 pr-9"
						autoFocus
					/>
					{query && (
						<Button
							size="icon"
							variant="ghost"
							className="absolute right-7 top-1/2 -translate-y-1/2 size-6"
							onClick={() => setQuery("")}
						>
							<X className="size-3" />
						</Button>
					)}
				</div>

				<Separator />

				{/* 搜索结果 */}
				<ScrollArea className="max-h-[400px]">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : results.length > 0 ? (
						<div className="p-2">
							{results.map((result, index) => {
								const Icon = typeIcons[result.type];
								return (
									<button
										type="button"
										key={result.id}
										onClick={() => handleSelectResult(result)}
										className={cn(
											"w-full text-left p-3 rounded-lg transition-colors",
											"hover:bg-accent",
											index === selectedIndex && "bg-accent",
										)}
									>
										<div className="flex items-start gap-3">
											<div
												className={cn(
													"p-2 rounded-md",
													typeColors[result.type],
												)}
											>
												<Icon className="size-4" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<p className="font-medium text-sm truncate">
														{highlightText(result.title, query)}
													</p>
													<Badge variant="secondary" className="text-xs">
														{typeLabels[result.type]}
													</Badge>
												</div>
												{result.workspaceTitle && (
													<p className="text-xs text-muted-foreground mb-1">
														{result.workspaceTitle}
													</p>
												)}
												<p className="text-xs text-muted-foreground line-clamp-2">
													{highlightText(result.excerpt, query)}
												</p>
											</div>
										</div>
									</button>
								);
							})}
						</div>
					) : query.trim() ? (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Search className="size-12 mb-3 opacity-20" />
							<p className="text-sm">未找到匹配结果</p>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Search className="size-12 mb-3 opacity-20" />
							<p className="text-sm">输入关键词开始搜索</p>
							<p className="text-xs mt-1">支持搜索文件内容</p>
						</div>
					)}
				</ScrollArea>

				{/* 快捷键提示 */}
				{results.length > 0 && (
					<>
						<Separator />
						<div className="px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								<kbd className="px-1.5 py-0.5 rounded bg-muted">↑</kbd>
								<kbd className="px-1.5 py-0.5 rounded bg-muted">↓</kbd>
								<span>导航</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="px-1.5 py-0.5 rounded bg-muted">Enter</kbd>
								<span>选择</span>
							</div>
							<div className="flex items-center gap-1">
								<kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd>
								<span>关闭</span>
							</div>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
});

GlobalSearchView.displayName = "GlobalSearchView";
