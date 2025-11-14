import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/characters")({
  component: CharactersPage,
});

function CharactersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Characters</h1>
        <p className="text-sm text-muted-foreground">Manage character profiles and relationships</p>
      </div>
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        角色页面即将提供。在这里你将能创建、编辑角色档案，并维护关系图谱。
      </div>
    </div>
  );
}
