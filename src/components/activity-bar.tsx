import type * as React from "react";
import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import { importFromJson, readFileAsText, createBook } from "@/services/projects";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { ExportDialog } from "@/components/blocks/export-dialog";
import { BookMarked, Settings, ListTree, Users, BookOpen, Upload, Download, MoreHorizontal, Trash2, Plus, TrendingUp, Pencil } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { useSelectionStore } from "@/stores/selection";
import { useUIStore, type BottomDrawerView } from "@/stores/ui";
import { cn } from "@/lib/utils";

export function ActivityBar(): React.ReactElement {
  const location = useLocation();
  const projects = useLiveQuery(() => db.getAllProjects(), []) || [];
  const selectedProjectId = useSelectionStore(s => s.selectedProjectId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirm = useConfirm();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // 底部抽屉状态
  const { bottomDrawerOpen, bottomDrawerView, toggleBottomDrawer } = useUIStore();



  const handleQuickCreate = useCallback(async () => {
    const data = await openCreateBookDialog();
    if (!data) return;
    try {
      await createBook({ title: data.title, author: data.author, description: data.description ?? "" });
      toast.success(`已创建书籍：${data.title}`);
    } catch (e) {}
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
    } catch {
      toast.error("导入失败");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleDeleteAllBooks = useCallback(async () => {
    const ok = await confirm({ title: "确认删除所有书籍？", description: "该操作不可恢复", confirmText: "删除", cancelText: "取消" });
    if (!ok) return;
    try {
      await Promise.all([db.attachments.clear(), db.roles.clear(), db.scenes.clear(), db.chapters.clear(), db.projects.clear()]);
      toast.success("已删除所有书籍");
    } catch {
      toast.error("删除失败");
    }
  }, [confirm]);

  // 检查当前路由是否匹配
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside className="activity-bar flex h-screen w-12 shrink-0 flex-col items-center bg-sidebar py-3">
      <TooltipProvider>
        {/* 主导航 */}
        <nav className="flex flex-col items-center gap-1">
          <NavItem to="/" icon={<BookMarked className="size-5" />} label="书库" active={isActive("/") && !isActive("/outline") && !isActive("/characters") && !isActive("/world") && !isActive("/statistics") && !isActive("/settings")} />
          <NavItem to="/outline" icon={<ListTree className="size-5" />} label="大纲" active={isActive("/outline")} />
          <NavItem to="/characters" icon={<Users className="size-5" />} label="角色" active={isActive("/characters")} />
          <NavItem to="/world" icon={<BookOpen className="size-5" />} label="世界观" active={isActive("/world")} />
          <NavItem to="/canvas" icon={<Pencil className="size-5" />} label="绘图" active={isActive("/canvas")} />
        </nav>

        <div className="my-3 h-px w-6 bg-border/20" />

        {/* 操作按钮 */}
        <div className="flex flex-col items-center gap-1">
          <ActionButton icon={<Plus className="size-5" />} label="新建书籍" onClick={handleQuickCreate} />
          <ActionButton icon={<Upload className="size-5" />} label="导入" onClick={handleImportClick} />
          
          <ActionButton 
            icon={<Download className="size-5" />} 
            label="导出" 
            onClick={() => setExportDialogOpen(true)}
          />

          <NavItem to="/statistics" icon={<TrendingUp className="size-5" />} label="统计" active={isActive("/statistics")} />
        </div>

        <div className="my-3 h-px w-6 bg-border/20" />

        {/* 底部抽屉快捷按钮 */}
        <div className="flex flex-col items-center gap-1" data-tour="bottom-drawer">
          <DrawerToggle
            view="outline"
            icon={<ListTree className="size-5" />}
            label="大纲面板"
            active={bottomDrawerOpen && bottomDrawerView === "outline"}
            onClick={() => toggleBottomDrawer("outline")}
          />
          <DrawerToggle
            view="characters"
            icon={<Users className="size-5" />}
            label="角色面板"
            active={bottomDrawerOpen && bottomDrawerView === "characters"}
            onClick={() => toggleBottomDrawer("characters")}
          />
          <DrawerToggle
            view="world"
            icon={<BookOpen className="size-5" />}
            label="世界观面板"
            active={bottomDrawerOpen && bottomDrawerView === "world"}
            onClick={() => toggleBottomDrawer("world")}
          />
        </div>

        {/* 底部 */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground" disabled={projects.length === 0}>
                    <MoreHorizontal className="size-5" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">更多</TooltipContent>
            </Tooltip>
            <PopoverContent side="right" align="end" className="w-48 p-1">
              <button onClick={handleDeleteAllBooks} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" /> 删除所有书籍
              </button>
            </PopoverContent>
          </Popover>

          <NavItem to="/settings/design" icon={<Settings className="size-5" />} label="设置" active={isActive("/settings")} />
        </div>

        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
      </TooltipProvider>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        projectId={selectedProjectId || projects[0]?.id || ""}
        projectTitle={projects.find(p => p.id === (selectedProjectId || projects[0]?.id))?.title}
      />
    </aside>
  );
}

// 导航项组件
function NavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-lg transition-all",
            active
              ? "bg-sidebar-accent text-primary"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          )}
        >
          {active && <div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary" />}
          {icon}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

// 操作按钮组件
function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

// 底部抽屉切换按钮
function DrawerToggle({ icon, label, active, onClick }: { view: BottomDrawerView; icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-lg transition-all",
            active
              ? "bg-sidebar-accent text-primary"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          )}
        >
          {active && <div className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-t bg-primary" />}
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
