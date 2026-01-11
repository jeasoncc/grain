/**
 * @file migration.flow.ts
 * @description IndexedDB 到 SQLite 日志迁移流程
 *
 * 处理从旧的 IndexedDB 日志系统迁移到新的 SQLite 系统
 */

import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import type { LogEntry } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";

// 旧的 IndexedDB 接口
import { logDB } from "@/io/db/log-db";

// 新的 SQLite API
import { saveLogsBatchToSQLite, initLogDatabase } from "@/io/log/log.storage.api";

// 格式化函数
import { formatLogEntry } from "@/pipes/log/log.format.pipe";

// ============================================================================
// 迁移检测
// ============================================================================

/**
 * 检查是否需要迁移
 * 
 * @returns TaskEither<AppError, boolean>
 */
export const checkNeedsMigrationFlow = (): TE.TaskEither<AppError, boolean> =>
  pipe(
    TE.tryCatch(
      async () => {
        // 检查 IndexedDB 中是否有日志数据
        const count = await logDB.logs.count();
        return count > 0;
      },
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to check migration status: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 获取 IndexedDB 中的所有日志
 * 
 * @returns TaskEither<AppError, LogEntry[]>
 */
const getAllIndexedDBLogs = (): TE.TaskEither<AppError, LogEntry[]> =>
  pipe(
    TE.tryCatch(
      async () => {
        const logs = await logDB.logs.orderBy('timestamp').toArray();
        
        // 转换为新的日志格式
        return logs.map((log): LogEntry => ({
          id: log.id?.toString(),
          timestamp: log.timestamp,
          level: mapOldLevelToNew(log.level),
          message: log.message,
          context: undefined, // 旧系统没有 context
          source: 'migrated', // 标记为迁移的日志
        }));
      },
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to read IndexedDB logs: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 映射旧的日志级别到新的级别
 * 
 * @param oldLevel - 旧的日志级别字符串
 * @returns 新的日志级别
 */
const mapOldLevelToNew = (oldLevel: string): LogEntry['level'] => {
  const level = oldLevel.toLowerCase();
  switch (level) {
    case 'debug':
      return 'debug';
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    case 'warn':
    case 'warning':
      return 'warn';
    case 'error':
    case 'fatal':
      return 'error';
    case 'trace':
    case 'verbose':
      return 'trace';
    default:
      return 'info'; // 默认级别
  }
};

// ============================================================================
// 批量迁移
// ============================================================================

/**
 * 批量迁移日志到 SQLite
 * 
 * @param logs - 要迁移的日志条目
 * @param batchSize - 批量大小
 * @returns TaskEither<AppError, number> 返回迁移的条目数
 */
const migrateBatchToSQLite = (
  logs: LogEntry[],
  batchSize = 50,
): TE.TaskEither<AppError, number> => {
  if (logs.length === 0) {
    return TE.right(0);
  }

  // 分批处理
  const batches = A.chunksOf(batchSize)(logs);
  
  return pipe(
    batches,
    A.map((batch) => saveLogsBatchToSQLite(batch)),
    A.sequence(TE.ApplicativeSeq),
    TE.map((results) => results.length * batchSize), // 简化计算
  );
};

// ============================================================================
// 完整迁移流程
// ============================================================================

/**
 * 执行完整的日志迁移流程
 * 
 * @returns TaskEither<AppError, MigrationResult>
 */
export interface MigrationResult {
  /** 迁移的条目数 */
  migratedCount: number;
  /** 迁移是否成功 */
  success: boolean;
  /** 错误消息（如果有） */
  errorMessage?: string;
}

export const executeLogMigrationFlow = (): TE.TaskEither<AppError, MigrationResult> =>
  pipe(
    // 1. 初始化 SQLite 日志数据库
    initLogDatabase(),
    TE.chain(() => 
      // 2. 检查是否需要迁移
      checkNeedsMigrationFlow()
    ),
    TE.chain((needsMigration) => {
      if (!needsMigration) {
        return TE.right({
          migratedCount: 0,
          success: true,
        });
      }

      // 3. 获取所有 IndexedDB 日志
      return pipe(
        getAllIndexedDBLogs(),
        TE.chain((logs) => {
          if (logs.length === 0) {
            return TE.right({
              migratedCount: 0,
              success: true,
            });
          }

          // 4. 批量迁移到 SQLite
          return pipe(
            migrateBatchToSQLite(logs),
            TE.map((migratedCount): MigrationResult => ({
              migratedCount,
              success: true,
            })),
          );
        }),
      );
    }),
    TE.mapLeft((error): MigrationResult => ({
      migratedCount: 0,
      success: false,
      errorMessage: error.message,
    })),
  );

// ============================================================================
// 清理 IndexedDB
// ============================================================================

/**
 * 清理 IndexedDB 中的日志数据
 * 
 * 注意：只有在迁移成功后才应该调用此函数
 * 
 * @returns TaskEither<AppError, void>
 */
export const cleanupIndexedDBLogsFlow = (): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      async () => {
        await logDB.logs.clear();
        console.log('✅ IndexedDB 日志数据已清理');
      },
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to cleanup IndexedDB logs: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 完整的迁移和清理流程
 * 
 * @returns TaskEither<AppError, MigrationResult>
 */
export const migrateAndCleanupFlow = (): TE.TaskEither<AppError, MigrationResult> =>
  pipe(
    executeLogMigrationFlow(),
    TE.chain((result) => {
      if (result.success && result.migratedCount > 0) {
        // 迁移成功，清理 IndexedDB
        return pipe(
          cleanupIndexedDBLogsFlow(),
          TE.map(() => result),
        );
      }
      return TE.right(result);
    }),
  );

// ============================================================================
// 迁移进度回调
// ============================================================================

export interface MigrationProgress {
  /** 当前步骤 */
  step: 'checking' | 'reading' | 'migrating' | 'cleaning' | 'completed';
  /** 进度百分比 (0-100) */
  progress: number;
  /** 当前步骤描述 */
  message: string;
  /** 已处理的条目数 */
  processedCount?: number;
  /** 总条目数 */
  totalCount?: number;
}

/**
 * 带进度回调的迁移流程
 * 
 * @param onProgress - 进度回调函数
 * @returns TaskEither<AppError, MigrationResult>
 */
export const migrateWithProgressFlow = (
  onProgress: (progress: MigrationProgress) => void,
): TE.TaskEither<AppError, MigrationResult> =>
  pipe(
    TE.fromIO(() => {
      onProgress({
        step: 'checking',
        progress: 10,
        message: '检查迁移需求...',
      });
    }),
    TE.chain(() => checkNeedsMigrationFlow()),
    TE.chain((needsMigration) => {
      if (!needsMigration) {
        onProgress({
          step: 'completed',
          progress: 100,
          message: '无需迁移',
        });
        return TE.right({
          migratedCount: 0,
          success: true,
        });
      }

      onProgress({
        step: 'reading',
        progress: 30,
        message: '读取 IndexedDB 日志...',
      });

      return pipe(
        getAllIndexedDBLogs(),
        TE.chain((logs) => {
          const totalCount = logs.length;
          
          onProgress({
            step: 'migrating',
            progress: 50,
            message: `迁移 ${totalCount} 条日志到 SQLite...`,
            totalCount,
            processedCount: 0,
          });

          return pipe(
            migrateBatchToSQLite(logs),
            TE.chain((migratedCount) => {
              onProgress({
                step: 'cleaning',
                progress: 80,
                message: '清理 IndexedDB...',
                totalCount,
                processedCount: migratedCount,
              });

              return pipe(
                cleanupIndexedDBLogsFlow(),
                TE.map(() => {
                  onProgress({
                    step: 'completed',
                    progress: 100,
                    message: `迁移完成，共处理 ${migratedCount} 条日志`,
                    totalCount,
                    processedCount: migratedCount,
                  });

                  return {
                    migratedCount,
                    success: true,
                  };
                }),
              );
            }),
          );
        }),
      );
    }),
  );