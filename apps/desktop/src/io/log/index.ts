/**
 * @file io/log/index.ts
 * @description 日志 IO 模块导出
 */

// 新的函数式日志 API
export * from './logger.api';

// SQLite 存储 API
export * from './log.storage.api';

// 旧的日志系统（向后兼容，标记为废弃）
/** @deprecated 使用 logger.api.ts 中的新函数式接口 */
export { default as legacyLogger } from './logger';