/**
 * @file index.ts
 * @description 文件操作 Actions 统一导出
 *
 * 所有文件的创建和打开操作都通过这里导出的 action 执行，
 * 确保操作通过队列串行执行，避免竞态条件。
 *
 * @see .kiro/steering/design-patterns.md
 */

export { createFile } from "./create-file.action";
export type { CreateFileParams, CreateFileResult } from "./create-file.action";
export { openFile } from "./open-file.action";
export type { OpenFileParams, OpenFileResult } from "./open-file.action";
