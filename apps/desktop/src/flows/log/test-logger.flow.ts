/**
 * @file test-logger.flow.ts
 * @description 测试新的函数式日志系统
 *
 * 提供简单的测试函数来验证日志系统是否正常工作
 */

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type { AppError } from "@/types/error/error.types";

// 新的日志 API
import { logDebug, logInfo, logSuccess, logWarn, logError, logTrace, queryLogs, autoCleanupLogs } from "@/io/log/logger.api";

// 初始化和迁移
import { initLogDatabase } from "@/io/log/log.storage.api";
// Migration removed - no longer needed since system hasn't been published

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试所有日志级别
 * 
 * @returns TaskEither<AppError, void>
 */
export const testAllLogLevelsFlow = (): TE.TaskEither<AppError, void> =>
  pipe(
    logTrace("这是一条跟踪日志", { test: true }, "test-logger"),
    TE.chain(() => logDebug("这是一条调试日志", { test: true }, "test-logger")),
    TE.chain(() => logInfo("这是一条信息日志", { test: true }, "test-logger")),
    TE.chain(() => logSuccess("这是一条成功日志", { test: true }, "test-logger")),
    TE.chain(() => logWarn("这是一条警告日志", { test: true }, "test-logger")),
    TE.chain(() => logError("这是一条错误日志", { test: true }, "test-logger")),
  );

/**
 * 测试日志查询
 * 
 * @returns TaskEither<AppError, number> 返回查询到的日志数量
 */
export const testLogQueryFlow = (): TE.TaskEither<AppError, number> =>
  pipe(
    queryLogs({
      limit: 10,
      sourceFilter: "test-logger",
    }),
    TE.map((result) => {
      console.log(`查询到 ${result.entries.length} 条测试日志`);
      for (const entry of result.entries) {
        console.log(`- [${entry.level}] ${entry.message}`);
      }
      return result.entries.length;
    }),
  );

/**
 * 完整的日志系统测试流程
 * 
 * @returns TaskEither<AppError, TestResult>
 */
export interface TestResult {
  /** 初始化是否成功 */
  readonly initSuccess: boolean;
  /** 迁移结果 */
  readonly migrationCount: number;
  /** 日志记录是否成功 */
  readonly loggingSuccess: boolean;
  /** 查询到的日志数量 */
  readonly queryCount: number;
  /** 测试是否全部通过 */
  readonly allTestsPassed: boolean;
}

export const runCompleteLogSystemTestFlow = (): TE.TaskEither<AppError, TestResult> =>
  pipe(
    // 1. 初始化数据库
    initLogDatabase(),
    TE.chain(() => {
      console.log("✅ 日志数据库初始化成功");
      return TE.right({ initSuccess: true, migrationCount: 0 });
    }),
    TE.chain(({ initSuccess, migrationCount }) => {
      console.log("ℹ️ 跳过迁移 - 系统尚未发布");
      return TE.right({ initSuccess, migrationCount });
    }),
    TE.chain(({ initSuccess, migrationCount }) =>
      // 3. 测试日志记录
      pipe(
        testAllLogLevelsFlow(),
        TE.map(() => {
          console.log("✅ 所有级别日志记录成功");
          return { initSuccess, migrationCount, loggingSuccess: true };
        }),
      )
    ),
    TE.chain(({ initSuccess, migrationCount, loggingSuccess }) =>
      // 4. 测试日志查询
      pipe(
        testLogQueryFlow(),
        TE.map((queryCount) => {
          console.log(`✅ 日志查询成功，找到 ${queryCount} 条日志`);
          
          const allTestsPassed = initSuccess && loggingSuccess && queryCount > 0;
          
          return {
            initSuccess,
            migrationCount,
            loggingSuccess,
            queryCount,
            allTestsPassed,
          };
        }),
      )
    ),
  );

// ============================================================================
// 便捷测试函数
// ============================================================================

/**
 * 快速测试日志系统（异步执行，不等待结果）
 */
export const quickTestLogSystem = (): void => {
  console.log("🚀 开始测试函数式日志系统...");
  
  runCompleteLogSystemTestFlow()()
    .then((result) => {
      if (result._tag === 'Right') {
        const testResult = result.right;
        console.log("📊 测试结果:", testResult);
        
        if (testResult.allTestsPassed) {
          console.log("🎉 所有测试通过！函数式日志系统工作正常");
        } else {
          console.log("⚠️ 部分测试失败，请检查日志系统配置");
        }
      } else {
        console.error("❌ 测试失败:", result.left);
      }
    })
    .catch((error) => {
      console.error("💥 测试过程中发生异常:", error);
    });
};

/**
 * 测试日志性能（批量写入）
 * 
 * @param count - 要写入的日志数量
 * @returns TaskEither<AppError, number> 返回写入耗时（毫秒）
 */
export const testLogPerformanceFlow = (count = 100): TE.TaskEither<AppError, number> => {
  const startTime = Date.now();
  
  // 创建测试日志数组
  const testLogs = Array.from({ length: count }, (_, i) =>
    logInfo(`性能测试日志 ${i + 1}`, { index: i, timestamp: Date.now() }, "performance-test")
  );

  return pipe(
    // 并发执行所有日志写入
    TE.sequenceArray(testLogs),
    TE.map(() => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`📈 性能测试完成：写入 ${count} 条日志耗时 ${duration}ms`);
      return duration;
    }),
  );
};