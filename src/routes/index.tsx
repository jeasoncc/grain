import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { CreateBookDialog } from "@/components/blocks/createBookDialog";
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

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const projects = useLiveQuery<ProjectInterface[]>(() => db.getAllProjects(), []);
	const chapters = useLiveQuery<ChapterInterface[]>(() => db.getAllChapters(), []);
	const scenes = useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []);

	const createProject = async (data: any) => {
		setLoading(true);
		try {
			await db.addProject(data);
			toast.success(`Project "${data.title}" created!`);
		} catch (err) {
			toast.error("Failed to create project");
			logger.error(err);
		} finally {
			setLoading(false);
			setOpen(false);
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
				<EmptyProject onCreate={() => setOpen(true)} onImport={() => setOpen(true)} />
			) : (
				<StoryWorkspace
					projects={projects}
					chapters={chapters}
					scenes={scenes}
					onCreateProject={() => setOpen(true)}
				/>
			)}

			<CreateBookDialog
				open={open}
				loading={loading}
				onSubmit={createProject}
				onOpen={() => setOpen(true)}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
