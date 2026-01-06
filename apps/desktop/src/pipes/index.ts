/**
 * Pipes - 纯管道层
 *
 * 职责：业务数据转换（纯函数）
 * 依赖：utils/, types/
 *
 * 特点：
 * - 无副作用 (No Side Effects)
 * - 相同输入 → 相同输出 (Referential Transparency)
 * - 可组合 (Composable)
 * - 可测试 (Testable)
 */

// Content 管道（模板和内容生成）
export * as contentPipe from "./content";

// Editor Tab 管道（编辑器标签页操作）
export * as editorTabPipe from "./editor-tab";

// Export 管道（JSON、Markdown、Org-mode 导出）
export * as exportPipe from "./export";

// Format 管道（格式化工具）
export * as formatPipe from "./format";

// Import 管道（Markdown 导入）
export * as importPipe from "./import";

// Node 管道（节点树操作）
export * as nodePipe from "./node";

// Search 管道（搜索引擎）
export * as searchPipe from "./search";

// Tag 管道（标签提取和处理）
export * as tagPipe from "./tag";

// Wiki 管道（Wiki 文件管理）
export * as wikiPipe from "./wiki";

// Word Count 管道（字数统计）
export * as wordCountPipe from "./word-count";

// Writing 管道（写作状态纯函数）
export * as writingPipe from "./writing";

// Theme 管道（主题纯函数）
export * as themePipe from "./theme";
