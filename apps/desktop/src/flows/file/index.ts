/**
 * @file index.ts
 * @description 文件操作 Actions 统一导出
 *
 * 所有文件的创建和打开操作都通过这里导出的 action 执行，
 * 确保操作通过队列串行执行，避免竞态条件。
 *
 * @see .kiro/steering/design-patterns.md
 */

export type { CreateFileParams, CreateFileResult } from "./create-file.flow"
export { createFile, createFileAsync } from "./create-file.flow"
export type { OpenFileParams, OpenFileResult } from "./open-file.flow"
export { openFile, openFileAsync } from "./open-file.flow"
