/**
 * @file types/index.ts
 * @description 类型定义层统一导出
 *
 * 本目录包含所有数据类型定义，遵循 Interface + Builder + Zod Schema 模式：
 * - xxx.interface.ts - 纯数据接口（readonly 属性）
 * - xxx.schema.ts - Zod 运行时校验
 * - xxx.builder.ts - Builder 构建器
 */

// ==============================
// 数据库模型类型
// ==============================

// Attachment 类型模块
export * from "./attachment";
// Backup 类型模块
export * from "./backup";
// Content 类型模块
export * from "./content";
// Node 类型模块
export * from "./node";
// Shared 基础类型模块
export * from "./shared";
// Storage 类型模块
export * from "./storage";
// Tag 类型模块
export * from "./tag";
// User 类型模块
export * from "./user";
// Workspace 类型模块
export * from "./workspace";

// ==============================
// Domain 类型（从 domain/ 迁移）
// ==============================

// Diagram 类型模块
export * from "./diagram";
// Editor History 类型模块
export * from "./editor-history";
// Editor Tab 类型模块
export * from "./editor-tab";
// Export 类型模块
export * from "./export";
// Font 类型模块
export * from "./font";
// Icon Theme 类型模块
export * from "./icon-theme";
// Save 类型模块
export * from "./save";
// Selection 类型模块
export * from "./selection";
// Sidebar 类型模块
export * from "./sidebar";
// Theme 类型模块
export * from "./theme";
// UI 类型模块
export * from "./ui";
// Writing 类型模块
export * from "./writing";
