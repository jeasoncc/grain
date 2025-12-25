/**
 * @file fn/index.ts
 * @description 纯函数层统一导出
 *
 * 本目录包含所有纯函数（管道节点），特点：
 * - 无副作用 (No Side Effects)
 * - 相同输入 → 相同输出 (Referential Transparency)
 * - 可组合 (Composable)
 * - 可测试 (Testable)
 *
 * 使用 fp-ts pipe 进行函数组合
 *
 * 注意：由于不同模块可能有同名函数（如 filterByType），
 * 建议直接从子模块导入以避免命名冲突：
 * - import { filterByType } from "@/fn/node"
 * - import { filterByType } from "@/fn/search"
 */

// Content 纯函数（模板和内容生成）
export * as contentFn from "./content";
// Date 纯函数（通用日期模块）
export * as dateFn from "./date";
// Diagram 纯函数（图表相关）
export * as diagramFn from "./diagram";
// Drawing 纯函数（绘图相关）
export * as drawingFn from "./drawing";
// Editor History 纯函数（编辑器历史记录）
export * as editorHistoryFn from "./editor-history";
// Editor Tab 纯函数（编辑器标签页）
export * as editorTabFn from "./editor-tab";
// Export 纯函数（JSON、Markdown、Org-mode 导出）
export * as exportFn from "./export";
// Format 纯函数（格式化工具）
export * as formatFn from "./format";
// Icon Theme 纯函数（图标主题）
export * as iconThemeFn from "./icon-theme";
// Import 纯函数（Markdown 导入）
export * as importFn from "./import";
export * as keyboardFn from "./keyboard";
// Keyboard 纯函数（键盘快捷键）
// Ledger 纯函数（记账模板）
export * as ledgerFn from "./ledger";
// Node 纯函数
export * as nodeFn from "./node";
// Save 纯函数（保存相关）
export * as saveFn from "./save";
// Search 纯函数
export * as searchFn from "./search";
// Tag 纯函数（标签提取和处理）
export * as tagFn from "./tag";
// Theme 纯函数（主题相关）
export * as themeFn from "./theme";
// Wiki 纯函数（Wiki 文件管理和迁移）
export * as wikiFn from "./wiki";
// Word Count 纯函数（字数统计）
export * as wordCountFn from "./word-count";
// Writing 纯函数（写作状态）
export * as writingFn from "./writing";
