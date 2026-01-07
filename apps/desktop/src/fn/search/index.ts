/**
 * @file fn/search/index.ts
 * @deprecated 此模块已迁移到 @/pipes/search 和 @/flows/search，请使用新路径
 */

// 纯函数从 pipes/search 导出
export * from "@/pipes/search";

// SearchEngine 从 flows/search 导出
export { searchEngine, SearchEngine } from "@/flows/search";
