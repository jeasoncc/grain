/**
 * 搜索面板 - View 组件
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 */

import {
	ChevronDown,
	ChevronRight,
	FileText,
	Filter,
	Loader2,
	Search,
	X,
} from "lucide-react";
import { memo, useState } from "react";
import { Button } from "@/views/ui/button";
import { Checkbox } from "@/views/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/views/ui/collapsible";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { ScrollArea } from "@/views/ui/scroll-area";
import type { SearchResult, SearchResultType } from "@/flows/search";
import { cn } from "@/utils/cn.util";
import type {
	ResultGroupProps,
	SearchPanelViewProps,
} from "./search-panel.types";

const typeIcons: Record<SearchResultType, any> = {
	project: FileText,
	node: FileText,
};

const typeLabels: Record<SearchResultType, string> = {
	project: "项目",
	node: "文件",
};

const typeColors: Record<SearchResultType, string> = {
	project: "text-purple-500",
	node: "text-blue-500",
};

export const SearchPanelView = memo(
	({
		searchState,
		results,
		loading,
		onSetSearchQuery,
		onToggleType,
		onSetSearchShowFilters,
		onSelectResult,
	}: SearchPanelViewProps) => {
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

		// 高亮匹配文本
		const highlightText = (text: string, query: string) => {
			if (!query.trim()) return text;

			const parts = text.split(new RegExp(`(${query})`, "gi"));
			return parts.map((part, index) =>
				part.toLowerCase() === query.toLowerCase() ? (
					<mark
						key={`highlight-${query}-${index}-${part}`}
						className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground"
					>
						{part}
					</mark>
				) : (
					<span key={`text-${index}-${part.slice(0, 10)}`}>{part}</span>
				),
			);
		};

		return (
			<div className="flex h-full flex-col">
				{/* 头部 */}
				<div className="p-4 space-y-3 border-b border-sidebar-border/10">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold text-foreground/80 tracking-wide pl-1">
							Search
						</h2>
						<Button
							variant="ghost"
							size="icon"
							className="size-7 hover:bg-sidebar-accent hover:text-foreground rounded-sm"
							onClick={() => onSetSearchShowFilters(!searchState.showFilters)}
							title="Toggle filters"
						>
							<Filter className="size-4" />
						</Button>
					</div>

					{/* 搜索输入 */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
						<Input
							value={searchState.query}
							onChange={(e) => onSetSearchQuery(e.target.value)}
							placeholder="Search..."
							className="pl-9 pr-9 h-9 text-sm bg-background/50 focus:bg-background transition-colors"
						/>
						{searchState.query && (
							<Button
								size="icon"
								variant="ghost"
								className="absolute right-1 top-1/2 -translate-y-1/2 size-7 hover:bg-transparent"
								onClick={() => onSetSearchQuery("")}
							>
								<X className="size-4 text-muted-foreground hover:text-foreground" />
							</Button>
						)}
					</div>

					{/* 过滤器 */}
					{searchState.showFilters && (
						<div className="space-y-2 p-3 rounded-md border bg-muted/30 text-sm">
							<p className="font-medium text-muted-foreground mb-2">Scope</p>
							<div className="space-y-2">
								{(["node", "wiki"] as SearchResultType[]).map((type) => (
									<div key={type} className="flex items-center space-x-2">
										<Checkbox
											id={`type-${type}`}
											checked={searchState.selectedTypes.includes(type)}
											onCheckedChange={() => onToggleType(type)}
											className="size-4"
										/>
										<Label
											htmlFor={`type-${type}`}
											className="text-sm cursor-pointer font-normal"
										>
											{typeLabels[type]}
										</Label>
									</div>
								))}
							</div>
						</div>
					)}

					{/* 结果统计 */}
					{searchState.query && (
						<div className="text-xs text-muted-foreground px-1">
							{loading ? (
								<span className="flex items-center gap-2">
									<Loader2 className="size-3.5 animate-spin" />
									Searching...
								</span>
							) : (
								<span>Found {results.length} results</span>
							)}
						</div>
					)}
				</div>

				{/* 搜索结果 */}
				<ScrollArea className="flex-1">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-5 animate-spin text-muted-foreground/50" />
						</div>
					) : results.length > 0 ? (
						<div className="p-2 space-y-1">
							{Object.entries(groupedResults).map(([type, typeResults]) => (
								<ResultGroup
									key={type}
									type={type as SearchResultType}
									results={typeResults}
									query={searchState.query}
									onSelect={onSelectResult}
									highlightText={highlightText}
								/>
							))}
						</div>
					) : searchState.query.trim() ? (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Search className="size-8 mb-2 opacity-20" />
							<p className="text-xs">No results found</p>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Search className="size-8 mb-2 opacity-20" />
							<p className="text-xs">Type to search</p>
						</div>
					)}
				</ScrollArea>
			</div>
		);
	},
);

SearchPanelView.displayName = "SearchPanelView";

// 结果分组组件
const ResultGroup = memo(
	({ type, results, query, onSelect, highlightText }: ResultGroupProps) => {
		const [isOpen, setIsOpen] = useState(true);
		const Icon = typeIcons[type];

		return (
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger className="flex w-full items-center gap-2 p-2 px-3 hover:bg-sidebar-accent/50 rounded-sm text-sm font-semibold text-muted-foreground group">
					{isOpen ? (
						<ChevronDown className="size-3.5 text-muted-foreground/70 group-hover:text-foreground" />
					) : (
						<ChevronRight className="size-3.5 text-muted-foreground/70 group-hover:text-foreground" />
					)}
					<Icon className={cn("size-4", typeColors[type])} />
					<span className="group-hover:text-foreground transition-colors">
						{typeLabels[type]}{" "}
						<span className="opacity-50 ml-1 font-normal">
							({results.length})
						</span>
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="space-y-0.5 mt-0.5">
					{results.map((result) => (
						<button
							type="button"
							key={result.id}
							onClick={() => onSelect(result)}
							className="w-full text-left py-2 pl-9 pr-2 rounded-sm hover:bg-sidebar-accent transition-colors group/item"
						>
							<div className="space-y-0.5">
								<p className="text-sm font-medium truncate text-foreground/80 group-hover/item:text-foreground">
									{highlightText(result.title, query)}
								</p>
								{result.workspaceTitle && (
									<p className="text-xs text-muted-foreground/60 truncate">
										{result.workspaceTitle}
									</p>
								)}
								{result.excerpt && (
									<p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
										{highlightText(result.excerpt, query)}
									</p>
								)}
							</div>
						</button>
					))}
				</CollapsibleContent>
			</Collapsible>
		);
	},
);

ResultGroup.displayName = "ResultGroup";
