/**
 * 重新设计的图表视图
 * 使用侧边栏分类导航
 */

import {
	BarChart3,
	Clock,
	Edit,
	GitBranch,
	Plus,
	Trash2,
	TrendingUp,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
	ChapterInterface,
	RoleInterface, // @deprecated - 保留用于向后兼容，未来将使用 WikiEntryInterface
	SceneInterface,
} from "@/db/schema";
import { isKrokiEnabled } from "@/lib/diagram-settings";
import * as MermaidGen from "@/lib/mermaid-generator";
import * as PlantUMLGen from "@/lib/plantuml-generator";
import { cn } from "@/lib/utils";
import { DiagramEditorInline } from "./diagram-editor-inline";
import { MermaidViewer } from "./mermaid-viewer";
import { PlantUMLViewer } from "./plantuml-viewer";

interface DiagramViewProps {
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	/** @deprecated 将来会使用 WikiEntryInterface 替代 */
	characters?: RoleInterface[];
}

interface CustomDiagram {
	id: string;
	name: string;
	code: string;
	type: "mermaid" | "plantuml";
}

interface DiagramItem {
	id: string;
	name: string;
	icon: React.ComponentType<{ className?: string }>;
	type: "preset" | "custom";
	category: "mermaid" | "plantuml";
}

export function DiagramViewRedesigned({
	chapters,
	scenes,
	characters = [],
}: DiagramViewProps) {
	const [selectedDiagram, setSelectedDiagram] =
		useState<string>("mermaid-structure");
	const [editorMode, setEditorMode] = useState<"view" | "edit">("view");
	const [customDiagrams, setCustomDiagrams] = useState<CustomDiagram[]>([]);
	const [editingDiagram, setEditingDiagram] = useState<CustomDiagram | null>(
		null,
	);
	const krokiEnabled = isKrokiEnabled();

	// 生成 Mermaid 图表代码
	const mermaidStructureCode = useMemo(
		() => MermaidGen.generateChapterStructure(chapters, scenes),
		[chapters, scenes],
	);
	const mermaidFlowCode = useMemo(
		() => MermaidGen.generateChapterFlow(chapters),
		[chapters],
	);
	const mermaidThreeActCode = useMemo(
		() => MermaidGen.generateThreeActStructure(chapters),
		[chapters],
	);
	const mermaidTimelineCode = useMemo(
		() => MermaidGen.generateTimeline(chapters),
		[chapters],
	);
	const mermaidGanttCode = useMemo(
		() => MermaidGen.generateGanttChart(chapters),
		[chapters],
	);
	const mermaidCharacterCode = useMemo(
		() => MermaidGen.generateCharacterRelations(characters),
		[characters],
	);

	// 生成 PlantUML 图表代码
	const plantumlStructureCode = useMemo(
		() =>
			krokiEnabled
				? PlantUMLGen.generateChapterStructure(chapters, scenes)
				: "",
		[chapters, scenes, krokiEnabled],
	);
	const plantumlFlowCode = useMemo(
		() => (krokiEnabled ? PlantUMLGen.generateChapterFlow(chapters) : ""),
		[chapters, krokiEnabled],
	);
	const plantumlThreeActCode = useMemo(
		() => (krokiEnabled ? PlantUMLGen.generateThreeActStructure(chapters) : ""),
		[chapters, krokiEnabled],
	);

	// 预设图表列表
	const presetDiagrams: DiagramItem[] = [
		{
			id: "mermaid-structure",
			name: "章节结构",
			icon: BarChart3,
			type: "preset",
			category: "mermaid",
		},
		{
			id: "mermaid-flow",
			name: "章节流程",
			icon: GitBranch,
			type: "preset",
			category: "mermaid",
		},
		{
			id: "mermaid-three-act",
			name: "三幕结构",
			icon: BarChart3,
			type: "preset",
			category: "mermaid",
		},
		{
			id: "mermaid-timeline",
			name: "故事时间线",
			icon: Clock,
			type: "preset",
			category: "mermaid",
		},
		{
			id: "mermaid-gantt",
			name: "创作进度",
			icon: TrendingUp,
			type: "preset",
			category: "mermaid",
		},
	];

	if (characters.length > 0) {
		presetDiagrams.push({
			id: "mermaid-characters",
			name: "角色关系",
			icon: Users,
			type: "preset",
			category: "mermaid",
		});
	}

	if (krokiEnabled) {
		presetDiagrams.push(
			{
				id: "plantuml-structure",
				name: "PlantUML 结构",
				icon: BarChart3,
				type: "preset",
				category: "plantuml",
			},
			{
				id: "plantuml-flow",
				name: "PlantUML 流程",
				icon: GitBranch,
				type: "preset",
				category: "plantuml",
			},
			{
				id: "plantuml-three-act",
				name: "PlantUML 三幕",
				icon: BarChart3,
				type: "preset",
				category: "plantuml",
			},
		);
	}

	// 处理保存
	const handleSaveCustomDiagram = (
		code: string,
		type: "mermaid" | "plantuml",
	) => {
		if (editingDiagram) {
			setCustomDiagrams((prev) =>
				prev.map((d) =>
					d.id === editingDiagram.id ? { ...d, code, type } : d,
				),
			);
			toast.success("图表已更新");
		} else {
			const newDiagram: CustomDiagram = {
				id: `custom-${Date.now()}`,
				name: `自定义图表 ${customDiagrams.length + 1}`,
				code,
				type,
			};
			setCustomDiagrams((prev) => [...prev, newDiagram]);
			setSelectedDiagram(newDiagram.id);
			toast.success("图表已创建");
		}
		setEditingDiagram(null);
	};

	// 打开编辑器
	const handleOpenEditor = (diagram?: CustomDiagram) => {
		setEditingDiagram(diagram || null);
		setEditorMode("edit");
	};

	// 关闭编辑器
	const handleCloseEditor = () => {
		setEditorMode("view");
		setEditingDiagram(null);
	};

	// 删除自定义图表
	const handleDeleteCustomDiagram = (id: string) => {
		setCustomDiagrams((prev) => prev.filter((d) => d.id !== id));
		if (selectedDiagram === id) {
			setSelectedDiagram("mermaid-structure");
		}
		toast.success("图表已删除");
	};

	// 渲染当前选中的图表
	const renderDiagram = () => {
		const customDiagram = customDiagrams.find((d) => d.id === selectedDiagram);
		if (customDiagram) {
			return customDiagram.type === "mermaid" ? (
				<MermaidViewer code={customDiagram.code} title={customDiagram.name} />
			) : (
				<PlantUMLViewer
					code={customDiagram.code}
					title={customDiagram.name}
					className="h-full"
				/>
			);
		}

		switch (selectedDiagram) {
			case "mermaid-structure":
				return <MermaidViewer code={mermaidStructureCode} title="章节结构图" />;
			case "mermaid-flow":
				return <MermaidViewer code={mermaidFlowCode} title="章节流程图" />;
			case "mermaid-three-act":
				return <MermaidViewer code={mermaidThreeActCode} title="三幕结构图" />;
			case "mermaid-timeline":
				return <MermaidViewer code={mermaidTimelineCode} title="故事时间线" />;
			case "mermaid-gantt":
				return <MermaidViewer code={mermaidGanttCode} title="创作进度图" />;
			case "mermaid-characters":
				return <MermaidViewer code={mermaidCharacterCode} title="角色关系图" />;
			case "plantuml-structure":
				return (
					<PlantUMLViewer
						code={plantumlStructureCode}
						title="章节结构图 (PlantUML)"
						className="h-full"
					/>
				);
			case "plantuml-flow":
				return (
					<PlantUMLViewer
						code={plantumlFlowCode}
						title="章节流程图 (PlantUML)"
						className="h-full"
					/>
				);
			case "plantuml-three-act":
				return (
					<PlantUMLViewer
						code={plantumlThreeActCode}
						title="三幕结构图 (PlantUML)"
						className="h-full"
					/>
				);
			default:
				return null;
		}
	};

	if (chapters.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				<div className="text-center">
					<p className="text-lg mb-2">暂无章节数据</p>
					<p className="text-sm">创建章节后即可查看图表</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full">
			{/* 侧边栏 */}
			<div className="w-56 border-r flex flex-col">
				<div className="p-4 border-b">
					<h3 className="font-semibold text-sm">图表导航</h3>
				</div>

				<ScrollArea className="flex-1">
					<div className="p-2">
						{/* 预设图表 */}
						<div className="mb-4">
							<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
								预设图表
							</div>
							<div className="space-y-0.5">
								{presetDiagrams.map((diagram) => {
									const Icon = diagram.icon;
									return (
										<button
											key={diagram.id}
											onClick={() => setSelectedDiagram(diagram.id)}
											className={cn(
												"w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
												selectedDiagram === diagram.id
													? "bg-accent text-accent-foreground"
													: "hover:bg-muted",
											)}
										>
											<Icon className="h-4 w-4" />
											<span className="flex-1 text-left truncate">
												{diagram.name}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						<Separator />

						{/* 自定义图表 */}
						<div className="mt-4">
							<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between">
								<span>自定义图表</span>
								<Button
									variant="ghost"
									size="sm"
									className="h-5 w-5 p-0"
									onClick={() => handleOpenEditor()}
								>
									<Plus className="h-3 w-3" />
								</Button>
							</div>
							<div className="space-y-0.5">
								{customDiagrams.map((diagram) => (
									<div
										key={diagram.id}
										className={cn(
											"group flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
											selectedDiagram === diagram.id
												? "bg-accent text-accent-foreground"
												: "hover:bg-muted",
										)}
									>
										<button
											onClick={() => setSelectedDiagram(diagram.id)}
											className="flex-1 text-left truncate"
										>
											{diagram.name}
										</button>
										<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<Button
												variant="ghost"
												size="sm"
												className="h-5 w-5 p-0"
												onClick={() => handleOpenEditor(diagram)}
											>
												<Edit className="h-3 w-3" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-5 w-5 p-0"
												onClick={() => handleDeleteCustomDiagram(diagram.id)}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
									</div>
								))}
								{customDiagrams.length === 0 && (
									<div className="px-2 py-4 text-xs text-muted-foreground text-center">
										暂无自定义图表
									</div>
								)}
							</div>
						</div>
					</div>
				</ScrollArea>
			</div>

			{/* 主内容区 */}
			<div className="flex-1 overflow-auto p-6">
				{editorMode === "edit" ? (
					<DiagramEditorInline
						initialCode={editingDiagram?.code}
						initialType={editingDiagram?.type}
						onSave={handleSaveCustomDiagram}
						onClose={handleCloseEditor}
					/>
				) : (
					renderDiagram()
				)}
			</div>
		</div>
	);
}
