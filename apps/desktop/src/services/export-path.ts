/**
 * Export路径服务 - 支持 Tauri 环境的目录选择和文件保存
 * Export Path Service - Directory selection and file saving for Tauri environment
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import { invoke } from "@tauri-apps/api/core";
import { saveAs } from "file-saver";
import logger from "@/log";

/**
 * Export设置接口
 * Export settings interface
 */
export interface ExportSettings {
  defaultExportPath: string | null;
  lastUsedPath: string | null;
}

const EXPORT_SETTINGS_KEY = "novel-editor-export-settings";

/**
 * 检查是否在 Tauri 环境中运行
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && !!(window as any).__TAURI__;
}

/**
 * 选择Export目录
 * Select export directory using native dialog
 * 
 * @param initialDirectory - 可选的初始目录路径，对话框将从此目录打开
 * @returns 选择的目录路径，如果用户取消则返回 null
 */
export async function selectExportDirectory(initialDirectory?: string | null): Promise<string | null> {
  if (!isTauriEnvironment()) {
    logger.warn("selectExportDirectory: Not in Tauri environment, returning null");
    return null;
  }

  try {
    const result = await invoke<string | null>("select_directory", {
      initialDirectory: initialDirectory || null,
    });
    return result;
  } catch (error) {
    logger.error("Failed to select directory:", error);
    throw new Error(`目录选择失败: ${error}`);
  }
}

/**
 * 将文件保存到指定路径
 * Save file to specified path
 * 
 * @param path - Target目录路径
 * @param filename - 文件名
 * @param content - 文件内容 (Blob 或 Uint8Array)
 */
export async function saveToPath(
  path: string,
  filename: string,
  content: Blob | Uint8Array
): Promise<void> {
  if (!isTauriEnvironment()) {
    // 浏览器环境降级处理：使用 file-saver 下载
    logger.warn("saveToPath: Not in Tauri environment, falling back to browser download");
    if (content instanceof Uint8Array) {
      // Create a new ArrayBuffer to avoid SharedArrayBuffer type issues
      const buffer = new ArrayBuffer(content.length);
      new Uint8Array(buffer).set(content);
      const blob = new Blob([buffer]);
      saveAs(blob, filename);
    } else {
      saveAs(content, filename);
    }
    return;
  }

  try {
    // 将 Blob 转换为 Uint8Array
    let contentArray: number[];
    if (content instanceof Blob) {
      const arrayBuffer = await content.arrayBuffer();
      contentArray = Array.from(new Uint8Array(arrayBuffer));
    } else {
      contentArray = Array.from(content);
    }

    await invoke("save_file", {
      path,
      filename,
      content: contentArray,
    });
  } catch (error) {
    logger.error("Failed to save file:", error);
    throw new Error(`文件保存失败: ${error}`);
  }
}

/**
 * 获取系统下载目录
 * Get system downloads directory
 * 
 * @returns 下载目录路径
 */
export async function getDownloadsDirectory(): Promise<string> {
  if (!isTauriEnvironment()) {
    // 浏览器环境返回空字符串
    return "";
  }

  try {
    const result = await invoke<string>("get_downloads_dir");
    return result;
  } catch (error) {
    logger.error("Failed to get downloads directory:", error);
    return "";
  }
}

/**
 * 获取Export设置
 * Get export settings from localStorage
 */
export function getExportSettings(): ExportSettings {
  try {
    const stored = localStorage.getItem(EXPORT_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error("Failed to load export settings:", error);
  }
  
  return {
    defaultExportPath: null,
    lastUsedPath: null,
  };
}

/**
 * 保存Export设置
 * Save export settings to localStorage
 */
export function saveExportSettings(settings: ExportSettings): void {
  try {
    localStorage.setItem(EXPORT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error("Failed to save export settings:", error);
  }
}

/**
 * 获取默认Export路径
 * Get default export path
 */
export function getDefaultExportPath(): string | null {
  return getExportSettings().defaultExportPath;
}

/**
 * 设置默认Export路径
 * Set default export path
 */
export function setDefaultExportPath(path: string | null): void {
  const settings = getExportSettings();
  settings.defaultExportPath = path;
  saveExportSettings(settings);
}

/**
 * 获取最后使用的路径
 * Get last used export path
 */
export function getLastUsedPath(): string | null {
  return getExportSettings().lastUsedPath;
}

/**
 * 设置最后使用的路径
 * Set last used export path
 */
export function setLastUsedPath(path: string | null): void {
  const settings = getExportSettings();
  settings.lastUsedPath = path;
  saveExportSettings(settings);
}

/**
 * 清除默认Export路径
 * Clear default export path
 */
export function clearDefaultExportPath(): void {
  setDefaultExportPath(null);
}

/**
 * Export路径服务接口
 * Export path service interface (as defined in design.md)
 */
export interface ExportPathService {
  selectExportDirectory(): Promise<string | null>;
  saveToPath(path: string, filename: string, content: Blob): Promise<void>;
  getDefaultExportPath(): string | null;
  setDefaultExportPath(path: string | null): void;
  isTauriEnvironment(): boolean;
}

/**
 * Export路径服务实例
 * Export path service instance
 */
export const exportPathService: ExportPathService = {
  selectExportDirectory,
  saveToPath,
  getDefaultExportPath,
  setDefaultExportPath,
  isTauriEnvironment,
};

/**
 * 带路径选择的Export函数
 * Export with path selection
 * 
 * @param filename - 文件名
 * @param content - 文件内容
 * @param options - Export选项
 * @returns Export结果，包含成功状态和路径信息
 */
export async function exportWithPathSelection(
  filename: string,
  content: Blob | Uint8Array,
  options?: {
    useDefaultPath?: boolean;
    showSuccessMessage?: boolean;
  }
): Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }> {
  const { useDefaultPath = true } = options || {};

  // 非 Tauri 环境直接使用浏览器下载
  if (!isTauriEnvironment()) {
    try {
      if (content instanceof Uint8Array) {
        // Create a new ArrayBuffer to avoid SharedArrayBuffer type issues
        const buffer = new ArrayBuffer(content.length);
        new Uint8Array(buffer).set(content);
        const blob = new Blob([buffer]);
        saveAs(blob, filename);
      } else {
        saveAs(content, filename);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  try {
    // 获取初始目录 (Requirements 5.4: 使用默认路径作为初始目录)
    let initialPath: string | null = null;
    
    if (useDefaultPath) {
      // 优先使用默认Export路径，其次使用最后使用的路径
      initialPath = getDefaultExportPath() || getLastUsedPath();
    }

    // 如果没有默认路径，尝试获取下载目录
    if (!initialPath) {
      initialPath = await getDownloadsDirectory();
    }

    // 显示目录选择对话框，使用初始路径作为起始目录
    const selectedPath = await selectExportDirectory(initialPath);
    
    // 用户取消选择
    if (!selectedPath) {
      return { success: false, cancelled: true };
    }

    // 保存文件
    await saveToPath(selectedPath, filename, content);

    // 更新最后使用的路径
    setLastUsedPath(selectedPath);

    return { 
      success: true, 
      path: `${selectedPath}/${filename}` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: String(error) 
    };
  }
}
