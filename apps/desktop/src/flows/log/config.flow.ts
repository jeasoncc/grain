/**
 * @file config.flow.ts
 * @description 日志配置系统流程
 *
 * 实现日志级别配置和存储策略配置功能。
 * 提供配置的验证、持久化和应用功能。
 */

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type { LogLevel, LogConfig, LogConfigValidationResult } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";
import { logConfigError } from "@/types/error/error.types";
import { DEFAULT_LOG_CONFIG, LOG_LEVEL_PRIORITY } from "@/types/log/log.interface";

// Storage
import { getJson, setJson } from "@/io/storage/settings.storage";

// Zod for validation
import { z } from "zod";

// Auto-cleanup
import { 
  getAutoCleanupConfig, 
  updateAutoCleanupConfig,
  restartAutoCleanupTimer,
  type AutoCleanupConfig,
} from "./auto-cleanup.flow";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 扩展的日志配置（包含自动清理配置）
 */
export interface ExtendedLogConfig extends LogConfig {
  /** 自动清理配置 */
  readonly autoCleanup: AutoCleanupConfig;
}

/**
 * 日志配置预设
 */
export interface LogConfigPreset {
  /** 预设名称 */
  readonly name: string;
  /** 预设描述 */
  readonly description: string;
  /** 预设配置 */
  readonly config: Partial<ExtendedLogConfig>;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  readonly isValid: boolean;
  /** 错误信息 */
  readonly errors: readonly string[];
  /** 警告信息 */
  readonly warnings: readonly string[];
}

// ============================================================================
// 配置和常量
// ============================================================================

/**
 * 存储键
 */
const STORAGE_KEYS = {
  LOG_CONFIG: "grain-log-config",
  LOG_CONFIG_PRESETS: "grain-log-config-presets",
} as const;

/**
 * 默认扩展配置
 */
export const DEFAULT_EXTENDED_LOG_CONFIG: ExtendedLogConfig = {
  ...DEFAULT_LOG_CONFIG,
  autoCleanup: {
    enabled: true,
    maxEntries: 10000,
    maxDays: 30,
    maxStorageSize: 50 * 1024 * 1024, // 50MB
    checkInterval: 60 * 60 * 1000, // 1小时
    cleanupBatchSize: 1000,
  },
} as const;

/**
 * 内置配置预设
 */
export const BUILTIN_CONFIG_PRESETS: readonly LogConfigPreset[] = [
  {
    name: "development",
    description: "开发环境配置 - 详细日志，快速清理",
    config: {
      enableConsole: true,
      enableStorage: true,
      minLevel: "debug",
      maxEntries: 5000,
      batchSize: 10,
      batchDelay: 500,
      autoCleanup: {
        enabled: true,
        maxEntries: 5000,
        maxDays: 7,
        maxStorageSize: 10 * 1024 * 1024, // 10MB
        checkInterval: 30 * 60 * 1000, // 30分钟
        cleanupBatchSize: 500,
      },
    },
  },
  {
    name: "production",
    description: "生产环境配置 - 关键日志，长期保存",
    config: {
      enableConsole: false,
      enableStorage: true,
      minLevel: "warn",
      maxEntries: 50000,
      batchSize: 100,
      batchDelay: 2000,
      autoCleanup: {
        enabled: true,
        maxEntries: 50000,
        maxDays: 90,
        maxStorageSize: 200 * 1024 * 1024, // 200MB
        checkInterval: 4 * 60 * 60 * 1000, // 4小时
        cleanupBatchSize: 2000,
      },
    },
  },
  {
    name: "minimal",
    description: "最小配置 - 仅错误日志，快速清理",
    config: {
      enableConsole: true,
      enableStorage: true,
      minLevel: "error",
      maxEntries: 1000,
      batchSize: 5,
      batchDelay: 100,
      autoCleanup: {
        enabled: true,
        maxEntries: 1000,
        maxDays: 3,
        maxStorageSize: 1 * 1024 * 1024, // 1MB
        checkInterval: 15 * 60 * 1000, // 15分钟
        cleanupBatchSize: 100,
      },
    },
  },
  {
    name: "debug",
    description: "调试配置 - 所有日志，不自动清理",
    config: {
      enableConsole: true,
      enableStorage: true,
      minLevel: "trace",
      maxEntries: 100000,
      batchSize: 1,
      batchDelay: 0,
      autoCleanup: {
        enabled: false,
        maxEntries: 100000,
        maxDays: 365,
        maxStorageSize: 1024 * 1024 * 1024, // 1GB
        checkInterval: 24 * 60 * 60 * 1000, // 24小时
        cleanupBatchSize: 5000,
      },
    },
  },
] as const;

/**
 * Zod Schema 用于配置验证
 */
const LogLevelSchema = z.enum(["trace", "debug", "info", "success", "warn", "error"]);

const LogConfigSchema = z.object({
  enableConsole: z.boolean(),
  enableStorage: z.boolean(),
  minLevel: LogLevelSchema,
  maxEntries: z.number().min(100).max(1000000),
  batchSize: z.number().min(1).max(1000),
  batchDelay: z.number().min(0).max(10000),
});

const AutoCleanupConfigSchema = z.object({
  enabled: z.boolean(),
  maxEntries: z.number().min(100).max(1000000),
  maxDays: z.number().min(1).max(365),
  maxStorageSize: z.number().min(1024 * 1024).max(10 * 1024 * 1024 * 1024), // 1MB - 10GB
  checkInterval: z.number().min(60 * 1000).max(24 * 60 * 60 * 1000), // 1分钟 - 24小时
  cleanupBatchSize: z.number().min(10).max(10000),
});

const ExtendedLogConfigSchema = LogConfigSchema.extend({
  autoCleanup: AutoCleanupConfigSchema,
});

// ============================================================================
// 配置管理
// ============================================================================

/**
 * 获取当前日志配置
 * 
 * @returns 当前日志配置
 */
export const getCurrentLogConfig = (): ExtendedLogConfig =>
  getJson(
    STORAGE_KEYS.LOG_CONFIG,
    ExtendedLogConfigSchema,
    DEFAULT_EXTENDED_LOG_CONFIG,
  );

/**
 * 验证日志配置
 * 
 * @param config - 要验证的配置
 * @returns TaskEither<AppError, LogConfigValidationResult>
 */
export const validateLogConfigFlow = (
  config: Partial<ExtendedLogConfig>,
): TE.TaskEither<AppError, LogConfigValidationResult> => {
  return TE.tryCatch(
    async () => {
      let errors: readonly string[] = [];
      let warnings: readonly string[] = [];

      // 使用 Zod 进行基础验证
      const mergedConfig = { ...DEFAULT_EXTENDED_LOG_CONFIG, ...config };
      const validation = ExtendedLogConfigSchema.safeParse(mergedConfig);

      if (!validation.success) {
        errors = [
          ...errors,
          ...validation.error.issues.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ),
        ];
      }

      // 自定义验证规则
      if (config.batchSize && config.batchDelay !== undefined) {
        if (config.batchSize > 1 && config.batchDelay === 0) {
          warnings = [...warnings, "批量大小 > 1 但延迟为 0，将使用异步队列模式"];
        }
      }

      if (config.maxEntries && config.autoCleanup?.maxEntries) {
        if (config.autoCleanup.maxEntries > config.maxEntries) {
          warnings = [...warnings, "自动清理的最大条目数大于日志配置的最大条目数"];
        }
      }

      if (config.minLevel) {
        const levelPriority = LOG_LEVEL_PRIORITY[config.minLevel];
        if (levelPriority >= LOG_LEVEL_PRIORITY.warn) {
          warnings = [...warnings, `最小日志级别设置为 ${config.minLevel}，可能会丢失重要的调试信息`];
        }
      }

      if (config.autoCleanup?.enabled === false && config.maxEntries) {
        if (config.maxEntries > 50000) {
          warnings = [...warnings, "禁用自动清理且最大条目数较大，可能导致存储空间不足"];
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },
    (error) => logConfigError(`Configuration validation failed: ${String(error)}`)
  );
};

/**
 * 更新日志配置
 * 
 * @param config - 新的配置（部分更新）
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const updateLogConfig = (
  config: Partial<ExtendedLogConfig>,
): TE.TaskEither<AppError, ExtendedLogConfig> => {
  return pipe(
    validateLogConfigFlow(config),
    TE.chain((validation) => {
      if (!validation.isValid) {
        return TE.left(logConfigError(
          `Invalid log configuration: ${validation.errors.join(", ")}`
        ));
      }

      const currentConfig = getCurrentLogConfig();
      const newConfig = { ...currentConfig, ...config };

      // 保存配置
      const success = setJson(STORAGE_KEYS.LOG_CONFIG, newConfig);
      if (!success) {
        return TE.left(logConfigError(
          "Failed to save log configuration"
        ));
      }

      // 如果自动清理配置有变化，更新自动清理系统
      if (config.autoCleanup) {
        return pipe(
          updateAutoCleanupConfig(config.autoCleanup),
          TE.mapLeft((error) => logConfigError(
            `Failed to update auto cleanup config: ${error.message}`
          )),
          TE.map(() => {
            restartAutoCleanupTimer(newConfig.autoCleanup);
            return newConfig;
          }),
        );
      }

      return TE.right(newConfig);
    })
  );
};

/**
 * 重置配置为默认值
 * 
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const resetLogConfig = (): TE.TaskEither<AppError, ExtendedLogConfig> =>
  updateLogConfig(DEFAULT_EXTENDED_LOG_CONFIG);

// ============================================================================
// 配置预设管理
// ============================================================================

/**
 * 获取所有配置预设
 * 
 * @returns 配置预设列表
 */
export const getLogConfigPresets = (): readonly LogConfigPreset[] => {
  const customPresets = getJson(
    STORAGE_KEYS.LOG_CONFIG_PRESETS,
    z.array(z.object({
      name: z.string(),
      description: z.string(),
      config: z.record(z.string(), z.unknown()),
    })),
    [],
  );

  return [...BUILTIN_CONFIG_PRESETS, ...customPresets];
};

/**
 * 应用配置预设
 * 
 * @param presetName - 预设名称
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const applyLogConfigPreset = (
  presetName: string,
): TE.TaskEither<AppError, ExtendedLogConfig> => {
  const presets = getLogConfigPresets();
  const preset = presets.find(p => p.name === presetName);

  if (!preset) {
    return TE.left(logConfigError(
      `Configuration preset '${presetName}' not found`
    ));
  }

  return updateLogConfig(preset.config as Partial<ExtendedLogConfig>);
};

/**
 * 保存自定义配置预设
 * 
 * @param preset - 配置预设
 * @returns TaskEither<AppError, void>
 */
export const saveLogConfigPreset = (
  preset: LogConfigPreset,
): TE.TaskEither<AppError, void> => {
  return pipe(
    validateLogConfigFlow(preset.config as Partial<ExtendedLogConfig>),
    TE.chain((validation) => {
      if (!validation.isValid) {
        return TE.left(logConfigError(
          `Invalid preset configuration: ${validation.errors.join(", ")}`
        ));
      }

      // 检查是否与内置预设重名
      const builtinNames = BUILTIN_CONFIG_PRESETS.map(p => p.name);
      if (builtinNames.includes(preset.name)) {
        return TE.left(logConfigError(
          `Cannot override builtin preset '${preset.name}'`
        ));
      }

      let customPresets = getJson(
        STORAGE_KEYS.LOG_CONFIG_PRESETS,
        z.array(z.object({
          name: z.string(),
          description: z.string(),
          config: z.record(z.string(), z.unknown()),
        })),
        [] as ReadonlyArray<{ name: string; description: string; config: Record<string, unknown> }>,
      );

      // 更新或添加预设（不可变方式）
      const existingIndex = customPresets.findIndex(p => p.name === preset.name);
      if (existingIndex >= 0) {
        customPresets = [
          ...customPresets.slice(0, existingIndex),
          preset,
          ...customPresets.slice(existingIndex + 1),
        ];
      } else {
        customPresets = [...customPresets, preset];
      }

      const success = setJson(STORAGE_KEYS.LOG_CONFIG_PRESETS, customPresets);
      if (!success) {
        return TE.left(logConfigError(
          "Failed to save configuration preset"
        ));
      }

      return TE.right(undefined);
    })
  );
};

/**
 * 删除自定义配置预设
 * 
 * @param presetName - 预设名称
 * @returns TaskEither<AppError, void>
 */
export const deleteLogConfigPreset = (
  presetName: string,
): TE.TaskEither<AppError, void> => {
  // 检查是否为内置预设
  const builtinNames = BUILTIN_CONFIG_PRESETS.map(p => p.name);
  if (builtinNames.includes(presetName)) {
    return TE.left(logConfigError(
      `Cannot delete builtin preset '${presetName}'`
    ));
  }

  const customPresets = getJson(
    STORAGE_KEYS.LOG_CONFIG_PRESETS,
    z.array(z.object({
      name: z.string(),
      description: z.string(),
      config: z.record(z.string(), z.unknown()),
    })),
    [],
  );

  const filteredPresets = customPresets.filter(p => p.name !== presetName);
  
  if (filteredPresets.length === customPresets.length) {
    return TE.left(logConfigError(
      `Configuration preset '${presetName}' not found`
    ));
  }

  const success = setJson(STORAGE_KEYS.LOG_CONFIG_PRESETS, filteredPresets);
  if (!success) {
    return TE.left(logConfigError(
      "Failed to delete configuration preset"
    ));
  }

  return TE.right(undefined);
};

// ============================================================================
// 配置导入导出
// ============================================================================

/**
 * 导出当前配置
 * 
 * @returns 配置的 JSON 字符串
 */
export const exportLogConfig = (): string => {
  const config = getCurrentLogConfig();
  return JSON.stringify(config, null, 2);
};

/**
 * 从 JSON 字符串导入配置
 * 
 * @param configJson - 配置的 JSON 字符串
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const importLogConfig = (
  configJson: string,
): TE.TaskEither<AppError, ExtendedLogConfig> => {
  try {
    const config = JSON.parse(configJson) as Partial<ExtendedLogConfig>;
    return updateLogConfig(config);
  } catch (error) {
    return TE.left(logConfigError(
      `Invalid configuration JSON: ${String(error)}`
    ));
  }
};

// ============================================================================
// 配置监听和通知
// ============================================================================

type ConfigChangeListener = (config: ExtendedLogConfig) => void;
const configChangeListeners: ConfigChangeListener[] = [];

/**
 * 添加配置变化监听器
 * 
 * @param listener - 监听器函数
 * @returns 取消监听的函数
 */
export const addConfigChangeListener = (
  listener: ConfigChangeListener,
): (() => void) => {
  configChangeListeners.push(listener);
  
  return () => {
    const index = configChangeListeners.indexOf(listener);
    if (index >= 0) {
      configChangeListeners.splice(index, 1);
    }
  };
};

// 重写 updateLogConfig 以包含通知
const originalUpdateLogConfig = updateLogConfig;
export { originalUpdateLogConfig as updateLogConfigInternal };

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速设置日志级别
 * 
 * @param level - 新的日志级别
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const setLogLevel = (level: LogLevel): TE.TaskEither<AppError, ExtendedLogConfig> =>
  updateLogConfig({ minLevel: level });

/**
 * 切换控制台输出
 * 
 * @param enabled - 是否启用控制台输出
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const toggleConsoleOutput = (enabled: boolean): TE.TaskEither<AppError, ExtendedLogConfig> =>
  updateLogConfig({ enableConsole: enabled });

/**
 * 切换存储
 * 
 * @param enabled - 是否启用存储
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const toggleStorage = (enabled: boolean): TE.TaskEither<AppError, ExtendedLogConfig> =>
  updateLogConfig({ enableStorage: enabled });

/**
 * 设置批量配置
 * 
 * @param batchSize - 批量大小
 * @param batchDelay - 批量延迟
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const setBatchConfig = (
  batchSize: number,
  batchDelay: number,
): TE.TaskEither<AppError, ExtendedLogConfig> =>
  updateLogConfig({ batchSize, batchDelay });

/**
 * 切换自动清理
 * 
 * @param enabled - 是否启用自动清理
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const toggleAutoCleanup = (enabled: boolean): TE.TaskEither<AppError, ExtendedLogConfig> =>
  updateLogConfig({
    autoCleanup: {
      ...getAutoCleanupConfig(),
      enabled,
    },
  });