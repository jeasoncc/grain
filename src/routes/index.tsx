import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateBookDialog } from "@/components/blocks/createBookDialog";
import { EmptyProject } from "@/components/blocks/emptyProject";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import {
	SidebarHeader,
	SidebarInset,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { db } from "@/db/curd";
import logger from "@/log";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const projects = useLiveQuery(() => db.getAllProjects(), []);

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

	if (loading) return <Spinner />;

	return (
		<>
			{!projects?.length ? (
				<EmptyProject onCreate={() => setOpen(true)} />
			) : (
				<div className="grid gap-4">
					<SidebarProvider className="flex flex-col">
						<SidebarHeader />
						<div className="flex flex-1">
							<AppSidebar />
							<SidebarInset>
								<div className="flex flex-1 flex-col gap-4 p-4">
									<div className="grid auto-rows-min gap-4 md:grid-cols-3">
										<div className="bg-muted/50 aspect-video rounded-xl" />
										<div className="bg-muted/50 aspect-video rounded-xl" />
										<div className="bg-muted/50 aspect-video rounded-xl" />
									</div>
									<div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
								</div>
							</SidebarInset>
						</div>
					</SidebarProvider>
					{projects.map((project) => (
						<div key={project.id} className="p-4 border rounded">
							<h3>{project.title}</h3>
							<p>{project.description}</p>
						</div>
					))}
					<Button onClick={() => setOpen(true)}>Create New</Button>
				</div>
			)}

			{/* ✅ Dialog 统一渲染 */}
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
