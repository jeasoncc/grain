/**
 * 搜索替换插件
 * 支持当前文档内的搜索和替换功能
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import logger from "@/log";
import {
	$getRoot,
	$isElementNode,
	$isParagraphNode,
	$isTextNode,
	type LexicalNode,
	type TextNode,
} from "lexical";
import {
	CaseSensitive,
	ChevronDown,
	ChevronUp,
	Regex,
	Replace,
	Search,
	WholeWord,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SearchMatch {
	node: TextNode;
	start: number;
	end: number;
}

export function SearchReplacePlugin() {
	const [editor] = useLexicalComposerContext();
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [replaceText, setReplaceText] = useState("");
	const [caseSensitive, setCaseSensitive] = useState(false);
	const [useRegex, setUseRegex] = useState(false);
	const [wholeWord, setWholeWord] = useState(false);
	const [matches, setMatches] = useState<SearchMatch[]>([]);
	const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

	// 快捷键监听
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Ctrl/Cmd + F 打开搜索
			if ((event.ctrlKey || event.metaKey) && event.key === "f") {
				event.preventDefault();
				setIsOpen(true);
			}
			// Ctrl/Cmd + H 打开替换
			if ((event.ctrlKey || event.metaKey) && event.key === "h") {
				event.preventDefault();
				setIsOpen(true);
			}
			// Esc 关闭
			if (event.key === "Escape" && isOpen) {
				setIsOpen(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	// 搜索文本
	const performSearch = useCallback(() => {
		if (!searchText) {
			setMatches([]);
			setCurrentMatchIndex(-1);
			return;
		}

		editor.getEditorState().read(() => {
			const root = $getRoot();
			const foundMatches: SearchMatch[] = [];

			// 遍历所有文本节点
			const textNodes: TextNode[] = [];

			const collectTextNodes = (node: LexicalNode) => {
				if ($isTextNode(node)) {
					textNodes.push(node);
				} else if ($isElementNode(node)) {
					const children = node.getChildren();
					children.forEach((child) => collectTextNodes(child));
				}
			};

			root.getChildren().forEach((node) => collectTextNodes(node));

			for (const textNode of textNodes) {
				const text = textNode.getTextContent();
				let searchPattern: RegExp;

				try {
					if (useRegex) {
						searchPattern = new RegExp(searchText, caseSensitive ? "g" : "gi");
					} else {
						const escapedText = searchText.replace(
							/[.*+?^${}()|[\]\\]/g,
							"\\$&",
						);
						const pattern = wholeWord ? `\\b${escapedText}\\b` : escapedText;
						searchPattern = new RegExp(pattern, caseSensitive ? "g" : "gi");
					}

					let match: RegExpExecArray | null;
					while ((match = searchPattern.exec(text)) !== null) {
						foundMatches.push({
							node: textNode,
							start: match.index,
							end: match.index + match[0].length,
						});
					}
				} catch (error) {
					logger.error("搜索错误:", error);
				}
			}

			setMatches(foundMatches);
			setCurrentMatchIndex(foundMatches.length > 0 ? 0 : -1);
		});
	}, [editor, searchText, caseSensitive, useRegex, wholeWord]);

	// 高亮当前匹配
	const highlightCurrentMatch = useCallback(() => {
		if (currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;

		editor.update(() => {
			const match = matches[currentMatchIndex];
			const node = match.node;

			// 选中匹配的文本
			const selection = node.select(match.start, match.end);

			// 滚动到视图
			const domNode = editor.getElementByKey(node.getKey());
			if (domNode) {
				domNode.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		});
	}, [editor, matches, currentMatchIndex]);

	// 下一个匹配
	const nextMatch = useCallback(() => {
		if (matches.length === 0) return;
		const nextIndex = (currentMatchIndex + 1) % matches.length;
		setCurrentMatchIndex(nextIndex);
	}, [matches, currentMatchIndex]);

	// 上一个匹配
	const previousMatch = useCallback(() => {
		if (matches.length === 0) return;
		const prevIndex =
			currentMatchIndex <= 0 ? matches.length - 1 : currentMatchIndex - 1;
		setCurrentMatchIndex(prevIndex);
	}, [matches, currentMatchIndex]);

	// 替换当前匹配
	const replaceCurrent = useCallback(() => {
		if (currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;

		editor.update(() => {
			const match = matches[currentMatchIndex];
			const node = match.node;
			const text = node.getTextContent();

			// 替换文本
			const newText =
				text.substring(0, match.start) +
				replaceText +
				text.substring(match.end);

			node.setTextContent(newText);
		});

		// 重新搜索
		setTimeout(() => {
			performSearch();
		}, 100);
	}, [editor, matches, currentMatchIndex, replaceText, performSearch]);

	// 替换全部
	const replaceAll = useCallback(() => {
		if (matches.length === 0) return;

		editor.update(() => {
			// 从后往前替换，避免索引变化
			const sortedMatches = [...matches].sort((a, b) => {
				if (a.node.getKey() !== b.node.getKey()) {
					return 0;
				}
				return b.start - a.start;
			});

			const processedNodes = new Set<string>();

			for (const match of sortedMatches) {
				const nodeKey = match.node.getKey();

				if (!processedNodes.has(nodeKey)) {
					const node = match.node;
					let text = node.getTextContent();

					// 找到该节点的所有匹配并替换
					const nodeMatches = matches.filter(
						(m) => m.node.getKey() === nodeKey,
					);
					nodeMatches.sort((a, b) => b.start - a.start);

					for (const m of nodeMatches) {
						text =
							text.substring(0, m.start) + replaceText + text.substring(m.end);
					}

					node.setTextContent(text);
					processedNodes.add(nodeKey);
				}
			}
		});

		// 重新搜索
		setTimeout(() => {
			performSearch();
		}, 100);
	}, [editor, matches, replaceText, performSearch]);

	// 当搜索条件改变时重新搜索
	useEffect(() => {
		if (isOpen && searchText) {
			performSearch();
		}
	}, [searchText, caseSensitive, useRegex, wholeWord, isOpen, performSearch]);

	// 高亮当前匹配
	useEffect(() => {
		if (currentMatchIndex >= 0) {
			highlightCurrentMatch();
		}
	}, [currentMatchIndex, highlightCurrentMatch]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>搜索和替换</DialogTitle>
					<DialogDescription>在当前文档中搜索和替换文本</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* 搜索输入 */}
					<div className="space-y-2">
						<Label htmlFor="search">搜索</Label>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="search"
									value={searchText}
									onChange={(e) => setSearchText(e.target.value)}
									placeholder="输入搜索内容..."
									className="pl-9"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											if (e.shiftKey) {
												previousMatch();
											} else {
												nextMatch();
											}
										}
									}}
								/>
							</div>
							<div className="flex gap-1">
								<Button
									size="icon"
									variant="outline"
									onClick={previousMatch}
									disabled={matches.length === 0}
									title="上一个 (Shift+Enter)"
								>
									<ChevronUp className="h-4 w-4" />
								</Button>
								<Button
									size="icon"
									variant="outline"
									onClick={nextMatch}
									disabled={matches.length === 0}
									title="下一个 (Enter)"
								>
									<ChevronDown className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<div className="text-sm text-muted-foreground">
							{matches.length > 0
								? `${currentMatchIndex + 1} / ${matches.length} 个匹配`
								: searchText
									? "未找到匹配"
									: ""}
						</div>
					</div>

					{/* 替换输入 */}
					<div className="space-y-2">
						<Label htmlFor="replace">替换为</Label>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Replace className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="replace"
									value={replaceText}
									onChange={(e) => setReplaceText(e.target.value)}
									placeholder="输入替换内容..."
									className="pl-9"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											replaceCurrent();
										}
									}}
								/>
							</div>
							<div className="flex gap-1">
								<Button
									variant="outline"
									onClick={replaceCurrent}
									disabled={matches.length === 0}
								>
									替换
								</Button>
								<Button
									variant="outline"
									onClick={replaceAll}
									disabled={matches.length === 0}
								>
									全部替换
								</Button>
							</div>
						</div>
					</div>

					{/* 搜索选项 */}
					<div className="flex flex-wrap gap-4">
						<div className="flex items-center space-x-2">
							<Switch
								id="case-sensitive"
								checked={caseSensitive}
								onCheckedChange={setCaseSensitive}
							/>
							<Label
								htmlFor="case-sensitive"
								className="flex cursor-pointer items-center gap-1 text-sm"
							>
								<CaseSensitive className="h-4 w-4" />
								区分大小写
							</Label>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id="whole-word"
								checked={wholeWord}
								onCheckedChange={setWholeWord}
							/>
							<Label
								htmlFor="whole-word"
								className="flex cursor-pointer items-center gap-1 text-sm"
							>
								<WholeWord className="h-4 w-4" />
								全字匹配
							</Label>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id="use-regex"
								checked={useRegex}
								onCheckedChange={setUseRegex}
							/>
							<Label
								htmlFor="use-regex"
								className="flex cursor-pointer items-center gap-1 text-sm"
							>
								<Regex className="h-4 w-4" />
								正则表达式
							</Label>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
