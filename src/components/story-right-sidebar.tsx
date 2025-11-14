import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, BookOpen, FolderPlus, FilePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSelectionStore, type SelectionState } from "@/stores/selection";
import type { SceneInterface } from "@/db/schema";
import { useChaptersByProject, createChapter, renameChapter, reorderChapters, deleteChapter } from "@/services/chapters";
import { useScenesByProject, useScenesByChapter, createScene, renameScene, reorderScenes, deleteScene } from "@/services/scenes";
import { useAllProjects } from "@/services/projects";
import { useUIStore } from "@/stores/ui";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  type TreeItem,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";

function countSceneWordsQuick(scene: SceneInterface): number {
  try {
    if (typeof scene.content === "string") {
      return scene.content.trim().split(/\s+/).filter(Boolean).length;
    }
    const text = JSON.stringify(scene.content ?? "");
    return text.trim().split(/\s+/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

export function StoryRightSidebar() {
  const rightPanelView = useUIStore(s => s.rightPanelView);
  const selectedProjectId = useSelectionStore((s: SelectionState) => s.selectedProjectId);
  const setSelectedProjectId = useSelectionStore((s: SelectionState) => s.setSelectedProjectId);
  const selectedChapterId = useSelectionStore((s: SelectionState) => s.selectedChapterId);
  const setSelectedChapterId = useSelectionStore((s: SelectionState) => s.setSelectedChapterId);
  const selectedSceneId = useSelectionStore((s: SelectionState) => s.selectedSceneId);
  const setSelectedSceneId = useSelectionStore((s: SelectionState) => s.setSelectedSceneId);

  // data reads via db services hooks
  const projects = useAllProjects();
  const projectChapters = useChaptersByProject(selectedProjectId);
  const scenesOfProject = useScenesByProject(selectedProjectId);
  const chapterScenes = useScenesByChapter(selectedChapterId);
  // ensure a project is selected
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  // ensure a chapter is selected when project has chapters
  useEffect(() => {
    if (selectedProjectId && !selectedChapterId && projectChapters.length > 0) {
      setSelectedChapterId(projectChapters[0].id);
    }
  }, [selectedProjectId, selectedChapterId, projectChapters, setSelectedChapterId]);

  const [chapterEditId, setChapterEditId] = useState<string | null>(null);
  const [chapterEditTitle, setChapterEditTitle] = useState("");
  const [sceneEditId, setSceneEditId] = useState<string | null>(null);
  const [sceneEditTitle, setSceneEditTitle] = useState("");

  const commitChapterRename = useCallback(async () => {
    if (!chapterEditId) return;
    const title = chapterEditTitle.trim();
    if (!title) {
      toast.error("章节标题不能为空");
      return;
    }
    try {
      await renameChapter(chapterEditId, title);
      toast.success("章节已重命名");
      setChapterEditId(null);
      setChapterEditTitle("");
    } catch {
      toast.error("章节重命名失败");
    }
  }, [chapterEditId, chapterEditTitle]);

  const handleAddChapter = useCallback(async () => {
    if (!selectedProjectId) return;
    const nextOrder = projectChapters.length ? Math.max(...projectChapters.map(c=>c.order)) + 1 : 1;
    try {
      const newChapter = await createChapter({ projectId: selectedProjectId, title: `Chapter ${nextOrder}`, order: nextOrder });
      setSelectedChapterId(newChapter.id);
      toast.success("章节已创建");
    } catch {
      toast.error("创建章节失败");
    }
  }, [selectedProjectId, projectChapters, setSelectedChapterId]);

  const handleDeleteChapter = useCallback(async (chapterId: string) => {
    const target = projectChapters.find(c=>c.id===chapterId);
    if (!target) return;
    if (!window.confirm(`确认删除章节 “${target.title}” 吗？`)) return;
    try {
      await deleteChapter(chapterId);
      toast.success("章节已删除");
      if (selectedChapterId === chapterId) setSelectedChapterId(null);
    } catch {
      toast.error("删除章节失败");
    }
  }, [projectChapters, selectedChapterId, setSelectedChapterId]);

  const handleChapterReorder = useCallback(async (chapterId: string, direction: "up" | "down") => {
    const sorted = [...projectChapters];
    const index = sorted.findIndex(c=>c.id===chapterId);
    if (index === -1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const current = sorted[index];
    const target = sorted[swapIndex];
    try {
      await reorderChapters(current.id, current.order, target.id, target.order);
      toast.success("章节顺序已更新");
    } catch {
      toast.error("更新章节顺序失败");
    }
  }, [projectChapters]);

  const commitSceneRename = useCallback(async () => {
    if (!sceneEditId) return;
    const title = sceneEditTitle.trim();
    if (!title) {
      toast.error("场景标题不能为空");
      return;
    }
    try {
      await renameScene(sceneEditId, title);
      toast.success("场景已重命名");
      setSceneEditId(null);
      setSceneEditTitle("");
    } catch {
      toast.error("场景重命名失败");
    }
  }, [sceneEditId, sceneEditTitle]);

  const handleAddScene = useCallback(async () => {
    if (!selectedProjectId || !selectedChapterId) {
      toast.error("请先选择章节");
      return;
    }
    const nextOrder = chapterScenes.length ? Math.max(...chapterScenes.map(s=>s.order)) + 1 : 1;
    try {
      const newScene = await createScene({ projectId: selectedProjectId, chapterId: selectedChapterId, title: `Scene ${nextOrder}`, order: nextOrder, content: "" });
      setSelectedSceneId(newScene.id);
      toast.success("场景已创建");
    } catch {
      toast.error("创建场景失败");
    }
  }, [selectedProjectId, selectedChapterId, chapterScenes, setSelectedSceneId]);

  const handleDeleteScene = useCallback(async (sceneId: string) => {
    const target = chapterScenes.find(s=>s.id===sceneId);
    if (!target) return;
    if (!window.confirm(`确认删除场景 “${target.title}” 吗？`)) return;
    try {
      await deleteScene(sceneId);
      toast.success("场景已删除");
      if (selectedSceneId === sceneId) setSelectedSceneId(null);
    } catch {
      toast.error("删除场景失败");
    }
  }, [chapterScenes, selectedSceneId, setSelectedSceneId]);

  const handleSceneReorder = useCallback(async (sceneId: string, direction: "up" | "down") => {
    const sorted = [...chapterScenes];
    const index = sorted.findIndex(s=>s.id===sceneId);
    if (index === -1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const current = sorted[index];
    const target = sorted[swapIndex];
    try {
      await reorderScenes(current.id, current.order, target.id, target.order);
      toast.success("场景顺序已更新");
    } catch {
      toast.error("更新场景顺序失败");
    }
  }, [chapterScenes]);

  // Build tree items with a synthetic ROOT
  const items = useMemo(() => {
    const map: Record<string, TreeItem> = {} as any;
    const chapterIds = projectChapters.map(c => c.id);
    map["ROOT"] = {
      index: 0,
      hasChildren: true,
      children: chapterIds,
      isFolder: true,
      data: { type: 'root', title: 'root', id: 'ROOT' },
    } as unknown as TreeItem;

    for (const chapter of projectChapters) {
      const children = scenesOfProject
        .filter(s => s.chapter === chapter.id)
        .sort((a,b)=>a.order-b.order)
        .map(s => s.id);
      map[chapter.id] = {
        index: chapter.order,
        hasChildren: true,
        children,
        isFolder: true,
        data: { type: 'chapter', title: chapter.title, id: chapter.id },
      } as unknown as TreeItem;
    }
    for (const scene of scenesOfProject) {
      map[scene.id] = {
        index: scene.order,
        hasChildren: false,
        children: [],
        isFolder: false,
        data: { type: 'scene', title: scene.title, id: scene.id },
      } as unknown as TreeItem;
    }
    return map;
  }, [projectChapters, scenesOfProject]);

  const dataProvider = useMemo(() => new StaticTreeDataProvider(
    items,
    (item: TreeItem, newName: string) => ({
      ...item,
      data: { ...(item as any).data, title: newName },
    }) as unknown as TreeItem
  ), [items]);

  return (
    <UISidebar side="right" className="pb-8">
      <SidebarContent className="pb-2">
        <SidebarGroup>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-2 space-y-2">
              <select
                className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="shrink-0" onClick={handleAddChapter}>
                  <Plus className="mr-1 size-4" />Add Chapter
                </Button>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={handleAddScene} disabled={!selectedChapterId}>
                  <Plus className="mr-1 size-4"/>Add Scene
                </Button>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        {(!rightPanelView || rightPanelView === 'outline') ? (
        <SidebarGroup>
          <SidebarGroupLabel>Outline</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-2 space-y-2">
              {/* Empty states guidance */}
              {projects.length === 0 ? (
                <div className="mb-2 flex items-center gap-3 rounded-md border p-4">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <BookOpen className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">No projects yet</span>
                    <span className="text-xs text-muted-foreground">Use the left sidebar to create your first book.</span>
                  </div>
                </div>
              ) : null}
              {selectedProjectId && projectChapters.length === 0 ? (
                <div className="mb-2 flex items-center justify-between rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                      <FolderPlus className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">No chapters in this book</span>
                      <span className="text-xs text-muted-foreground">Create your first chapter to start the outline.</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleAddChapter}><Plus className="mr-1 size-4"/>Add Chapter</Button>
                </div>
              ) : null}
              {selectedChapterId && chapterScenes.length === 0 ? (
                <div className="mb-2 flex items-center justify-between rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                      <FilePlus className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">No scenes in this chapter</span>
                      <span className="text-xs text-muted-foreground">Add a scene to begin writing.</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleAddScene}><Plus className="mr-1 size-4"/>Add Scene</Button>
                </div>
              ) : null}

              <div className="min-h-[200px] max-h-[calc(100vh-220px)] overflow-auto pr-1">
              <UncontrolledTreeEnvironment
                dataProvider={dataProvider}
                getItemTitle={(item) => (item.data as any)?.title ?? ''}
                canDragAndDrop={false}
                canDropOnFolder={false}
                canReorderItems={false}
                viewState={{
                  'chapters-scenes': {
                    expandedItems: ['ROOT', ...projectChapters.map(c=>c.id)],
                    selectedItems: selectedSceneId ? [selectedSceneId] : (selectedChapterId ? [selectedChapterId] : []),
                    focusedItem: selectedSceneId ?? selectedChapterId ?? undefined,
                  }
                }}
                onPrimaryAction={async (item, treeId) => {
                  const data = (item as any).data as { type: 'chapter'|'scene'; id: string };
                  if (data.type === 'chapter') {
                    setSelectedChapterId(data.id);
                  } else {
                    setSelectedSceneId(data.id);
                  }
                }}
                onRenameItem={async (item, name) => {
                  const data = (item as any).data as { type: 'chapter'|'scene'; id: string };
                  if (!name.trim()) return;
                  if (data.type === 'chapter') await renameChapter(data.id, name.trim());
                  else await renameScene(data.id, name.trim());
                }}
              >
                <Tree treeId="chapters-scenes" rootItem="ROOT" treeLabel="Chapters & Scenes">
                  {/** Provide synthetic ROOT that lists chapter ids */}
                </Tree>
              </UncontrolledTreeEnvironment>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        ) : null}

        {rightPanelView === 'characters' ? (
        <SidebarGroup>
          <SidebarGroupLabel>Characters</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-2 space-y-2 text-sm text-muted-foreground">
              角色面板即将提供。您可以先通过左侧书库与章节/场景进行组织。
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        ) : null}

        {rightPanelView === 'world' ? (
        <SidebarGroup>
          <SidebarGroupLabel>World</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-2 space-y-2 text-sm text-muted-foreground">
              世界观面板即将提供。您可以先通过左侧书库与章节/场景进行组织。
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full p-2 text-center text-xs text-muted-foreground">Chapters & Scenes</div>
      </SidebarFooter>
      <SidebarRail />
    </UISidebar>
  );
}
