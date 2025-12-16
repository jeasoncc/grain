import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { EmptyProject } from "@/components/blocks/emptyProject";
import { Spinner } from "@/components/ui/loading";
import { StoryWorkspace } from "@/components/workspace/story-workspace";
import { db } from "@/db/curd";
import type { ProjectInterface } from "@/db/schema";
import logger from "@/log";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [loading, setLoading] = useState(false);
	const projects = useLiveQuery<ProjectInterface[]>(
		() => db.getAllProjects(),
		[],
	);

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

	if (loading || projects === undefined) {
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
					onCreateProject={createProject}
				/>
			)}
		</>
	);
}
