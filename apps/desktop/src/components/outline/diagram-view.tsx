/**
 * 大纲图表视图
 * 集成 Mermaid 和 PlantUML 图表
 */

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	ChapterInterface,
	RoleInterface, // @deprecated - 保留用于向后兼容，未来将使用 WikiEntryInterface
	SceneInterface,
} from "@/db/schema";
import { isKrokiEnabled } from "@/lib/diagram-settings";
import * as MermaidGen from "@/lib/mermaid-generator";
import * as PlantUMLGen from "@/lib/plantuml-generator";
import { DiagramEditorDialog } from "./diagram-editor-dialog";
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

export function DiagramView({
	chapters,
	scenes,
	characters = [],
}: DiagramViewProps) {
	const [activeTab, setActiveTab] = useState("mermaid-structure");
	const [editorOpen, setEditorOpen] = useState(false);
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

	// 生成 PlantUML 图表代码（仅在启用时）
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

	const plantumlTimelineCode = useMemo(
		() => (krokiEnabled ? PlantUMLGen.generateTimeline(chapters) : ""),
		[chapters, krokiEnabled],
	);

	const plantumlGanttCode = useMemo(
		() => (krokiEnabled ? PlantUMLGen.generateGanttChart(chapters) : ""),
		[chapters, krokiEnabled],
	);

	const plantumlCharacterCode = useMemo(
		() =>
			krokiEnabled ? PlantUMLGen.generateCharacterRelations(characters) : "",
		[characters, krokiEnabled],
	);

	// 处理自定义图表保存
	const handleSaveCustomDiagram = (
		code: string,
		type: "mermaid" | "plantuml",
	) => {
		if (editingDiagram) {
			// 更新现有图表
			setCustomDiagrams((prev) =>
				prev.map((d) =>
					d.id === editingDiagram.id ? { ...d, code, type } : d,
				),
			);
			toast.success("图表已更新");
		} else {
			// 创建新图表
			const newDiagram: CustomDiagram = {
				id: `custom-${Date.now()}`,
				name: `自定义图表 ${customDiagrams.length + 1}`,
				code,
				type,
			};
			setCustomDiagrams((prev) => [...prev, newDiagram]);
			toast.success("图表已创建");
		}
		setEditingDiagram(null);
	};

	// 打开编辑器
	const handleOpenEditor = (diagram?: CustomDiagram) => {
		setEditingDiagram(diagram || null);
		setEditorOpen(true);
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
		<div className="h-full flex flex-col bg-background">
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex-1 flex flex-col"
			>
				<div className="border-b border-border/50 px-4 py-2 flex items-center justify-between bg-muted/20">
					<TabsList className="h-9 bg-background/50 border border-border/40">
						{/* Mermaid 图表 */}
						<TabsTrigger value="mermaid-structure" className="text-xs">
							结构图
						</TabsTrigger>
						<TabsTrigger value="mermaid-flow" className="text-xs">
							流程图
						</TabsTrigger>
						<TabsTrigger value="mermaid-three-act" className="text-xs">
							三幕结构
						</TabsTrigger>
						<TabsTrigger value="mermaid-timeline" className="text-xs">
							时间线
						</TabsTrigger>
						<TabsTrigger value="mermaid-gantt" className="text-xs">
							进度图
						</TabsTrigger>
						{characters.length > 0 && (
							<TabsTrigger value="mermaid-characters" className="text-xs">
								角色关系
							</TabsTrigger>
						)}

						{/* PlantUML 图表（仅在启用时显示） */}
						{krokiEnabled && (
							<>
								<div className="h-6 w-px bg-border mx-2" />
								<TabsTrigger value="plantuml-structure" className="text-xs">
									PlantUML 结构
								</TabsTrigger>
								<TabsTrigger value="plantuml-flow" className="text-xs">
									PlantUML 流程
								</TabsTrigger>
								<TabsTrigger value="plantuml-three-act" className="text-xs">
									PlantUML 三幕
								</TabsTrigger>
							</>
						)}

						{/* 自定义图表标签 */}
						{customDiagrams.map((diagram) => (
							<TabsTrigger
								key={diagram.id}
								value={diagram.id}
								className="text-xs"
							>
								{diagram.name}
							</TabsTrigger>
						))}
					</TabsList>

					{/* 添加自定义图表按钮 */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleOpenEditor()}
						className="ml-2 h-8 border border-border/40 hover:bg-muted"
					>
						<Plus className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-xs">自定义图表</span>
					</Button>
				</div>

				<div className="flex-1 overflow-auto p-6 bg-muted/10">
					{/* Mermaid 图表内容 */}
					<TabsContent value="mermaid-structure" className="m-0">
						<MermaidViewer
							code={mermaidStructureCode}
							title="章节结构图 (Mermaid)"
						/>
					</TabsContent>

					<TabsContent value="mermaid-flow" className="m-0">
						<MermaidViewer
							code={mermaidFlowCode}
							title="章节流程图 (Mermaid)"
						/>
					</TabsContent>

					<TabsContent value="mermaid-three-act" className="m-0">
						<MermaidViewer
							code={mermaidThreeActCode}
							title="三幕结构图 (Mermaid)"
						/>
					</TabsContent>

					<TabsContent value="mermaid-timeline" className="m-0">
						<MermaidViewer
							code={mermaidTimelineCode}
							title="故事时间线 (Mermaid)"
						/>
					</TabsContent>

					<TabsContent value="mermaid-gantt" className="m-0">
						<MermaidViewer
							code={mermaidGanttCode}
							title="创作进度图 (Mermaid)"
						/>
					</TabsContent>

					{characters.length > 0 && (
						<TabsContent value="mermaid-characters" className="m-0">
							<MermaidViewer
								code={mermaidCharacterCode}
								title="角色关系图 (Mermaid)"
							/>
						</TabsContent>
					)}

					{/* PlantUML 图表内容 */}
					{krokiEnabled && (
						<>
							<TabsContent value="plantuml-structure" className="m-0">
								<PlantUMLViewer
									code={plantumlStructureCode}
									title="章节结构图 (PlantUML)"
									className="h-full"
								/>
							</TabsContent>

							<TabsContent value="plantuml-flow" className="m-0">
								<PlantUMLViewer
									code={plantumlFlowCode}
									title="章节流程图 (PlantUML)"
									className="h-full"
								/>
							</TabsContent>

							<TabsContent value="plantuml-three-act" className="m-0">
								<PlantUMLViewer
									code={plantumlThreeActCode}
									title="三幕结构图 (PlantUML)"
									className="h-full"
								/>
							</TabsContent>
						</>
					)}

					{/* 自定义图表内容 */}
					{customDiagrams.map((diagram) => (
						<TabsContent key={diagram.id} value={diagram.id} className="m-0">
							{diagram.type === "mermaid" ? (
								<MermaidViewer code={diagram.code} title={diagram.name} />
							) : (
								<PlantUMLViewer
									code={diagram.code}
									title={diagram.name}
									className="h-full"
								/>
							)}
							<div className="mt-4 flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleOpenEditor(diagram)}
								>
									编辑
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setCustomDiagrams((prev) =>
											prev.filter((d) => d.id !== diagram.id),
										);
										toast.success("图表已删除");
									}}
								>
									删除
								</Button>
							</div>
						</TabsContent>
					))}
				</div>
			</Tabs>

			{/* 图表编辑器对话框 */}
			<DiagramEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				initialCode={editingDiagram?.code}
				initialType={editingDiagram?.type}
				onSave={handleSaveCustomDiagram}
			/>
		</div>
	);
}
