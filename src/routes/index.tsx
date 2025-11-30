import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { EmptyProject } from "@/components/blocks/emptyProject";
import { OnboardingTour } from "@/components/onboarding-tour";
import { Spinner } from "@/components/ui/loading";
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import logger from "@/log";
import { StoryWorkspace } from "@/components/workspace/story-workspace";
import { useUIStore, type RightPanelView } from "@/stores/ui";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
  const setRightPanelView = useUIStore(s => s.setRightPanelView);
	const [loading, setLoading] = useState(false);
	const [showTour, setShowTour] = useState(false);
	const projects = useLiveQuery<ProjectInterface[]>(() => db.getAllProjects(), []);
	const chapters = useLiveQuery<ChapterInterface[]>(() => db.getAllChapters(), []);
	const scenes = useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []);

	// 检查是否需要显示引导
	useEffect(() => {
		if (projects && projects.length > 0) {
			const completed = localStorage.getItem("onboarding-completed");
			if (!completed) {
				// 延迟显示引导，等待页面完全加载
				const timer = setTimeout(() => setShowTour(true), 1000);
				return () => clearTimeout(timer);
			}
		}
	}, [projects]);

	const createProject = async () => {
		const data = await openCreateBookDialog();
		if (!data) return;
		setLoading(true);
		try {
			await db.addProject(data);
			toast.success(`Project "${data.title}" created!`);
		} catch (err) {
			toast.error("Failed to create project");
			logger.error(err);
		} finally {
			setLoading(false);
		}
	};

	if (
		loading ||
		projects === undefined ||
		chapters === undefined ||
		scenes === undefined
	) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	return (
		<>
			{!projects?.length ? (
				<EmptyProject onCreate={createProject} onImport={createProject} />
			) : (
				<>
					<StoryWorkspace
						projects={projects}
						chapters={chapters}
						scenes={scenes}
						onCreateProject={createProject}
					/>
					{showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
				</>
			)}
		</>
	);
}
