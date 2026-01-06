/**
 * IO/API - Rust 后端 API 层
 *
 * 职责：与 Rust 后端交互（invoke/fetch）
 * 依赖：types/
 *
 * @deprecated 迁移中，请使用具体的 api 文件
 */

// Client
export * from "./client.api";

// Workspace API
export * from "./workspace.api";

// Node API
export * from "./node.api";

// Content API
export * from "./content.api";

// User API
export * from "./user.api";

// Tag API
export * from "./tag.api";

// Attachment API
export * from "./attachment.api";

// Backup API
export * from "./backup.api";

// Clear Data API
export * from "./clear-data.api";
