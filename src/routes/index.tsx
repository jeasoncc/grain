import { EmptyProject } from "@/components/blocks/EmptyProject";
import { db } from "@/db/curd";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import logger from "@/log";
import { Spinner } from "@/components/ui/loading";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [loading, setLoading] = useState(false);

  const projects = useLiveQuery(() => db.getAllProjects(), []);

  const createProject = async () => {
    logger.info("create project");

    // setLoading(true);

    // try {
    //   await db.addProject({ title: "New project" });
    // } catch (err) {
    //   logger.error(err);
    // } finally {
    //   setLoading(false);
    // }
  };

  if (loading) return <Spinner />;
  if (!projects?.length) return <EmptyProject onCreate={createProject} />;

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <div key={project.id} className="p-4 border rounded">
          <h3>{project.title}</h3>
          <p>{project.description}</p>
        </div>
      ))}
    </div>
  );
}
