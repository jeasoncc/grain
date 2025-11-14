import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { EmptyProject } from "@/components/blocks/emptyProject";
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
  const search = Route.useSearch<{ view?: RightPanelView }>();
  const setRightPanelView = useUIStore(s => s.setRightPanelView);

  useEffect(() => {
    if (!search?.view) return;
    setRightPanelView(search.view ?? null);
  }, [search?.view, setRightPanelView]);
	const [loading, setLoading] = useState(false);
	const projects = useLiveQuery<ProjectInterface[]>(() => db.getAllProjects(), []);
	const chapters = useLiveQuery<ChapterInterface[]>(() => db.getAllChapters(), []);
	const scenes = useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []);

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
				<StoryWorkspace
					projects={projects}
					chapters={chapters}
					scenes={scenes}
					onCreateProject={createProject}
				/>
			)}
		</>
	);
}
