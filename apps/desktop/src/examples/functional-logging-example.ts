/**
 * @file functional-logging-example.ts
 * @description 函数式日志系统使用示例
 *
 * 展示如何使用新的函数式日志系统替代旧的命令式日志
 */

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// 新的函数式日志 API
import {
  logInfo,
  logError,
  logSuccess,
  logWarn,
  debug,
  info,
  success,
  warn,
  error,
  queryLogs,
} from "@/io/log/logger.api";

// 测试和迁移
import { quickTestLogSystem } from "@/flows/log/test-logger.flow";
// Migration removed - no longer needed since system hasn't been published

// ============================================================================
// 基本使用示例
// ============================================================================

/**
 * 示例 1: 基本日志记录（异步版本）
 */
export const basicLoggingExample = async () => {
  info("=== 基本日志记录示例 ===");

  // 使用 TaskEither 进行错误处理的异步日志
  const result = await pipe(
    logInfo("应用启动", { version: "1.0.0" }, "app"),
    TE.chain(() => logSuccess("数据库连接成功", { host: "localhost" }, "database")),
    TE.chain(() => logWarn("配置文件缺失，使用默认配置", {}, "config")),
    TE.chain(() => logError("网络连接失败", { error: "timeout" }, "network")),
  )();

  if (result._tag === 'Right') {
    info("✅ 所有日志记录成功");
  } else {
    error("❌ 日志记录失败", { error: result.left });
  }
};

/**
 * 示例 2: 便捷的同步日志记录（Fire-and-forget）
 */
export const convenientLoggingExample = () => {
  info("=== 便捷日志记录示例 ===");

  // 不需要等待结果的同步日志记录
  debug("调试信息：用户点击了按钮", { buttonId: "submit" }, "ui");
  info("用户登录", { userId: 123, username: "alice" }, "auth");
  success("文件保存成功", { filename: "document.txt" }, "file");
  warn("磁盘空间不足", { available: "100MB" }, "system");
  error("API 调用失败", { endpoint: "/api/users", status: 500 }, "api");

  info("📝 同步日志已发送（不等待结果）");
};

/**
 * 示例 3: 日志查询
 */
export const logQueryExample = async () => {
  info("=== 日志查询示例 ===");

  const result = await queryLogs({
    limit: 5,
    levelFilter: ['error', 'warn'],
    sourceFilter: 'api',
  })();

  if (result._tag === 'Right') {
    const logs = result.right;
    info(`找到 ${logs.entries.length} 条日志`);
    logs.entries.forEach(log => {
      info(`  [${log.level}] ${log.message} (${log.source})`);
    });
  } else {
    error("查询失败", { error: result.left });
  }
};

// ============================================================================
// 业务场景示例
// ============================================================================

/**
 * 示例 4: 在业务流程中使用日志
 */
export const businessFlowWithLoggingExample = async () => {
  info("=== 业务流程日志示例 ===");

  // 模拟一个用户注册流程
  const registerUser = (userData: { readonly email: string; readonly username: string }) =>
    pipe(
      logInfo("开始用户注册流程", userData, "user-registration"),
      TE.chain(() => {
        // 模拟验证邮箱
        if (!userData.email.includes('@')) {
          error("邮箱格式无效", { email: userData.email }, "validation");
          return TE.left({ type: "VALIDATION_ERROR" as const, message: "Invalid email" });
        }
        return logInfo("邮箱验证通过", { email: userData.email }, "validation");
      }),
      TE.chain(() => 
        // 模拟保存到数据库
        logInfo("保存用户到数据库", { username: userData.username }, "database")
      ),
      TE.chain(() => 
        // 模拟发送欢迎邮件
        logInfo("发送欢迎邮件", { email: userData.email }, "email")
      ),
      TE.chain(() => logSuccess("用户注册完成", userData, "user-registration")),
    );

  // 执行注册流程
  const result = await registerUser({
    email: "user@example.com",
    username: "newuser"
  })();

  if (result._tag === 'Right') {
    info("✅ 用户注册成功");
  } else {
    error("❌ 用户注册失败", { error: result.left });
  }
};

/**
 * 示例 5: 错误处理和降级
 */
export const errorHandlingExample = async () => {
  info("=== 错误处理示例 ===");

  // 模拟一个可能失败的操作
  const riskyOperation = () =>
    pipe(
      logInfo("开始执行风险操作", {}, "risky-op"),
      TE.chain(() => {
        // 模拟随机失败
        if (Math.random() > 0.5) {
          return TE.left({ type: "UNKNOWN_ERROR" as const, message: "Random failure" });
        }
        return TE.right("success");
      }),
      TE.chainFirst(() => logSuccess("风险操作成功", {}, "risky-op")),
      // 错误处理：即使主操作失败，也要记录错误日志
      TE.orElse((error) => 
        pipe(
          TE.right("fallback-success"),
          TE.chainFirst(() => TE.fromTask(() => Promise.resolve(
            logError("风险操作失败，启用降级方案", { error: error.message }, "risky-op")()
          ))),
          TE.chainFirst(() => TE.fromTask(() => Promise.resolve(
            logInfo("使用缓存数据", {}, "fallback")()
          )))
        )
      )
    );

  const result = await riskyOperation()();
  
  if (result._tag === 'Right') {
    info("✅ 操作完成", { result: result.right });
  } else {
    error("❌ 操作失败", { error: result.left });
  }
};

// ============================================================================
// 迁移示例
// ============================================================================

/**
 * 示例 6: 日志迁移已移除
 * 
 * 注意：由于系统尚未发布，不需要迁移功能
 */
export const migrationExample = async () => {
  info("=== 日志迁移示例 ===");
  info("ℹ️ 迁移功能已移除 - 系统尚未发布，无需迁移");
};

// ============================================================================
// 完整示例运行器
// ============================================================================

/**
 * 运行所有示例
 */
export const runAllExamples = (): Promise<void> => {
  info("🚀 开始运行函数式日志系统示例...");

  const delay = (ms: number) => new Promise(resolve => globalThis.setTimeout(resolve, ms));

  return TE.tryCatch(
    async () => {
      // 首先测试日志系统
      info("1. 测试日志系统...");
      quickTestLogSystem();
      
      // 等待一下让测试完成
      await delay(2000);

      // 运行各种示例
      await basicLoggingExample();

      convenientLoggingExample();

      await logQueryExample();

      await businessFlowWithLoggingExample();

      await errorHandlingExample();

      await migrationExample();

      info("🎉 所有示例运行完成！");
    },
    (error) => ({ type: "EXAMPLE_ERROR" as const, message: String(error) })
  )().then(result => {
    if (result._tag === 'Left') {
      error("💥 示例运行过程中发生错误", { error: result.left });
    }
  });
};

// ============================================================================
// 对比：旧 vs 新的日志方式
// ============================================================================

/**
 * 对比旧的命令式日志和新的函数式日志
 */
export const comparisonExample = () => {
  info("=== 旧 vs 新日志方式对比 ===");

  // 旧的方式（命令式）
  info("❌ 旧的命令式方式:");
  info(`
    import logger from "@/io/log/logger";
    
    // 命令式，有副作用
    logger.info("用户登录", { userId: 123 });
    logger.error("登录失败", { error: "invalid password" });
    
    // 难以组合和测试
    // 错误处理不一致
    // 无法利用函数式编程的优势
  `);

  // 新的方式（函数式）
  info("✅ 新的函数式方式:");
  info(`
    import { logInfo, logError, info, error } from "@/io/log/logger.api";
    import { pipe } from "fp-ts/function";
    import * as TE from "fp-ts/TaskEither";
    
    // 便捷的同步方式
    info("用户登录", { userId: 123 }, "auth");
    error("登录失败", { error: "invalid password" }, "auth");
    
    // 函数式组合方式
    const loginFlow = (credentials) => pipe(
      logInfo("开始登录流程", credentials, "auth"),
      TE.chain(() => validateCredentials(credentials)),
      TE.chain(() => logSuccess("登录成功", { userId: credentials.userId }, "auth")),
      TE.orElse((error) => 
        logError("登录失败", { error: error.message }, "auth")
      )
    );
    
    // 优势：
    // - 类型安全的错误处理
    // - 可组合和可测试
    // - 一致的 TaskEither 接口
    // - 纯函数，无副作用
    // - 支持函数式编程模式
    // - 按需导入，无默认导出
  `);
};

// 如果直接运行此文件，执行所有示例
// Note: This is for Node.js environments only
if (typeof globalThis !== 'undefined' && typeof window === 'undefined') {
  // Only run in Node.js environment
  runAllExamples();
}