/**
 * @file fn/index.ts
 * @deprecated 此目录已迁移到新架构，请使用新路径：
 *
 * - 纯业务函数 → @/pipes/
 * - 通用工具函数 → @/utils/
 * - 含 IO 的流程 → @/flows/
 * - UI 相关 → @/views/
 *
 * 迁移对照：
 * - fn/node/ → pipes/node/
 * - fn/content/ → pipes/content/
 * - fn/tag/ → pipes/tag/
 * - fn/export/ → pipes/export/
 * - fn/import/ → pipes/import/
 * - fn/search/ → pipes/search/
 * - fn/format/ → pipes/format/
 * - fn/wiki/ → pipes/wiki/
 * - fn/word-count/ → pipes/word-count/
 * - fn/date/ → utils/date.util.ts
 * - fn/keyboard/ → utils/keyboard.util.ts
 * - fn/save/ → flows/save/
 * - fn/updater/ → flows/updater/
 * - fn/migration/ → flows/migration/
 * - fn/editor/ → views/editor/
 * - fn/editor-tab/ → views/editor-tabs/
 * - fn/editor-history/ → views/editor-history/
 * - fn/diagram/ → views/diagram/
 * - fn/drawing/ → views/drawing/
 * - fn/theme/ → views/theme/
 * - fn/icon-theme/ → views/icon-theme/
 * - fn/writing/ → views/writing/
 * - fn/ledger/ → views/ledger/
 */

// 兼容性重导出（将在未来版本移除）
export * as contentFn from "./content";
export * as dateFn from "./date";
export * as diagramFn from "./diagram";
export * as drawingFn from "./drawing";
export * as editorHistoryFn from "./editor-history";
export * as editorTabFn from "./editor-tab";
export * as exportFn from "./export";
export * as formatFn from "./format";
export * as iconThemeFn from "./icon-theme";
export * as importFn from "./import";
export * as keyboardFn from "./keyboard";
export * as ledgerFn from "./ledger";
export * as nodeFn from "./node";
export * as saveFn from "./save";
export * as searchFn from "./search";
export * as tagFn from "./tag";
export * as themeFn from "./theme";
export * as wikiFn from "./wiki";
export * as wordCountFn from "./word-count";
export * as writingFn from "./writing";
