/**
 * Global Search侧边栏 - 类似 VSCode 的搜索面板
 */

import { useNavigate } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronRight,
	FileText,
	Filter,
	Globe,
	Loader2,
	Search,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "@/domain/search";
import { cn } from "@/lib/utils";
import logger from "@/log";

const typeIcons: Record<SearchResultType, any> = {
	project: FileText,
	node: FileText,
};

const typeLabels: Record<SearchResultType, string> = {
	project: "Workspace",
	node: "File",
};

const typeColors: Record<SearchResultType, string> = {
	project: "text-purple-500",
	node: "text-blue-500",
};

export function SearchSidebar() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedTypes, setSelectedTypes] = useState<SearchResultType[]>([
		"node",
	]);
	const [showFilters, setShowFilters] = useState(false);
	const navigate = useNavigate();

	// 按类型分组结果
	const groupedResults = results.reduce(
		(acc, result) => {
			if (!acc[result.type]) {
				acc[result.type] = [];
			}
			acc[result.type].push(result);
			return acc;
		},
		{} as Record<SearchResultType, SearchResult[]>,
	);

	// Execute Search
	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}

			setLoading(true);
			try {
				const searchResults = await searchEngine.simpleSearch(searchQuery, {
					types: selectedTypes,
					limit: 100,
				});
				setResults(searchResults);
			} catch (error) {
				logger.error("Search failed:", error);
				setResults([]);
			} finally {
				setLoading(false);
			}
		},
		[selectedTypes],
	);

	// Debounced Search
	useEffect(() => {
		const timer = setTimeout(() => {
			performSearch(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query, performSearch]);

	// 选择结果
	const handleSelectResult = (result: SearchResult) => {
		switch (result.type) {
			case "node":
			case "project":
				// Navigate to Home
				navigate({ to: "/" });
				break;
		}
	};

	// 切换类型过滤
	const toggleType = (type: SearchResultType) => {
		setSelectedTypes((prev) =>
			prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
		);
	};

	// 高亮匹配文本
	const highlightText = (text: string, query: string) => {
		if (!query.trim()) return text;

		const parts = text.split(new RegExp(`(${query})`, "gi"));
		return parts.map((part, index) =>
			part.toLowerCase() === query.toLowerCase() ? (
				<mark
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
		<div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border/30">
			{/* 头部 */}
			<div className="p-4 space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold">搜索</h2>
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={() => setShowFilters(!showFilters)}
					>
						<Filter className="size-4" />
					</Button>
				</div>

				{/* 搜索输入 */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="搜索..."
						className="pl-9 pr-9 h-9"
					/>
					{query && (
						<Button
							size="icon"
							variant="ghost"
							className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
							onClick={() => setQuery("")}
						>
							<X className="size-3" />
						</Button>
					)}
				</div>

				{/* 过滤器 */}
				{showFilters && (
					<div className="space-y-2 p-3 rounded-lg border bg-muted/50">
						<p className="text-xs font-medium text-muted-foreground">
							搜索范围
						</p>
						<div className="space-y-2">
							{(["node"] as SearchResultType[]).map((type) => (
								<div key={type} className="flex items-center space-x-2">
									<Checkbox
										id={`type-${type}`}
										checked={selectedTypes.includes(type)}
										onCheckedChange={() => toggleType(type)}
									/>
									<Label
										htmlFor={`type-${type}`}
										className="text-sm cursor-pointer"
									>
										{typeLabels[type]}
									</Label>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 结果统计 */}
				{query && (
					<div className="text-xs text-muted-foreground">
						{loading ? (
							<span className="flex items-center gap-2">
								<Loader2 className="size-3 animate-spin" />
								搜索中...
							</span>
						) : (
							<span>找到 {results.length} 个结果</span>
						)}
					</div>
				)}
			</div>

			<Separator />

			{/* 搜索结果 */}
			<ScrollArea className="flex-1">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : results.length > 0 ? (
					<div className="p-2 space-y-2">
						{Object.entries(groupedResults).map(([type, typeResults]) => (
							<ResultGroup
								key={type}
								type={type as SearchResultType}
								results={typeResults}
								query={query}
								onSelect={handleSelectResult}
								highlightText={highlightText}
							/>
						))}
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
		</div>
	);
}

// 结果分组组件
function ResultGroup({
	type,
	results,
	query,
	onSelect,
	highlightText,
}: {
	type: SearchResultType;
	results: SearchResult[];
	query: string;
	onSelect: (result: SearchResult) => void;
	highlightText: (text: string, query: string) => React.ReactNode;
}) {
	const [isOpen, setIsOpen] = useState(true);
	const Icon = typeIcons[type];

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex w-full items-center gap-2 p-2 hover:bg-accent rounded-md text-sm font-medium">
				{isOpen ? (
					<ChevronDown className="size-4" />
				) : (
					<ChevronRight className="size-4" />
				)}
				<Icon className={cn("size-4", typeColors[type])} />
				<span>
					{typeLabels[type]} ({results.length})
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-1 mt-1">
				{results.map((result) => (
					<button
						type="button"
						key={result.id}
						onClick={() => onSelect(result)}
						className="w-full text-left p-2 pl-8 rounded-md hover:bg-accent transition-colors"
					>
						<div className="space-y-1">
							<p className="text-sm font-medium truncate">
								{highlightText(result.title, query)}
							</p>
							{result.workspaceTitle && (
								<p className="text-xs text-muted-foreground truncate">
									{result.workspaceTitle}
								</p>
							)}
							{result.excerpt && (
								<p className="text-xs text-muted-foreground line-clamp-2">
									{highlightText(result.excerpt, query)}
								</p>
							)}
						</div>
					</button>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}
