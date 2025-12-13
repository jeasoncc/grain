/**
 * Org-mode 导出服务
 * 支持导出为 Emacs Org-mode 格式，并与 org-roam 目录结构集成
 */

import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { db } from "@/db/curd";
import type { SceneInterface } from "@/db/schema";
import { extractTextFromSerialized } from "@/lib/statistics";
import { isTauriEnvironment } from "./export-path";
import logger from "@/log";

// Org-roam 设置存储键
const ORGMODE_SETTINGS_KEY = "novel-editor-orgmode-settings";

/**
 * Org-mode 导出设置
 */
export interface OrgmodeSettings {
  /** org-roam 根目录路径，如 ~/org-roam */
  orgRoamPath: string | null;
  /** 日记子目录，如 diary */
  diarySubdir: string;
  /** 是否启用 org-roam 集成 */
  enabled: boolean;
}

const DEFAULT_SETTINGS: OrgmodeSettings = {
  orgRoamPath: null,
  diarySubdir: "diary",
  enabled: false,
};

/**
 * 获取 Org-mode 设置
 */
export function getOrgmodeSettings(): OrgmodeSettings {
  try {
    const stored = localStorage.getItem(ORGMODE_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    logger.error("Failed to load orgmode settings:", error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * 保存 Org-mode 设置
 */
export function saveOrgmodeSettings(settings: Partial<OrgmodeSettings>): void {
  try {
    const current = getOrgmodeSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(ORGMODE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error("Failed to save orgmode settings:", error);
  }
}

/**
 * 月份英文名
 */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * 星期英文名
 */
const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

/**
 * 生肖英文名
 */
const ZODIAC_ANIMALS_EN = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

/**
 * 获取生肖英文名
 */
function getZodiacEn(year: number): string {
  const index = (year - 1900) % 12;
  return ZODIAC_ANIMALS_EN[index];
}

/**
 * 生成 org-roam 风格的文件路径
 * 格式: ~/org-roam/diary/year-YYYY-Zodiac/month-MM-MonthName/day-DD-DayName/diary-timestamp-HH:MM:SS.org
 */
export function generateOrgRoamPath(date: Date = new Date()): {
  relativePath: string;
  filename: string;
  fullPath: string;
} {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();
  const timestamp = Math.floor(date.getTime() / 1000);
  const timeStr = dayjs(date).format("HH:mm:ss");

  const zodiac = getZodiacEn(year);
  
  const yearFolder = `year-${year}-${zodiac}`;
  const monthFolder = `month-${String(month + 1).padStart(2, "0")}-${MONTH_NAMES[month]}`;
  const dayFolder = `day-${String(day).padStart(2, "0")}-${WEEKDAY_NAMES[weekday]}`;
  const filename = `diary-${timestamp}-${timeStr.replace(/:/g, ":")}.org`;

  const relativePath = `${yearFolder}/${monthFolder}/${dayFolder}`;
  
  return {
    relativePath,
    filename,
    fullPath: `${relativePath}/${filename}`,
  };
}


/**
 * 从 Lexical JSON 内容提取文本
 */
function extractText(content: string | any): string {
  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return extractTextFromSerialized(parsed);
  } catch {
    return typeof content === "string" ? content : "";
  }
}

/**
 * 将场景内容转换为 Org-mode 格式
 */
export function convertToOrgmode(
  scene: SceneInterface,
  options?: {
    includeProperties?: boolean;
    includeTimestamp?: boolean;
  }
): string {
  const { includeProperties = true, includeTimestamp = true } = options || {};
  
  const lines: string[] = [];
  const now = new Date();
  const createDate = scene.createDate ? new Date(scene.createDate) : now;
  
  // 文件头属性
  if (includeProperties) {
    lines.push(`:PROPERTIES:`);
    lines.push(`:ID: ${scene.id}`);
    lines.push(`:END:`);
    lines.push(`#+title: ${scene.title}`);
    lines.push(`#+filetags: :diary:novel-editor:`);
    if (includeTimestamp) {
      lines.push(`#+date: [${dayjs(createDate).format("YYYY-MM-DD ddd HH:mm")}]`);
    }
    lines.push("");
  }

  // 提取并转换内容
  const text = extractText(scene.content);
  
  if (text.trim()) {
    // 按段落分割
    const paragraphs = text.split("\n");
    
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        lines.push("");
        continue;
      }
      
      // 检测标题格式 (如 "📅 2025-12-13" 或 "📋 TODO")
      if (trimmed.startsWith("📅") || trimmed.startsWith("📋") || trimmed.startsWith("📝")) {
        // 转换为 org 标题
        const level = trimmed.startsWith("📅") ? "*" : "**";
        lines.push(`${level} ${trimmed}`);
      } else if (trimmed.startsWith("🐲") || trimmed.startsWith("⏰")) {
        // 元信息行
        lines.push(trimmed);
      } else if (trimmed.startsWith("待办事项") || trimmed.match(/^[-*]\s/)) {
        // TODO 项
        lines.push(`- [ ] ${trimmed.replace(/^[-*]\s*/, "").replace(/^待办事项\s*\d*\s*/, "待办事项")}`);
      } else {
        lines.push(trimmed);
      }
    }
  }

  return lines.join("\n");
}

/**
 * 将日记导出为 Org-mode 文件到 org-roam 目录
 */
export async function exportDiaryToOrgRoam(
  scene: SceneInterface,
  date?: Date
): Promise<{ success: boolean; path?: string; error?: string }> {
  const settings = getOrgmodeSettings();
  
  if (!settings.enabled || !settings.orgRoamPath) {
    return { 
      success: false, 
      error: "Org-roam 集成未启用或路径未配置" 
    };
  }

  if (!isTauriEnvironment()) {
    return { 
      success: false, 
      error: "此功能仅在桌面应用中可用" 
    };
  }

  try {
    const exportDate = date || (scene.createDate ? new Date(scene.createDate) : new Date());
    const { relativePath, filename } = generateOrgRoamPath(exportDate);
    
    // 构建完整路径
    const basePath = settings.orgRoamPath.replace(/^~/, "");
    const diaryPath = settings.diarySubdir 
      ? `${basePath}/${settings.diarySubdir}/${relativePath}`
      : `${basePath}/${relativePath}`;
    
    // 转换内容
    const orgContent = convertToOrgmode(scene);
    
    // 创建目录并保存文件
    await invoke("ensure_directory_and_save", {
      directory: diaryPath,
      filename,
      content: orgContent,
      expandHome: settings.orgRoamPath.startsWith("~"),
    });

    const fullPath = `${settings.orgRoamPath}/${settings.diarySubdir}/${relativePath}/${filename}`;
    
    return { 
      success: true, 
      path: fullPath 
    };
  } catch (error) {
    logger.error("Failed to export to org-roam:", error);
    return { 
      success: false, 
      error: String(error) 
    };
  }
}

/**
 * 批量导出日记到 org-roam
 */
export async function exportAllDiariesToOrgRoam(
  projectId: string
): Promise<{ 
  success: number; 
  failed: number; 
  errors: string[] 
}> {
  const scenes = await db.getScenesByProject(projectId);
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const scene of scenes) {
    const result = await exportDiaryToOrgRoam(scene);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${scene.title}: ${result.error}`);
      }
    }
  }

  return results;
}

/**
 * 将项目导出为 Org-mode 格式（单文件）
 */
export async function exportProjectToOrg(
  projectId: string
): Promise<string> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error("项目不存在");

  const chapters = await db.chapters
    .where("project")
    .equals(projectId)
    .sortBy("order");

  const scenes = await db.scenes.where("project").equals(projectId).toArray();

  const lines: string[] = [];

  // 文件头
  lines.push(`#+title: ${project.title || "未命名作品"}`);
  lines.push(`#+author: ${project.author || "未知作者"}`);
  lines.push(`#+date: [${dayjs().format("YYYY-MM-DD ddd")}]`);
  lines.push(`#+filetags: :novel:novel-editor:`);
  lines.push("");

  // 章节内容
  for (const chapter of chapters) {
    lines.push(`* ${chapter.title}`);
    lines.push("");

    const chapterScenes = scenes
      .filter(s => s.chapter === chapter.id)
      .sort((a, b) => a.order - b.order);

    for (const scene of chapterScenes) {
      lines.push(`** ${scene.title}`);
      
      const text = extractText(scene.content);
      if (text.trim()) {
        lines.push("");
        const paragraphs = text.split("\n").filter(p => p.trim());
        for (const para of paragraphs) {
          lines.push(para.trim());
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
