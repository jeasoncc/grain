/**
 * 日记面板 - 显示日记列表和创建新日记
 */

import { useLiveQuery } from "dexie-react-hooks";
import { Calendar, Plus, Clock, BookOpen, FileText, Upload } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/db/curd";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/stores/selection";
import { useEditorTabsStore } from "@/stores/editor-tabs";
import {
  createDiary,
  getDateInfo,
  DIARY_PROJECT_NAME,
} from "@/services/diary";
import {
  exportDiaryToOrgRoam,
  getOrgmodeSettings,
} from "@/services/export-orgmode";

export function DiaryPanel() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const { setSelectedProjectId, setSelectedChapterId, setSelectedSceneId } = useSelectionStore();
  const openTab = useEditorTabsStore(s => s.openTab);

  // 获取日记项目
  const projects = useLiveQuery(() => db.getAllProjects(), []) || [];
  const diaryProject = projects.find(p => p.title === DIARY_PROJECT_NAME);

  // 获取日记章节和场景
  const chapters = useLiveQuery(
    () => diaryProject ? db.getChaptersByProject(diaryProject.id) : Promise.resolve([]),
    [diaryProject?.id]
  ) || [];

  const scenes = useLiveQuery(
    () => diaryProject ? db.getScenesByProject(diaryProject.id) : Promise.resolve([]),
    [diaryProject?.id]
  ) || [];

  // 当前日期信息
  const dateInfo = getDateInfo();

  // 创建新日记
  const handleCreateDiary = useCallback(async () => {
    setIsCreating(true);
    try {
      const result = await createDiary();
      
      // 选中新创建的日记
      setSelectedProjectId(result.projectId);
      setSelectedChapterId(result.chapterId);
      setSelectedSceneId(result.sceneId);
      
      // 打开新标签页
      openTab({
        projectId: result.projectId,
        chapterId: result.chapterId,
        sceneId: result.sceneId,
        title: `${result.dateInfo.formatted.date} ${result.dateInfo.formatted.time}`,
        type: "diary",
      });
      
      // 导航到编辑页面
      navigate({ to: "/" });
      
      toast.success("日记创建成功", {
        description: `${result.dateInfo.formatted.date} ${result.dateInfo.chineseHour.name}`,
      });
    } catch (error) {
      toast.error("创建日记失败");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  }, [navigate, setSelectedProjectId, setSelectedChapterId, setSelectedSceneId, openTab]);

  // 打开日记
  const handleOpenDiary = useCallback((sceneId: string, chapterId: string, sceneTitle: string) => {
    if (!diaryProject) return;
    
    // 打开新标签页
    openTab({
      projectId: diaryProject.id,
      chapterId,
      sceneId,
      title: sceneTitle,
      type: "diary",
    });
    
    setSelectedProjectId(diaryProject.id);
    setSelectedChapterId(chapterId);
    setSelectedSceneId(sceneId);
    navigate({ to: "/" });
  }, [diaryProject, navigate, setSelectedProjectId, setSelectedChapterId, setSelectedSceneId, openTab]);

  // 导出日记到 org-roam
  const handleExportToOrgRoam = useCallback(async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const settings = getOrgmodeSettings();
    if (!settings.enabled || !settings.orgRoamPath) {
      toast.error("请先在设置中配置 Org-roam 路径", {
        action: {
          label: "去设置",
          onClick: () => navigate({ to: "/settings/export" }),
        },
      });
      return;
    }

    const result = await exportDiaryToOrgRoam(scene);
    if (result.success) {
      toast.success("导出成功", {
        description: result.path,
      });
    } else {
      toast.error("导出失败", {
        description: result.error,
      });
    }
  }, [scenes, navigate]);

  // 检查 org-roam 是否已配置
  const orgSettings = getOrgmodeSettings();
  const isOrgRoamConfigured = orgSettings.enabled && orgSettings.orgRoamPath;

  // 按日期分组场景
  const groupedScenes = scenes.reduce((acc, scene) => {
    const date = scene.createDate?.split("T")[0] || "unknown";
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(scene);
    return acc;
  }, {} as Record<string, typeof scenes>);

  // 排序日期（最新的在前）
  const sortedDates = Object.keys(groupedScenes).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex h-full flex-col">
      {/* 头部 - 当前日期信息 */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="size-5" />
            日记
          </h2>
          <Button
            size="sm"
            onClick={handleCreateDiary}
            disabled={isCreating}
            className="gap-1"
          >
            <Plus className="size-4" />
            新建
          </Button>
        </div>
        
        {/* 当前日期卡片 */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <div className="text-2xl font-bold">
            {dateInfo.formatted.date}
          </div>
          <div className="text-sm text-muted-foreground">
            {dateInfo.weekday} · {dateInfo.chineseEra}年 · {dateInfo.zodiac.cn}年
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {dateInfo.chineseHour.name} ({dateInfo.chineseHour.period})
          </div>
        </div>
      </div>

      {/* 日记列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="size-12 mb-4 opacity-50" />
              <p className="text-sm">还没有日记</p>
              <p className="text-xs mt-1">点击上方"新建"开始记录</p>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="mb-4">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1 sticky top-0 bg-background">
                  {date}
                </div>
                <div className="space-y-1">
                  {groupedScenes[date].map(scene => {
                    const chapter = chapters.find(c => c.id === scene.chapter);
                    return (
                      <div
                        key={scene.id}
                        className={cn(
                          "w-full px-3 py-2 rounded-md",
                          "hover:bg-accent transition-colors",
                          "flex items-start gap-2 group"
                        )}
                      >
                        <button
                          onClick={() => handleOpenDiary(scene.id, scene.chapter, scene.title)}
                          className="flex items-start gap-2 flex-1 text-left min-w-0"
                        >
                          <Calendar className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {scene.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {scene.createDate?.split("T")[1]?.slice(0, 8) || ""}
                            </div>
                          </div>
                        </button>
                        {isOrgRoamConfigured && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportToOrgRoam(scene.id);
                                }}
                              >
                                <FileText className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              导出到 Org-roam
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
