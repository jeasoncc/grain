// 命令面板 - 快速访问所有功能
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText,
  Folder,
  Plus,
  Download,
  Upload,
  Settings,
  Moon,
  Sun,
  Maximize2,
  ListTree,
  Users,
  BookOpen,
  Clock,
  Search,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import { useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
  
  const setSelectedProjectId = useSelectionStore((s) => s.setSelectedProjectId);
  const setSelectedChapterId = useSelectionStore((s) => s.setSelectedChapterId);
  const setSelectedSceneId = useSelectionStore((s) => s.setSelectedSceneId);
  const toggleBottomDrawer = useUIStore((s) => s.toggleBottomDrawer);
  const setExportDialogOpen = useState(false)[1];

  // 获取数据
  const projects = useLiveQuery(() => db.getAllProjects(), []) ?? [];
  const chapters = useLiveQuery(() => db.getAllChapters(), []) ?? [];
  const scenes = useLiveQuery(() => db.getAllScenes(), []) ?? [];

  // 最近访问的场景（从 localStorage 读取）
  const recentScenes = useMemo(() => {
    try {
      const recent = localStorage.getItem("recent-scenes");
      if (!recent) return [];
      const ids = JSON.parse(recent) as string[];
      return ids
        .map((id) => scenes.find((s) => s.id === id))
        .filter(Boolean)
        .slice(0, 5);
    } catch {
      return [];
    }
  }, [scenes]);

  // 过滤结果
  const filteredScenes = useMemo(() => {
    if (!search) return [];
    const query = search.toLowerCase();
    return scenes
      .filter((s) => s.title.toLowerCase().includes(query))
      .slice(0, 8);
  }, [scenes, search]);

  const filteredChapters = useMemo(() => {
    if (!search) return [];
    const query = search.toLowerCase();
    return chapters
      .filter((c) => c.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [chapters, search]);

  // 跳转到场景
  const handleSelectScene = useCallback(
    (sceneId: string) => {
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) return;

      setSelectedProjectId(scene.project);
      setSelectedChapterId(scene.chapter);
      setSelectedSceneId(sceneId);

      // 保存到最近访问
      try {
        const recent = localStorage.getItem("recent-scenes");
        const ids = recent ? JSON.parse(recent) : [];
        const newIds = [sceneId, ...ids.filter((id: string) => id !== sceneId)].slice(0, 10);
        localStorage.setItem("recent-scenes", JSON.stringify(newIds));
      } catch {}

      navigate({ to: "/projects/$projectId", params: { projectId: scene.project } });
      onOpenChange(false);
      toast.success(`已跳转到：${scene.title}`);
    },
    [scenes, navigate, onOpenChange, setSelectedProjectId, setSelectedChapterId, setSelectedSceneId]
  );

  // 跳转到章节
  const handleSelectChapter = useCallback(
    (chapterId: string) => {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) return;

      setSelectedProjectId(chapter.project);
      setSelectedChapterId(chapterId);

      navigate({ to: "/projects/$projectId", params: { projectId: chapter.project } });
      onOpenChange(false);
      toast.success(`已跳转到：${chapter.title}`);
    },
    [chapters, navigate, onOpenChange, setSelectedProjectId, setSelectedChapterId]
  );

  // 命令操作
  const commands = [
    {
      group: "操作",
      items: [
        {
          label: "新建章节",
          icon: <Plus className="size-4" />,
          onSelect: () => {
            // TODO: 触发新建章节
            onOpenChange(false);
            toast.info("请在大纲面板中创建章节");
          },
        },
        {
          label: "导出作品",
          icon: <Download className="size-4" />,
          onSelect: () => {
            onOpenChange(false);
            setExportDialogOpen(true);
          },
        },
        {
          label: "打开大纲面板",
          icon: <ListTree className="size-4" />,
          onSelect: () => {
            toggleBottomDrawer("outline");
            onOpenChange(false);
          },
        },
        {
          label: "打开角色面板",
          icon: <Users className="size-4" />,
          onSelect: () => {
            toggleBottomDrawer("characters");
            onOpenChange(false);
          },
        },
        {
          label: "打开世界观面板",
          icon: <BookOpen className="size-4" />,
          onSelect: () => {
            toggleBottomDrawer("world");
            onOpenChange(false);
          },
        },
      ],
    },
    {
      group: "设置",
      items: [
        {
          label: theme === "dark" ? "切换到浅色主题" : "切换到深色主题",
          icon: theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />,
          onSelect: () => {
            setTheme(theme === "dark" ? "light" : "dark");
            onOpenChange(false);
          },
        },
        {
          label: "打开设置",
          icon: <Settings className="size-4" />,
          onSelect: () => {
            navigate({ to: "/settings/design" });
            onOpenChange(false);
          },
        },
      ],
    },
  ];

  // 重置搜索
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="搜索场景、章节或执行命令..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>

        {/* 最近访问 */}
        {!search && recentScenes.length > 0 && (
          <>
            <CommandGroup heading="最近访问">
              {recentScenes.map((scene) => {
                if (!scene) return null;
                const chapter = chapters.find((c) => c.id === scene.chapter);
                return (
                  <CommandItem
                    key={scene.id}
                    onSelect={() => handleSelectScene(scene.id)}
                    className="flex items-center gap-2"
                  >
                    <Clock className="size-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{scene.title}</div>
                      {chapter && (
                        <div className="text-xs text-muted-foreground truncate">
                          {chapter.title}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* 搜索结果 - 场景 */}
        {search && filteredScenes.length > 0 && (
          <>
            <CommandGroup heading="场景">
              {filteredScenes.map((scene) => {
                const chapter = chapters.find((c) => c.id === scene.chapter);
                return (
                  <CommandItem
                    key={scene.id}
                    onSelect={() => handleSelectScene(scene.id)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{scene.title}</div>
                      {chapter && (
                        <div className="text-xs text-muted-foreground truncate">
                          {chapter.title}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* 搜索结果 - 章节 */}
        {search && filteredChapters.length > 0 && (
          <>
            <CommandGroup heading="章节">
              {filteredChapters.map((chapter) => (
                <CommandItem
                  key={chapter.id}
                  onSelect={() => handleSelectChapter(chapter.id)}
                  className="flex items-center gap-2"
                >
                  <Folder className="size-4 text-blue-500" />
                  <span className="font-medium">{chapter.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* 命令列表 */}
        {!search &&
          commands.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={item.onSelect}
                  className="flex items-center gap-2"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
      </CommandList>
    </CommandDialog>
  );
}
