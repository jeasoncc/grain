/**
 * Global Search对话框
 * 支持跨项目的全文搜索
 *
 * 纯展示组件，通过 props 接收搜索函数
 */

import { useNavigate } from "@tanstack/react-router";
import { FileText, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

/**
 * 搜索结果类型
 */
export type SearchResultType = "project" | "node";

/**
 * 搜索结果
 */
export interface SearchResult {
	id: string;
	type: SearchResultType;
	title: string;
	content: string;
	excerpt: string;
	workspaceId?: string;
	workspaceTitle?: string;
	score: number;
	highlights: string[];
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	workspaceId?: string;
	limit?: number;
}

interface GlobalSearchDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workspaceId?: string;
	/** 搜索函数 */
	onSearch: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
}

export function GlobalSearchDialog({
	open,
	onOpenChange,
	workspaceId,
	onSearch,
}: GlobalSearchDialogProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Execute Search
	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}

			setIsSearching(true);
			try {
				const searchResults = await onSearch(searchQuery, {
					workspaceId,
					limit: 50,
				});
				setResults(searchResults);
				setSelectedIndex(0);
			} catch (error) {
				console.error("Search failed:", error);
			} finally {
				setIsSearching(false);
			}
		},
		[workspaceId, onSearch],
	);

	// Debounced Search
	useEffect(() => {
		const timer = setTimeout(() => {
			performSearch(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query, performSearch]);

	// Handle Result Click
	const handleResultClick = useCallback(
		(result: SearchResult) => {
			onOpenChange(false);

			// 根据类型导航到相应页面
			switch (result.type) {
				case "node":
				case "project":
					// Navigate to Home
					navigate({ to: "/" });
					break;
			}
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
	}, [open, results, selectedIndex, handleResultClick]);

	// Get Type Icon
	const getTypeIcon = (type: string) => {
		switch (type) {
			case "node":
				return <FileText className="h-4 w-4" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	// Get Type Label
	const getTypeLabel = (type: string) => {
		switch (type) {
			case "node":
				return "File";
			default:
				return type;
		}
	};

	// Highlight Search Term
	const highlightText = (text: string, query: string) => {
		if (!query) return text;

		const parts = text.split(new RegExp(`(${query})`, "gi"));
		return (
			<>
				{parts.map((part, i) =>
					part.toLowerCase() === query.toLowerCase() ? (
						// biome-ignore lint/suspicious/noArrayIndexKey: 文本片段顺序稳定
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
					<DialogTitle>Global Search</DialogTitle>
					<DialogDescription>Search files in workspace</DialogDescription>
				</DialogHeader>

				<div className="px-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Enter search query..."
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
								{query ? "No matching results" : "Enter keywords to search"}
							</p>
						</div>
					) : (
						<div className="space-y-1 p-2">
							{results.map((result, index) => (
								<button
									type="button"
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
											{result.workspaceTitle && (
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<span>{result.workspaceTitle}</span>
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
							Found {results.length} results · Use ↑↓ to navigate · Enter to
							open
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
