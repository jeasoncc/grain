import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/world")({
  component: WorldPage,
});

function WorldPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">World</h1>
        <p className="text-sm text-muted-foreground">Build your world's locations, cultures, and lore</p>
      </div>
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        世界观页面即将提供。在这里你将能管理地点、文化、历史等世界观信息。
      </div>
    </div>
  );
}
