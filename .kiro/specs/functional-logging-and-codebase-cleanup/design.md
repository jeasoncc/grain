# 函数式日志系统重构与代码库清理 - 设计文档

## 概述

本设计文档描述了如何将当前的命令式日志系统重构为符合函数式编程原则的 IO 层实现，同时解决代码库中的结构性问题。

## 架构设计

### 新的日志系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    函数式日志系统架构                            │
└─────────────────────────────────────────────────────────────────┘

    应用层 (flows/, views/, hooks/)
         │
         ▼
    ┌─────────────────────────────────────┐
    │        io/log/logger.api.ts         │  ← 日志 API 接口
    │                                     │
    │  - logDebug: TaskEither             │
    │  - logInfo: TaskEither              │
    │  - logWarn: TaskEither              │
    │  - logError: TaskEither             │
    │  - logSuccess: TaskEither           │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │      pipes/log/log.format.pipe.ts   │  ← 日志格式化纯函数
    │                                     │
    │  - formatLogEntry                   │
    │  - addTimestamp                     │
    │  - addLogLevel                      │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │       io/log/log.storage.api.ts     │  ← 日志存储 API
    │                                     │
    │  - saveLogToSQLite: TaskEither      │
    │  - queryLogs: TaskEither            │
    │  - clearOldLogs: TaskEither         │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │         Rust 后端 SQLite            │  ← 数据持久化
    │                                     │
    │  - logs 表                          │
    │  - 索引和查询优化                    │
    └─────────────────────────────────────┘
```

### 组件设计

#### 1. 日志 API 接口 (`io/log/logger.api.ts`)

```typescript
// 日志级别枚举
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'trace';

// 日志条目接口
export interface LogEntry {
  readonly id?: string;
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly source?: string;
}

// 日志配置
export interface LogConfig {
  readonly enableConsole: boolean;
  readonly enableStorage: boolean;
  readonly minLevel: LogLevel;
  readonly maxEntries: number;
}

// 函数式日志 API
export const logDebug: (message: string, context?: Record<string, unknown>) => TE.TaskEither<AppError, void>;
export const logInfo: (message: string, context?: Record<string, unknown>) => TE.TaskEither<AppError, void>;
export const logWarn: (message: string, context?: Record<string, unknown>) => TE.TaskEither<AppError, void>;
export const logError: (message: string, context?: Record<string, unknown>) => TE.TaskEither<AppError, void>;
export const logSuccess: (message: string, context?: Record<string, unknown>) => TE.TaskEither<AppError, void>;

// 日志查询 API
export const queryLogs: (options: LogQueryOptions) => TE.TaskEither<AppError, LogEntry[]>;
export const clearLogs: (olderThan?: Date) => TE.TaskEither<AppError, number>;
```

#### 2. 日志格式化管道 (`pipes/log/log.format.pipe.ts`)

```typescript
// 纯函数：格式化日志条目
export const formatLogEntry = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  source?: string
): LogEntry => ({
  id: generateLogId(),
  timestamp: new Date().toISOString(),
  level,
  message,
  context,
  source,
});

// 纯函数：添加控制台颜色
export const addConsoleColors = (entry: LogEntry): string => {
  const colors = {
    debug: '\x1b[35m',    // 紫色
    info: '\x1b[36m',     // 青色
    warn: '\x1b[33m',     // 黄色
    error: '\x1b[31m',    // 红色
    success: '\x1b[32m',  // 绿色
    trace: '\x1b[37m',    // 白色
  };
  
  const reset = '\x1b[0m';
  const color = colors[entry.level];
  
  return `${color}[${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}${reset}`;
};

// 纯函数：过滤日志级别
export const filterByLevel = (entries: LogEntry[], minLevel: LogLevel): LogEntry[] => {
  const levelPriority = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    success: 2,
  };
  
  const minPriority = levelPriority[minLevel];
  return entries.filter(entry => levelPriority[entry.level] >= minPriority);
};
```

#### 3. 日志存储 API (`io/log/log.storage.api.ts`)

```typescript
// SQLite 日志存储
export const saveLogToSQLite = (entry: LogEntry): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      () => invoke<void>('save_log_entry', { entry }),
      (error) => ({ type: 'DB_ERROR', message: `Failed to save log: ${error}` } as AppError)
    )
  );

// 查询日志
export const queryLogsFromSQLite = (options: LogQueryOptions): TE.TaskEither<AppError, LogEntry[]> =>
  pipe(
    TE.tryCatch(
      () => invoke<LogEntry[]>('query_logs', { options }),
      (error) => ({ type: 'DB_ERROR', message: `Failed to query logs: ${error}` } as AppError)
    )
  );

// 清理旧日志
export const clearOldLogsFromSQLite = (olderThan: Date): TE.TaskEither<AppError, number> =>
  pipe(
    TE.tryCatch(
      () => invoke<number>('clear_old_logs', { olderThan: olderThan.toISOString() }),
      (error) => ({ type: 'DB_ERROR', message: `Failed to clear logs: ${error}` } as AppError)
    )
  );
```

#### 4. 日志流程 (`flows/log/log.flow.ts`)

```typescript
// 组合日志记录流程
export const createLogFlow = (config: LogConfig) => 
  (level: LogLevel, message: string, context?: Record<string, unknown>, source?: string): TE.TaskEither<AppError, void> =>
    pipe(
      // 1. 格式化日志条目
      TE.of(formatLogEntry(level, message, context, source)),
      
      // 2. 检查日志级别
      TE.chain((entry) =>
        shouldLog(entry.level, config.minLevel)
          ? TE.right(entry)
          : TE.right(null)
      ),
      
      // 3. 并行执行控制台输出和存储
      TE.chain((entry) =>
        entry
          ? pipe(
              // 控制台输出（如果启用）
              config.enableConsole
                ? TE.fromIO(() => console.log(addConsoleColors(entry)))
                : TE.right(undefined),
              
              // 存储到 SQLite（如果启用）
              TE.chain(() =>
                config.enableStorage
                  ? saveLogToSQLite(entry)
                  : TE.right(undefined)
              )
            )
          : TE.right(undefined)
      ),
      
      // 4. 忽略日志错误，不影响主业务流程
      TE.orElse((error) => {
        console.warn('Log operation failed:', error);
        return TE.right(undefined);
      })
    );
```

### 数据模型

#### SQLite 日志表结构

```sql
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT, -- JSON 字符串
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
```

#### Rust 后端数据结构

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: Option<String>,
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub context: Option<String>, // JSON 字符串
    pub source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogQueryOptions {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub level_filter: Option<Vec<String>>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub source_filter: Option<String>,
}
```

## 迁移策略

### 1. IndexedDB 到 SQLite 迁移

```typescript
// 迁移流程
export const migrateLogsFromIndexedDB = (): TE.TaskEither<AppError, MigrationResult> =>
  pipe(
    // 1. 检查是否存在 IndexedDB 日志
    checkIndexedDBLogs(),
    
    // 2. 读取所有 IndexedDB 日志
    TE.chain((hasLogs) =>
      hasLogs
        ? readAllIndexedDBLogs()
        : TE.right([])
    ),
    
    // 3. 批量写入 SQLite
    TE.chain((logs) =>
      logs.length > 0
        ? batchInsertLogsToSQLite(logs)
        : TE.right({ migrated: 0, skipped: 0 })
    ),
    
    // 4. 清理 IndexedDB（可选）
    TE.chain((result) =>
      pipe(
        cleanupIndexedDBLogs(),
        TE.map(() => result)
      )
    )
  );
```

### 2. 渐进式重构策略

1. **阶段 1**: 创建新的函数式日志 API，与旧系统并行运行
2. **阶段 2**: 逐步迁移现有代码使用新 API
3. **阶段 3**: 移除旧的日志系统和 IndexedDB 依赖
4. **阶段 4**: 优化性能和添加高级功能

## 错误处理

### 日志系统错误处理原则

1. **非阻塞**: 日志错误不应该影响主业务流程
2. **降级**: 当存储失败时，至少保证控制台输出
3. **恢复**: 提供自动重试和错误恢复机制

```typescript
// 错误处理示例
export const robustLog = (level: LogLevel, message: string): TE.TaskEither<never, void> =>
  pipe(
    createLogFlow(defaultConfig)(level, message),
    TE.orElse((error) => {
      // 降级到控制台输出
      console.warn(`Log storage failed: ${error.message}`);
      console.log(`[${level.toUpperCase()}] ${message}`);
      return TE.right(undefined);
    })
  );
```

## 测试策略

### 单元测试

- 测试所有纯函数（pipes/log/）
- 测试 TaskEither 组合逻辑
- 测试错误处理和降级机制

### 集成测试

- 测试 SQLite 存储和查询
- 测试 IndexedDB 迁移流程
- 测试性能和并发场景

### 属性测试

- 日志格式化的一致性
- 日志级别过滤的正确性
- 迁移过程的数据完整性

## 性能考虑

### 优化策略

1. **批量写入**: 收集多个日志条目后批量写入数据库
2. **异步处理**: 使用 TaskEither 确保非阻塞操作
3. **索引优化**: 在常用查询字段上创建索引
4. **自动清理**: 定期清理旧日志以控制存储大小

### 性能指标

- 单次日志记录: < 10ms
- 批量日志查询: < 100ms (1000 条记录)
- 内存使用: < 50MB (包含日志缓存)
- 存储增长: < 1MB/天 (正常使用)

## 向后兼容性

### API 兼容性

提供兼容层以支持现有代码的渐进式迁移：

```typescript
// 兼容层 - 逐步废弃
export const logger = {
  debug: (message: string) => logDebug(message)(),
  info: (message: string) => logInfo(message)(),
  warn: (message: string) => logWarn(message)(),
  error: (message: string) => logError(message)(),
  success: (message: string) => logSuccess(message)(),
};
```

### 数据兼容性

- 支持从 IndexedDB 迁移历史日志数据
- 保持日志条目的数据结构兼容性
- 提供数据导出和导入功能

## 部署计划

### 发布策略

1. **Beta 版本**: 新日志系统与旧系统并行运行
2. **RC 版本**: 默认使用新系统，保留旧系统作为后备
3. **正式版本**: 完全移除旧系统和 IndexedDB 依赖

### 回滚计划

- 保留旧日志系统代码直到新系统稳定
- 提供配置选项在新旧系统间切换
- 确保数据迁移的可逆性

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性反思

在编写正确性属性之前，我需要识别和消除冗余：

- 属性 1.1 和 1.4 都涉及日志记录行为，但 1.1 关注 TaskEither 模式，1.4 关注输出目标，它们提供不同的验证价值
- 属性 2.2 和 2.3 都涉及 SQLite 存储，但 2.2 关注存储行为，2.3 关注查询行为，它们互补
- 属性 6.2 和 6.3 涉及 TaskEither 的两个分支，它们是同一个属性的两面，可以合并
- 属性 7.1 和 7.3 都涉及性能，但关注不同方面（批量写入 vs 异步性），保持独立

### 核心正确性属性

**Property 1: 日志记录 TaskEither 一致性**
*对于任何* 日志级别和消息，日志记录函数应该返回 TaskEither 类型，成功时返回 Right(void)，失败时返回 Left(AppError)
**Validates: Requirements 1.1, 6.2, 6.3**

**Property 2: 日志错误隔离性**
*对于任何* 主业务流程，当日志记录失败时，主流程应该继续正常执行而不受影响
**Validates: Requirements 1.2, 6.5**

**Property 3: 双重输出一致性**
*对于任何* 有效的日志条目，记录后应该同时在控制台输出和 SQLite 存储中找到相应的日志数据
**Validates: Requirements 1.4, 2.2**

**Property 4: 日志级别区分性**
*对于任何* 日志级别（debug, info, warn, error, success），系统应该能够正确记录并在查询时区分不同级别的日志
**Validates: Requirements 1.5**

**Property 5: SQLite 查询一致性**
*对于任何* 存储在 SQLite 中的日志数据，查询操作应该能够准确检索并返回匹配的日志条目
**Validates: Requirements 2.3**

**Property 6: 批量写入优化**
*对于任何* 大量日志记录操作（>100 条），系统应该使用批量写入而不是单条写入来优化性能
**Validates: Requirements 7.1**

**Property 7: 分页查询正确性**
*对于任何* 日志查询请求，当指定分页参数时，返回的结果应该符合指定的偏移量和限制数量
**Validates: Requirements 7.2**

**Property 8: 异步非阻塞性**
*对于任何* 日志记录操作，执行时应该是异步的，不阻塞调用线程的其他操作
**Validates: Requirements 7.3**

**Property 9: 自动清理触发**
*对于任何* 达到存储限制的情况，系统应该自动清理最旧的日志条目以维持存储在配置的限制内
**Validates: Requirements 7.4**

**Property 10: 配置驱动行为**
*对于任何* 有效的日志配置，系统的日志行为（级别过滤、存储策略）应该严格遵循配置参数
**Validates: Requirements 7.5**

### 示例测试用例

以下是一些需要具体示例测试的场景：

**Example 1: 应用启动时 SQLite 表创建**
验证应用启动时正确创建日志表结构
**Validates: Requirements 2.1**

**Example 2: IndexedDB 到 SQLite 数据迁移**
验证完整的数据迁移流程能够正确转移历史日志数据
**Validates: Requirements 2.5**

**Example 3: 文件重命名后导入更新**
验证将 .action.ts 重命名为 .flow.ts 后，所有导入语句正确更新
**Validates: Requirements 3.3**

**Example 4: 重复目录删除后构建成功**
验证删除 flows/templated/templated/ 目录后，构建系统正常工作
**Validates: Requirements 4.2, 4.3**

**Example 5: 严格 TypeScript 检查通过**
验证启用 noUnusedLocals 和 noUnusedParameters 后，代码能够通过编译
**Validates: Requirements 5.3, 5.4**

**Example 6: 迁移向导用户交互**
验证检测到旧数据时，迁移向导正确显示并允许用户选择
**Validates: Requirements 8.1, 8.2, 8.4**

**Example 7: 迁移失败错误处理**
验证迁移失败时，原始数据保持完整并显示适当的错误信息
**Validates: Requirements 8.5**