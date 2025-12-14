/**
 * 导出设置页面
 * Export Settings Page
 * 
 * Requirements: 5.1, 5.2, 5.5
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, Trash2, Download, AlertCircle, FileText } from "lucide-react";
import {
  getDefaultExportPath,
  setDefaultExportPath,
  selectExportDirectory,
  getDownloadsDirectory,
  isTauriEnvironment,
} from "@/services/export-path";
// Org-mode settings (simplified)
interface OrgmodeSettings {
  orgRoamPath: string | null;
  diarySubdir: string;
  enabled: boolean;
}

const ORGMODE_SETTINGS_KEY = "orgmode-settings";

function getOrgmodeSettings(): OrgmodeSettings {
  try {
    const stored = localStorage.getItem(ORGMODE_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { orgRoamPath: null, diarySubdir: "diary", enabled: false };
}

function saveOrgmodeSettings(settings: OrgmodeSettings): void {
  localStorage.setItem(ORGMODE_SETTINGS_KEY, JSON.stringify(settings));
}
import { toast } from "sonner";

export const Route = createFileRoute("/settings/export")({
  component: ExportSettingsPage,
});

function ExportSettingsPage() {
  const [defaultPath, setDefaultPathState] = useState<string | null>(null);
  const [downloadsDir, setDownloadsDir] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  
  // Org-mode 设置
  const [orgSettings, setOrgSettings] = useState<OrgmodeSettings>({
    orgRoamPath: null,
    diarySubdir: "diary",
    enabled: false,
  });

  // 加载初始设置
  useEffect(() => {
    setIsTauri(isTauriEnvironment());
    setDefaultPathState(getDefaultExportPath());
    setOrgSettings(getOrgmodeSettings());
    
    // 获取系统下载目录
    getDownloadsDirectory().then((dir) => {
      setDownloadsDir(dir);
    });
  }, []);

  // 选择导出路径
  // Uses current default path as initial directory (Requirements 5.4)
  const handleSelectPath = async () => {
    if (!isTauri) {
      toast.error("此功能仅在桌面应用中可用");
      return;
    }

    setIsLoading(true);
    try {
      // Use current default path or downloads directory as initial directory
      const initialDir = defaultPath || downloadsDir || null;
      const selectedPath = await selectExportDirectory(initialDir);
      if (selectedPath) {
        setDefaultExportPath(selectedPath);
        setDefaultPathState(selectedPath);
        toast.success("默认导出路径已设置");
      }
    } catch (error) {
      toast.error(`选择路径失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除默认路径
  const handleClearPath = () => {
    setDefaultExportPath(null);
    setDefaultPathState(null);
    toast.success("默认导出路径已清除，将使用系统下载目录");
  };

  // 选择 org-roam 路径
  const handleSelectOrgRoamPath = async () => {
    if (!isTauri) {
      toast.error("此功能仅在桌面应用中可用");
      return;
    }

    setIsLoading(true);
    try {
      const selectedPath = await selectExportDirectory(orgSettings.orgRoamPath);
      if (selectedPath) {
        const newSettings = { ...orgSettings, orgRoamPath: selectedPath };
        setOrgSettings(newSettings);
        saveOrgmodeSettings(newSettings);
        toast.success("Org-roam 路径已设置");
      }
    } catch (error) {
      toast.error(`选择路径失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 更新 org-roam 设置
  const updateOrgSettings = (updates: Partial<OrgmodeSettings>) => {
    const newSettings = { ...orgSettings, ...updates };
    setOrgSettings(newSettings);
    saveOrgmodeSettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">导出设置</h3>
        <p className="text-sm text-muted-foreground">
          配置文件导出的默认路径和相关选项
        </p>
      </div>
      <Separator />

      <div className="grid gap-8">
        {/* 环境提示 */}
        {!isTauri && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="size-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-500">浏览器环境</p>
              <p className="text-sm text-muted-foreground">
                自定义导出路径功能仅在桌面应用中可用。在浏览器中，文件将自动下载到默认下载目录。
              </p>
            </div>
          </div>
        )}

        {/* 默认导出路径 */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base">默认导出路径</Label>
              <p className="text-sm text-muted-foreground">
                设置导出文件时的默认保存目录。如果未设置，将使用系统下载目录。
              </p>
            </div>
          </div>

          {/* 当前路径显示 */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <FolderOpen className="size-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              {defaultPath ? (
                <p className="text-sm font-mono truncate" title={defaultPath}>
                  {defaultPath}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {downloadsDir ? (
                    <span className="font-mono">{downloadsDir}</span>
                  ) : (
                    "系统下载目录（默认）"
                  )}
                </p>
              )}
            </div>
            {defaultPath && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                自定义
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSelectPath}
              disabled={isLoading || !isTauri}
            >
              <FolderOpen className="size-4" />
              选择路径
            </Button>
            {defaultPath && (
              <Button
                variant="ghost"
                onClick={handleClearPath}
                disabled={isLoading}
              >
                <Trash2 className="size-4" />
                清除设置
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* 系统下载目录信息 */}
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Label className="text-base">系统下载目录</Label>
            <p className="text-sm text-muted-foreground">
              当未设置默认导出路径时，文件将保存到此目录。
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed">
            <Download className="size-5 text-muted-foreground shrink-0" />
            <p className="text-sm font-mono text-muted-foreground truncate">
              {downloadsDir || "无法获取系统下载目录"}
            </p>
          </div>
        </div>

        <Separator />

        {/* Org-mode / Org-roam 集成 */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <Label className="text-base">Org-mode 集成</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                将日记导出为 Emacs Org-mode 格式，与 org-roam 目录结构无缝集成。
              </p>
            </div>
            <Switch
              checked={orgSettings.enabled}
              onCheckedChange={(checked) => updateOrgSettings({ enabled: checked })}
              disabled={!isTauri}
            />
          </div>

          {orgSettings.enabled && (
            <div className="space-y-4 pl-7">
              {/* Org-roam 根目录 */}
              <div className="space-y-2">
                <Label className="text-sm">Org-roam 根目录</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <FolderOpen className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    {orgSettings.orgRoamPath ? (
                      <p className="text-sm font-mono truncate" title={orgSettings.orgRoamPath}>
                        {orgSettings.orgRoamPath}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        未设置（如 ~/org-roam）
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectOrgRoamPath}
                    disabled={isLoading || !isTauri}
                  >
                    <FolderOpen className="size-4" />
                    选择路径
                  </Button>
                  {orgSettings.orgRoamPath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateOrgSettings({ orgRoamPath: null })}
                      disabled={isLoading}
                    >
                      <Trash2 className="size-4" />
                      清除
                    </Button>
                  )}
                </div>
              </div>

              {/* 日记子目录 */}
              <div className="space-y-2">
                <Label className="text-sm">日记子目录</Label>
                <Input
                  value={orgSettings.diarySubdir}
                  onChange={(e) => updateOrgSettings({ diarySubdir: e.target.value })}
                  placeholder="diary"
                  className="max-w-xs font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  日记将保存到: {orgSettings.orgRoamPath || "~/org-roam"}/{orgSettings.diarySubdir}/year-YYYY-Zodiac/month-MM-Name/day-DD-Day/
                </p>
              </div>

              {/* 路径预览 */}
              {orgSettings.orgRoamPath && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                    示例路径: {orgSettings.orgRoamPath}/{orgSettings.diarySubdir}/year-2025-Snake/month-12-December/day-13-Saturday/diary-1734123456-21:15:51.org
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
