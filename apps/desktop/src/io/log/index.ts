/**
 * IO Log - 日志模块
 *
 * 职责：提供应用日志功能，包括控制台输出和 IndexedDB 持久化
 * 依赖：types/（通过 Dexie）
 *
 * @module io/log
 */

export { default as logger, default, ICONS } from "./logger";
export { LogDB, logDB, type LogEntry } from "./log-db";
