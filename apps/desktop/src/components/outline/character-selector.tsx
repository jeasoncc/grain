/**
 * Wiki 条目选择器组件
 */

import { BookOpen, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWikiEntriesByProject } from "@/services/wiki";

interface CharacterSelectorProps {
	projectId: string;
	selectedCharacters: string[];
	onChange: (characters: string[]) => void;
}

export function CharacterSelector({
	projectId,
	selectedCharacters,
	onChange,
}: CharacterSelectorProps) {
	const wikiEntries = useWikiEntriesByProject(projectId);
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const selectedEntries = useMemo(
		() => wikiEntries.filter((w) => selectedCharacters.includes(w.id)),
		[wikiEntries, selectedCharacters],
	);

	const availableEntries = useMemo(() => {
		const filtered = wikiEntries.filter((w) => !selectedCharacters.includes(w.id));

		if (!search) return filtered;

		const query = search.toLowerCase();
		return filtered.filter(
			(w) =>
				w.name.toLowerCase().includes(query) ||
				w.alias?.some((a) => a.toLowerCase().includes(query)),
		);
	}, [wikiEntries, selectedCharacters, search]);

	const handleAdd = (entryId: string) => {
		onChange([...selectedCharacters, entryId]);
		setSearch("");
	};

	const handleRemove = (entryId: string) => {
		onChange(selectedCharacters.filter((id) => id !== entryId));
	};

	return (
		<div className="flex flex-wrap gap-2">
			{selectedEntries.map((entry) => (
				<Badge
					key={entry.id}
					variant="secondary"
					className="gap-1.5 cursor-pointer hover:bg-secondary/80"
					onClick={() => handleRemove(entry.id)}
				>
					<BookOpen className="size-3" />
					{entry.name}
					<X className="size-3" />
				</Badge>
			))}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button size="sm" variant="outline" className="h-6 px-2 text-xs">
						<Plus className="size-3 mr-1" />
						添加条目
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-64 p-2" align="start">
					<Input
						placeholder="搜索 Wiki 条目..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 mb-2"
					/>
					<ScrollArea className="h-48">
						{availableEntries.length === 0 ? (
							<div className="text-sm text-muted-foreground text-center py-4">
								{search ? "未找到条目" : "暂无可选条目"}
							</div>
						) : (
							<div className="space-y-1">
								{availableEntries.map((entry) => (
									<button
										key={entry.id}
										onClick={() => {
											handleAdd(entry.id);
											setOpen(false);
										}}
										className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm"
									>
										<BookOpen className="size-4 text-muted-foreground" />
										<span>{entry.name}</span>
										{entry.alias && entry.alias.length > 0 && (
											<span className="text-xs text-muted-foreground">
												({entry.alias[0]})
											</span>
										)}
									</button>
								))}
							</div>
						)}
					</ScrollArea>
				</PopoverContent>
			</Popover>
		</div>
	);
}
