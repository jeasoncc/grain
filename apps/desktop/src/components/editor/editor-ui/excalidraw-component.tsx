/**
 * Excalidraw 组件 - 嵌入式绘图编辑器
 */

import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
	$getNodeByKey,
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	type NodeKey,
} from "lexical";
import {
	Download,
	Edit3,
	Eye,
	Maximize2,
	Minimize2,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
	$isExcalidrawNode,
	type ExcalidrawData,
} from "../nodes/excalidraw-node";

interface ExcalidrawComponentProps {
	nodeKey: NodeKey;
	data: string;
	width: number;
	height: number;
}

export default function ExcalidrawComponent({
	nodeKey,
	data,
	width,
	height,
}: ExcalidrawComponentProps) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [isEditing, setIsEditing] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
	const excalidrawRef = useRef<any>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { isDark } = useTheme();

	// 解析初始数据
	const initialData: ExcalidrawData = data
		? JSON.parse(data)
		: { elements: [], appState: {}, files: {} };

	// 保存数据到节点
	const saveData = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型
		(elements: readonly any[], appState: any, files: any) => {
			editor.update(() => {
				const node = $getNodeByKey(nodeKey);
				if ($isExcalidrawNode(node)) {
					const dataToSave: ExcalidrawData = {
						elements: elements as any[],
						appState: {
							viewBackgroundColor: appState.viewBackgroundColor,
							gridSize: appState.gridSize,
						},
						files,
					};
					node.setData(JSON.stringify(dataToSave));
				}
			});
		},
		[editor, nodeKey],
	);

	// 删除节点
	const deleteNode = useCallback(() => {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if ($isExcalidrawNode(node)) {
				node.remove();
			}
		});
	}, [editor, nodeKey]);

	// 导出为图片
	const exportAsImage = useCallback(async () => {
		if (!excalidrawRef.current) return;

		const elements = excalidrawRef.current.getSceneElements();
		const appState = excalidrawRef.current.getAppState();
		const files = excalidrawRef.current.getFiles();

		try {
			const blob = await exportToBlob({
				elements,
				appState: {
					...appState,
					exportWithDarkMode: isDark,
				},
				files,
				mimeType: "image/png",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `excalidraw-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("导出图片失败:", error);
		}
	}, [isDark]);

	// 处理点击选择
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand(
				CLICK_COMMAND,
				(event: MouseEvent) => {
					if (
						containerRef.current &&
						containerRef.current.contains(event.target as Node)
					) {
						if (!event.shiftKey) {
							clearSelection();
						}
						setSelected(true);
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_DELETE_COMMAND,
				() => {
					if (isSelected) {
						deleteNode();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				() => {
					if (isSelected && !isEditing) {
						deleteNode();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, isSelected, isEditing, setSelected, clearSelection, deleteNode]);

	// 全屏模式处理
	useEffect(() => {
		if (isFullscreen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isFullscreen]);

	// 渲染预览模式（静态图片）
	const renderPreview = () => {
		if (initialData.elements.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
					<Edit3 className="size-8" />
					<span>点击编辑开始绘图</span>
				</div>
			);
		}

		// 显示 Excalidraw 但禁用交互
		return (
			<div className="pointer-events-none">
				<Excalidraw
					initialData={initialData}
					theme={isDark ? "dark" : "light"}
					viewModeEnabled={true}
					zenModeEnabled={true}
					UIOptions={{
						canvasActions: {
							changeViewBackgroundColor: false,
							clearCanvas: false,
							export: false,
							loadScene: false,
							saveToActiveFile: false,
							toggleTheme: false,
						},
					}}
				/>
			</div>
		);
	};

	// 渲染编辑模式
	const renderEditor = () => (
		<Excalidraw
			excalidrawAPI={(api) => {
				excalidrawRef.current = api;
			}}
			initialData={initialData}
			theme={isDark ? "dark" : "light"}
			onChange={(elements, appState, files) => {
				saveData(elements, appState, files);
			}}
			UIOptions={{
				canvasActions: {
					export: false,
					loadScene: false,
					saveToActiveFile: false,
				},
			}}
		/>
	);

	// 全屏模式
	if (isFullscreen) {
		return (
			<div className="fixed inset-0 z-50 bg-background">
				<div className="absolute top-2 right-2 z-10 flex gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={exportAsImage}
						title="导出为图片"
					>
						<Download className="size-4 mr-1" />
						导出
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							setIsFullscreen(false);
							setIsEditing(false);
						}}
						title="退出全屏"
					>
						<Minimize2 className="size-4 mr-1" />
						退出
					</Button>
				</div>
				<div className="h-full">{renderEditor()}</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"group relative rounded-lg border overflow-hidden my-4",
				isSelected && "ring-2 ring-primary",
				isEditing ? "bg-background" : "bg-muted/30",
			)}
			style={{ width, height }}
		>
			{/* 工具栏 - 悬停时显示 */}
			<div
				className={cn(
					"absolute top-2 right-2 z-10 flex gap-1 transition-opacity",
					isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
				)}
			>
				{isEditing ? (
					<>
						<Button
							variant="secondary"
							size="icon"
							className="size-7"
							onClick={() => setIsFullscreen(true)}
							title="全屏编辑"
						>
							<Maximize2 className="size-3.5" />
						</Button>
						<Button
							variant="secondary"
							size="icon"
							className="size-7"
							onClick={exportAsImage}
							title="导出为图片"
						>
							<Download className="size-3.5" />
						</Button>
						<Button
							variant="secondary"
							size="icon"
							className="size-7"
							onClick={() => setIsEditing(false)}
							title="完成编辑"
						>
							<Eye className="size-3.5" />
						</Button>
					</>
				) : (
					<>
						<Button
							variant="secondary"
							size="icon"
							className="size-7"
							onClick={() => setIsEditing(true)}
							title="编辑绘图"
						>
							<Edit3 className="size-3.5" />
						</Button>
						<Button
							variant="secondary"
							size="icon"
							className="size-7"
							onClick={() => setIsFullscreen(true)}
							title="全屏查看"
						>
							<Maximize2 className="size-3.5" />
						</Button>
					</>
				)}
				<Button
					variant="destructive"
					size="icon"
					className="size-7"
					onClick={deleteNode}
					title="删除"
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>

			{/* 内容区域 */}
			<div
				className="h-full"
				onDoubleClick={() => !isEditing && setIsEditing(true)}
			>
				{isEditing ? renderEditor() : renderPreview()}
			</div>
		</div>
	);
}
