/**
 * @file fn/wiki/index.ts
 * @deprecated 此模块已迁移到 @/pipes/wiki 和 @/flows/wiki，请使用新路径
 */

// Pure functions
export * from "@/pipes/wiki";

// IO functions (for backward compatibility)
export { getWikiFiles, getWikiFilesAsync } from "@/flows/wiki";
