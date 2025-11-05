import { EmptyProject } from "@/components/blocks/emptyProject";
import { db } from "@/db/curd";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import logger from "@/log";
import { Spinner } from "@/components/ui/loading";
import { CreateBookDialog } from "@/components/blocks/createBookDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
