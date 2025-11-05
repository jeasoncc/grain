import { ArrowUpRightIcon, LucideFolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CreateBookDialog } from "./createBookDialog";

interface EmptyProjectProps {
  onCreate: () => void;
  onImport?: () => void;
  onLearnMore?: () => void;
}

export function EmptyProject({
  onCreate,
  onImport,
  onLearnMore,
}: EmptyProjectProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LucideFolderOpen />
        </EmptyMedia>
        <EmptyTitle>No Projects Yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any projects yet. Get started by creating
          your first project.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          {/* <Button >Create Project</Button> */}

          {/* <CreateBookDialog onSubmit={onCreate} /> */}
          <Button onClick={onCreate}>Create Project</Button>
          <Button variant="outline" onClick={onImport}>
            Import Project
          </Button>
        </div>
      </EmptyContent>
      <Button variant="link" size="sm" onClick={onLearnMore}>
        Learn More <ArrowUpRightIcon />
      </Button>
    </Empty>
  );
}
