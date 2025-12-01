// 大纲页面路由
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect } from "react";
import { OutlineView } from "@/components/outline/outline-view";
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import { useSelectionStore } from "@/stores/selection";

export const Route = createFileRoute("/outline")({
	component: OutlinePage,
});

function OutlinePage() {
	const navigate = useNavigate();

	// 获取所有数据
	const projects =
		useLiveQuery<ProjectInterface[]>(() => db.getAllProjects(), []) ?? [];
	const chapters =
		useLiveQuery<ChapterInterface[]>(() => db.getAllChapters(), []) ?? [];
	const scenes =
		useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []) ?? [];

	// 使用全局选择状态
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectionStore((s) => s.setSelectedProjectId);
	const setSelectedChapterId = useSelectionStore((s) => s.setSelectedChapterId);
	const setSelectedSceneId = useSelectionStore((s) => s.setSelectedSceneId);

	// 初始化项目选择
	useEffect(() => {
		if (!selectedProjectId && projects.length > 0) {
			setSelectedProjectId(projects[0].id);
		}
	}, [projects, selectedProjectId, setSelectedProjectId]);

	const handleProjectChange = useCallback(
		(projectId: string) => {
			setSelectedProjectId(projectId);
			setSelectedChapterId(null);
			setSelectedSceneId(null);
		},
		[setSelectedProjectId, setSelectedChapterId, setSelectedSceneId],
	);

	const handleNavigateToScene = useCallback(
		(sceneId: string) => {
			// 找到场景所属的章节和项目
			const scene = scenes.find((s) => s.id === sceneId);
			if (scene) {
				// 设置选择状态
				setSelectedProjectId(scene.project);
				setSelectedChapterId(scene.chapter);
				setSelectedSceneId(scene.id);

				// 导航到项目编辑页面
				navigate({
					to: "/projects/$projectId",
					params: { projectId: scene.project },
				});
			}
		},
		[
			scenes,
			navigate,
			setSelectedProjectId,
			setSelectedChapterId,
			setSelectedSceneId,
		],
	);

	if (projects.length === 0) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">暂无项目</h2>
					<p className="text-muted-foreground">请先创建一个项目</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen">
			<OutlineView
				projects={projects}
				chapters={chapters}
				scenes={scenes}
				selectedProjectId={selectedProjectId}
				onProjectChange={handleProjectChange}
				onNavigateToScene={handleNavigateToScene}
			/>
		</div>
	);
}
