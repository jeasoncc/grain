import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { StoryWorkspace } from "@/components/workspace/story-workspace";
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import logger from "@/log";

export const Route = createFileRoute("/projects/$projectId")({
	component: ProjectRoute,
});

function ProjectRoute() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);

	const projects = useLiveQuery<ProjectInterface[]>(
		() => db.getAllProjects(),
		[],
	);
	const chapters = useLiveQuery<ChapterInterface[]>(
		() => db.getAllChapters(),
		[],
	);
	const scenes = useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []);

	const handleCreateProject = async () => {
		const data = await openCreateBookDialog();
		if (!data) return;
		setCreating(true);
		try {
			await db.addProject(data);
			toast.success(`Project "${data.title}" created!`);
		} catch (err) {
			toast.error("Failed to create project");
			logger.error(err);
		} finally {
			setCreating(false);
		}
	};

	if (
		projects === undefined ||
		chapters === undefined ||
		scenes === undefined ||
		creating
	) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Spinner />
			</div>
		);
	}

	if (!projects.length) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
				<p>No projects available. Create one from the main workspace.</p>
				<Button variant="outline" onClick={() => navigate({ to: "/" })}>
					Return to dashboard
				</Button>
			</div>
		);
	}

	const targetProject = projects.find((project) => project.id === projectId);
	if (!targetProject) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
				<p>Project not found.</p>
				<Button variant="outline" onClick={() => navigate({ to: "/" })}>
					Return to dashboard
				</Button>
			</div>
		);
	}

	return (
		<>
			<StoryWorkspace
				projects={projects}
				chapters={chapters}
				scenes={scenes}
				activeProjectId={targetProject.id}
				onCreateProject={handleCreateProject}
			/>
		</>
	);
}
