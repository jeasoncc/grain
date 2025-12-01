/**
 * 全局搜索对话框
 * 支持跨项目、章节、场景的全文搜索
 */

import { useNavigate } from "@tanstack/react-router";
import {
	ChevronRight,
	FileText,
	Globe,
	Loader2,
	Search,
	User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type SearchResult, searchEngine } from "@/services/search";

interface GlobalSearchDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId?: string;
}

export function GlobalSearchDialog({
	open,
	onOpenChange,
	projectId,
}: GlobalSearchDialogProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// 执行搜索
	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}

			setIsSearching(true);
			try {
				const searchResults = await searchEngine.simpleSearch(searchQuery, {
					projectId,
					limit: 50,
				});
				setResults(searchResults);
				setSelectedIndex(0);
			} catch (error) {
				console.error("搜索失败:", error);
			} finally {
				setIsSearching(false);
			}
		},
		[projectId],
	);

	// 防抖搜索
	useEffect(() => {
		const timer = setTimeout(() => {
			performSearch(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query, performSearch]);

	// 键盘导航
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!open) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev < results.length - 1 ? prev + 1 : prev,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
					break;
				case "Enter":
					e.preventDefault();
					if (results[selectedIndex]) {
						handleResultClick(results[selectedIndex]);
					}
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, results, selectedIndex]);

	// 处理结果点击
	const handleResultClick = (result: SearchResult) => {
		onOpenChange(false);

		// 根据类型导航到相应页面
		switch (result.type) {
			case "scene":
				navigate({
					to: "/projects/$projectId",
					params: { projectId: result.projectId! },
					search: { sceneId: result.id },
				});
				break;
			case "role":
				navigate({
					to: "/characters",
					search: { roleId: result.id },
				});
				break;
			case "world":
				navigate({
					to: "/world",
					search: { entryId: result.id },
				});
				break;
		}
	};

	// 获取类型图标
	const getTypeIcon = (type: string) => {
		switch (type) {
			case "scene":
				return <FileText className="h-4 w-4" />;
			case "role":
				return <User className="h-4 w-4" />;
			case "world":
				return <Globe className="h-4 w-4" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	// 获取类型标签
	const getTypeLabel = (type: string) => {
		switch (type) {
			case "scene":
				return "场景";
			case "role":
				return "角色";
			case "world":
				return "世界观";
			default:
				return type;
		}
	};

	// 高亮搜索词
	const highlightText = (text: string, query: string) => {
		if (!query) return text;

		const parts = text.split(new RegExp(`(${query})`, "gi"));
		return (
			<>
				{parts.map((part, i) =>
					part.toLowerCase() === query.toLowerCase() ? (
						<mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
							{part}
						</mark>
					) : (
						part
					),
				)}
			</>
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl p-0">
				<DialogHeader className="px-6 pt-6">
					<DialogTitle>全局搜索</DialogTitle>
					<DialogDescription>搜索项目中的场景、角色和世界观</DialogDescription>
				</DialogHeader>

				<div className="px-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="输入搜索内容..."
							className="pl-9"
							autoFocus
						/>
						{isSearching && (
							<Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
						)}
					</div>
				</div>

				<Separator />

				<ScrollArea className="max-h-[400px]">
					{results.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Search className="mb-4 h-12 w-12 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">
								{query ? "未找到匹配结果" : "输入关键词开始搜索"}
							</p>
						</div>
					) : (
						<div className="space-y-1 p-2">
							{results.map((result, index) => (
								<button
									key={`${result.type}-${result.id}`}
									onClick={() => handleResultClick(result)}
									className={cn(
										"w-full rounded-lg p-3 text-left transition-colors",
										"hover:bg-accent",
										selectedIndex === index && "bg-accent",
									)}
								>
									<div className="flex items-start gap-3">
										<div className="mt-1 text-muted-foreground">
											{getTypeIcon(result.type)}
										</div>
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-medium">
													{highlightText(result.title, query)}
												</span>
												<Badge variant="secondary" className="text-xs">
													{getTypeLabel(result.type)}
												</Badge>
											</div>
											{result.excerpt && (
												<p className="line-clamp-2 text-sm text-muted-foreground">
													{highlightText(result.excerpt, query)}
												</p>
											)}
											{result.projectTitle && (
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<span>{result.projectTitle}</span>
													{result.chapterTitle && (
														<>
															<ChevronRight className="h-3 w-3" />
															<span>{result.chapterTitle}</span>
														</>
													)}
												</div>
											)}
										</div>
									</div>
								</button>
							))}
						</div>
					)}
				</ScrollArea>

				{results.length > 0 && (
					<>
						<Separator />
						<div className="px-6 py-3 text-xs text-muted-foreground">
							找到 {results.length} 个结果 · 使用 ↑↓ 导航 · Enter 打开
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
