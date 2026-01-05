/**
 * IO - 外部交互层
 *
 * 职责：与外部世界交互（Rust API、localStorage、文件系统）
 * 依赖：types/
 */

export * from "./api";
export * from "./storage";
export * from "./file";
