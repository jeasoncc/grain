/**
 * @file services/import-export.ts
 * @description Import/Export 服务模块 - 向后兼容导出
 *
 * @deprecated 建议直接从 @/fn/export, @/fn/import, @/routes/actions 导入
 *
 * 本文件提供向后兼容性，将导入导出功能从新架构重新导出。
 * 新代码应直接使用：
 * - @/fn/export - 纯函数导出
 * - @/fn/import - 纯函数导入
 * - @/routes/actions - Action 函数
 */

// 从 fn/content 重新导出文本提取
export { extractText } from "@/fn/content";
// 从 fn/export 重新导出下载工具
export { triggerBlobDownload, triggerDownload } from "@/fn/export";
// 从 fn/import 重新导出类型
export type { ExportBundle } from "@/fn/import";
// 从 fn/import 重新导出文件读取
export { readFileAsText } from "@/fn/import";

// 从 routes/actions 重新导出 Action 函数（Promise 版本，向后兼容）
export { exportAllAsync as exportAll } from "@/routes/actions/export-all.action";
export { exportAsMarkdownAsync as exportAsMarkdown } from "@/routes/actions/export-workspace-markdown.action";
export { exportAllAsZipAsync as exportAllAsZip } from "@/routes/actions/export-zip.action";
export { importFromJsonAsync as importFromJson } from "@/routes/actions/import-json.action";
