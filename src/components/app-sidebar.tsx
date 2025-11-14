import {
	BookMarked,
	BookOpen,
	CalendarRange,
	ChartLine,
	CheckCircle2,
	Compass,
	Feather,
	Flame,
	Lightbulb,
	ListTree,
	ScrollText,
	SearchIcon,
	Settings,
	Users,
} from "lucide-react";
import type * as React from "react";
import { useState, useMemo, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  type TreeItem
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, ChevronRight, ChevronDown, Upload, Download, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { db } from "@/db/curd";
import { exportAll, triggerDownload, importFromJson, readFileAsText, createBook } from "@/services/projects";
import type { ProjectInterface, ChapterInterface, SceneInterface } from "@/db/schema";
import { Link } from "@tanstack/react-router";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { ButtonGroup } from "@/components/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navigation = [
	{
		label: "Workspace Overview",
		description: "Monitor the heart of your novel project",
		items: [
			{ icon: Compass, label: "Dashboard", note: "Project summary & stats" },
			{ icon: ChartLine, label: "Progress Analytics", note: "Word count trends" },
			{ icon: CalendarRange, label: "Writing Schedule", note: "Session planner" },
		],
	},
	{
		label: "Story Building",
		description: "Outline plotlines and manage narrative structure",
		items: [
			{ icon: ListTree, label: "Chapters & Scenes", note: "Hierarchy & beats" },
			{ icon: ScrollText, label: "Story Beats", note: "Acts, arcs, and pacing" },
			{ icon: BookMarked, label: "Story Bible", note: "Lore & continuity" },
		],
	},
	{
		label: "Creative Resources",
		description: "Keep research, references, and inspiration in reach",
		items: [
			{ icon: Users, label: "Characters", note: "Profiles & relationships" },
			{ icon: BookOpen, label: "World Atlas", note: "Locations & cultures" },
			{ icon: Lightbulb, label: "Inspiration Vault", note: "Prompts & snippets" },
		],
	},
	{
		label: "Productivity",
		description: "Stay consistent and celebrate milestones",
		items: [
			{ icon: Feather, label: "Daily Goals", note: "Word target & streak" },
			{ icon: Flame, label: "Focus Sessions", note: "Pomodoro & timers" },
			{ icon: CheckCircle2, label: "Milestones", note: "Draft checkpoints" },
		],
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const projects = useLiveQuery<ProjectInterface[]>(() => db.getAllProjects(), []);
    const chapters = useLiveQuery<ChapterInterface[]>(() => db.getAllChapters(), []);
    const scenes = useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []);

    const projectList = projects ?? [];

    async function handleDeleteAllBooks() {
        if (!window.confirm("确认删除所有书籍及其章节、场景等数据吗？该操作不可恢复！")) return;
        try {
            await Promise.all([
                db.attachments.clear(),
                db.roles.clear(),
                db.scenes.clear(),
                db.chapters.clear(),
                db.projects.clear(),
            ]);
            toast.success("已删除所有书籍");
        } catch (err) {
            toast.error("删除失败，请重试");
        }
    }

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const handleExport = useCallback(async () => {
        const json = await exportAll();
        triggerDownload(`novel-editor-backup-${new Date().toISOString().slice(0,10)}.json`, json);
    }, []);
    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);
    const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await readFileAsText(file);
            await importFromJson(text, { keepIds: false });
            toast.success("导入成功");
        } catch (err) {
            toast.error("导入失败");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, []);

    const handleQuickCreate = useCallback(async () => {
        const title = window.prompt("书名：");
        if (!title) return;
        const author = window.prompt("作者：", "Author");
        if (!author) return;
        try {
            await createBook({ title, author, description: "" });
        } catch (e) {
            // createBook 已包含 toast
        }
    }, []);

    return (
        <Sidebar {...props} className="pb-8">
            <SidebarContent className="pb-2">
                <SidebarGroup>
                    <div className="flex items-center justify-between pr-2">
                        <SidebarGroupLabel>Books</SidebarGroupLabel>
                    </div>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {projectList.map((project) => {
                                const chapterCount = (chapters ?? []).filter(c => c.project === project.id).length;
                                const sceneCount = (scenes ?? []).filter(s => s.project === project.id).length;
                                return (
                                    <SidebarMenuItem key={project.id}>
                                        <SidebarMenuButton asChild>
                                            <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                                                <BookMarked className="size-4" />
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-medium">{project.title}</span>
                                                    <span className="text-xs text-muted-foreground">{chapterCount} 章 · {sceneCount} 场景</span>
                                                </div>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                            {projectList.length === 0 ? (
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link to="/">
                                            <Plus className="size-4" />
                                            <span>创建你的第一本书</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) : null}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            {/* <SidebarRail /> */}
        </Sidebar>
    );
}
