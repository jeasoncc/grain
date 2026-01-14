/**
 * @file auto-cleanup.flow.ts
 * @description 自动日志清理流程
 *
 * 实现日志存储大小监控和自动清理功能。
 * 根据配置的存储策略自动清理旧日志条目。
 */

/// <reference types="node" />

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import dayjs from "dayjs";
import type { AppError } from "@/types/error/error.types";

// IO
import {
  getLogStatsFromSQLite,
  clearOldLogsFromSQLite,
} from "@/io/log/log.storage.api";
import { info, warn, error } from "@/io/log/logger.api";

// Storage
import { getJson, setJson } from "@/io/storage/settings.storage";

// Zod for validation
import { z } from "zod";
import dayjs from "dayjs";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 自动清理配置
 */
export interface AutoCleanupConfig {
  /** 是否启用自动清理 */
  readonly enabled: boolean;
  /** 最大存储条目数 */
  readonly maxEntries: number;
  /** 最大存储天数 */
  readonly maxDays: number;
  /** 最大存储大小（字节） */
  readonly maxStorageSize: number;
  /** 清理检查间隔（毫秒） */
  readonly checkInterval: number;
  /** 每次清理的批次大小 */
  readonly cleanupBatchSize: number;
}

/**
 * 清理统计信息
 */
export interface CleanupStats {
  /** 清理的条目数 */
  readonly entriesRemoved: number;
  /** 释放的存储空间（字节） */
  readonly spaceFreed: number;
  /** 清理前的总条目数 */
  readonly totalEntriesBefore: number;
  /** 清理后的总条目数 */
  readonly totalEntriesAfter: number;
  /** 清理时间 */
  readonly cleanupTime: string;
}

/**
 * 清理历史记录
 */
export interface CleanupHistory {
  /** 最后清理时间 */
  readonly lastCleanup?: string;
  /** 清理统计历史 */
  readonly history: readonly CleanupStats[];
  /** 总清理次数 */
  readonly totalCleanups: number;
}

// ============================================================================
// 配置和常量
// ============================================================================

/**
 * 默认自动清理配置
 */
export const DEFAULT_AUTO_CLEANUP_CONFIG: AutoCleanupConfig = {
  enabled: true,
  maxEntries: 10000,
  maxDays: 30,
  maxStorageSize: 50 * 1024 * 1024, // 50MB
  checkInterval: 60 * 60 * 1000, // 1小时
  cleanupBatchSize: 1000,
} as const;

/**
 * 存储键
 */
const STORAGE_KEYS = {
  AUTO_CLEANUP_CONFIG: "grain-log-auto-cleanup-config",
  CLEANUP_HISTORY: "grain-log-cleanup-history",
} as const;

/**
 * Zod Schema 用于配置验证
 */
const AutoCleanupConfigSchema = z.object({
  enabled: z.boolean(),
  maxEntries: z.number().min(100).max(100000),
  maxDays: z.number().min(1).max(365),
  maxStorageSize: z.number().min(1024 * 1024).max(1024 * 1024 * 1024), // 1MB - 1GB
  checkInterval: z.number().min(60 * 1000).max(24 * 60 * 60 * 1000), // 1分钟 - 24小时
  cleanupBatchSize: z.number().min(100).max(10000),
});

const CleanupHistorySchema = z.object({
  lastCleanup: z.string().optional(),
  history: z.array(z.object({
    entriesRemoved: z.number(),
    spaceFreed: z.number(),
    totalEntriesBefore: z.number(),
    totalEntriesAfter: z.number(),
    cleanupTime: z.string(),
  })),
  totalCleanups: z.number(),
});

// ============================================================================
// 配置管理
// ============================================================================

/**
 * 获取自动清理配置
 * 
 * @returns 自动清理配置
 */
export const getAutoCleanupConfig = (): AutoCleanupConfig =>
  getJson(
    STORAGE_KEYS.AUTO_CLEANUP_CONFIG,
    AutoCleanupConfigSchema,
    DEFAULT_AUTO_CLEANUP_CONFIG,
  );

/**
 * 更新自动清理配置
 * 
 * @param config - 新的配置（部分更新）
 * @returns TaskEither<AppError, AutoCleanupConfig>
 */
export const updateAutoCleanupConfig = (
  config: Partial<AutoCleanupConfig>,
): TE.TaskEither<AppError, AutoCleanupConfig> => {
  const currentConfig = getAutoCleanupConfig();
  const newConfig = { ...currentConfig, ...config };

  const validation = AutoCleanupConfigSchema.safeParse(newConfig);
  if (!validation.success) {
    return TE.left({
      type: "LOG_CONFIG_ERROR",
      message: `Invalid auto-cleanup configuration: ${validation.error.message}`,
    });
  }

  const success = setJson(STORAGE_KEYS.AUTO_CLEANUP_CONFIG, newConfig);
  if (!success) {
    return TE.left({
      type: "LOG_CONFIG_ERROR",
      message: "Failed to save auto-cleanup configuration",
    });
  }

  return TE.right(newConfig);
};

/**
 * 获取清理历史记录
 * 
 * @returns 清理历史记录
 */
export const getCleanupHistory = (): CleanupHistory =>
  getJson(
    STORAGE_KEYS.CLEANUP_HISTORY,
    CleanupHistorySchema,
    { history: [], totalCleanups: 0 },
  );

/**
 * 记录清理统计
 * 
 * @param stats - 清理统计信息
 * @returns 是否成功
 */
const recordCleanupStats = (stats: CleanupStats): boolean => {
  const history = getCleanupHistory();
  const newHistory: CleanupHistory = {
    lastCleanup: stats.cleanupTime,
    history: [...history.history.slice(-9), stats], // 保留最近10次记录
    totalCleanups: history.totalCleanups + 1,
  };

  return setJson(STORAGE_KEYS.CLEANUP_HISTORY, newHistory);
};

// ============================================================================
// 存储监控
// ============================================================================

/**
 * 检查是否需要清理
 * 
 * @param config - 自动清理配置
 * @returns TaskEither<AppError, boolean>
 */
export const checkNeedsCleanup = (
  config: AutoCleanupConfig = getAutoCleanupConfig(),
): TE.TaskEither<AppError, boolean> => {
  if (!config.enabled) {
    return TE.right(false);
  }

  return pipe(
    getLogStatsFromSQLite(),
    TE.map((stats) => {
      // 检查条目数是否超限
      if (stats.totalEntries > config.maxEntries) {
        return true;
      }

      // 检查存储大小是否超限
      if (stats.storageSize > config.maxStorageSize) {
        return true;
      }

      // 检查是否有超过最大天数的日志
      if (stats.earliestEntry) {
        const earliestDate = dayjs(stats.earliestEntry);
        const cutoffDate = dayjs().subtract(config.maxDays, 'day');
        
        if (earliestDate.isBefore(cutoffDate)) {
          return true;
        }
      }

      return false;
    }),
  );
};

/**
 * 获取存储监控信息
 * 
 * @param config - 自动清理配置
 * @returns TaskEither<AppError, StorageMonitorInfo>
 */
export interface StorageMonitorInfo {
  readonly currentEntries: number;
  readonly maxEntries: number;
  readonly currentSize: number;
  readonly maxSize: number;
  readonly oldestEntry?: string;
  readonly maxDays: number;
  readonly needsCleanup: boolean;
  readonly utilizationPercent: number;
}

export const getStorageMonitorInfo = (
  config: AutoCleanupConfig = getAutoCleanupConfig(),
): TE.TaskEither<AppError, StorageMonitorInfo> =>
  pipe(
    getLogStatsFromSQLite(),
    TE.chain((stats) =>
      pipe(
        checkNeedsCleanup(config),
        TE.map((needsCleanup) => ({
          currentEntries: stats.totalEntries,
          maxEntries: config.maxEntries,
          currentSize: stats.storageSize,
          maxSize: config.maxStorageSize,
          oldestEntry: stats.earliestEntry,
          maxDays: config.maxDays,
          needsCleanup,
          utilizationPercent: Math.round((stats.totalEntries / config.maxEntries) * 100),
        })),
      ),
    ),
  );

// ============================================================================
// 自动清理执行
// ============================================================================

/**
 * 执行自动清理
 * 
 * @param config - 自动清理配置
 * @returns TaskEither<AppError, CleanupStats>
 */
export const executeAutoCleanup = (
  config: AutoCleanupConfig = getAutoCleanupConfig(),
): TE.TaskEither<AppError, CleanupStats> => {
  if (!config.enabled) {
    return TE.left({
      type: "LOG_CONFIG_ERROR",
      message: "Auto-cleanup is disabled",
    });
  }

  return pipe(
    // 获取清理前的统计信息
    getLogStatsFromSQLite(),
    TE.chain((statsBefore) => {
      const cleanupTime = dayjs().toISOString();
      
      // 计算清理截止日期
      const cutoffDate = dayjs().subtract(config.maxDays, 'day');
      
      return pipe(
        // 执行清理
        clearOldLogsFromSQLite(cutoffDate.toISOString()),
        TE.chain((entriesRemoved) =>
          pipe(
            // 获取清理后的统计信息
            getLogStatsFromSQLite(),
            TE.map((statsAfter) => {
              const spaceFreed = statsBefore.storageSize - statsAfter.storageSize;
              
              const cleanupStats: CleanupStats = {
                entriesRemoved,
                spaceFreed,
                totalEntriesBefore: statsBefore.totalEntries,
                totalEntriesAfter: statsAfter.totalEntries,
                cleanupTime,
              };

              // 记录清理统计
              recordCleanupStats(cleanupStats);

              return cleanupStats;
            }),
          ),
        ),
      );
    }),
  );
};

/**
 * 强制清理指定数量的旧日志
 * 
 * @param targetEntries - 目标保留条目数
 * @returns TaskEither<AppError, CleanupStats>
 */
export const forceCleanupToTarget = (
  targetEntries: number,
): TE.TaskEither<AppError, CleanupStats> =>
  pipe(
    getLogStatsFromSQLite(),
    TE.chain((stats) => {
      if (stats.totalEntries <= targetEntries) {
        return TE.left({
          type: "LOG_CONFIG_ERROR",
          message: `Current entries (${stats.totalEntries}) already below target (${targetEntries})`,
        });
      }

      // 计算需要删除的条目数
      const entriesToRemove = stats.totalEntries - targetEntries;
      
      // 计算截止日期（保留最新的 targetEntries 条目）
      const daysToSubtract = Math.ceil(entriesToRemove / 1000); // 粗略估算

      return executeAutoCleanup({
        ...getAutoCleanupConfig(),
        maxEntries: targetEntries,
        maxDays: daysToSubtract,
      });
    }),
  );

// ============================================================================
// 定时清理管理
// ============================================================================

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * 启动自动清理定时器
 * 
 * @param config - 自动清理配置
 * @returns void
 */
export const startAutoCleanupTimer = (
  config: AutoCleanupConfig = getAutoCleanupConfig(),
): void => {
  // 停止现有定时器
  stopAutoCleanupTimer();

  if (!config.enabled) {
    return;
  }

  cleanupTimer = setInterval(() => {
    checkNeedsCleanup(config)()
      .then((result) => {
        if (result._tag === "Right" && result.right) {
          // 需要清理，执行自动清理
          executeAutoCleanup(config)()
            .then((cleanupResult) => {
              if (cleanupResult._tag === "Right") {
                info("[AutoCleanup] Cleanup completed", { entriesRemoved: cleanupResult.right.entriesRemoved });
              } else {
                warn("[AutoCleanup] Cleanup failed", { error: cleanupResult.left });
              }
            });
        }
      })
      .catch((err) => {
        error("[AutoCleanup] Timer error", { error: err });
      });
  }, config.checkInterval);

  info("[AutoCleanup] Timer started", { intervalMs: config.checkInterval });
};

/**
 * 停止自动清理定时器
 * 
 * @returns void
 */
export const stopAutoCleanupTimer = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    info("[AutoCleanup] Timer stopped");
  }
};

/**
 * 重启自动清理定时器
 * 
 * @param config - 新的配置
 * @returns void
 */
export const restartAutoCleanupTimer = (
  config: AutoCleanupConfig = getAutoCleanupConfig(),
): void => {
  stopAutoCleanupTimer();
  startAutoCleanupTimer(config);
};

// ============================================================================
// 导出便捷函数
// ============================================================================

/**
 * 初始化自动清理系统
 * 
 * @param config - 可选的配置覆盖
 * @returns TaskEither<AppError, void>
 */
export const initAutoCleanup = (
  config?: Partial<AutoCleanupConfig>,
): TE.TaskEither<AppError, void> =>
  pipe(
    config ? updateAutoCleanupConfig(config) : TE.right(getAutoCleanupConfig()),
    TE.map((finalConfig) => {
      startAutoCleanupTimer(finalConfig);
    }),
  );

/**
 * 关闭自动清理系统
 * 
 * @returns void
 */
export const shutdownAutoCleanup = (): void => {
  stopAutoCleanupTimer();
};