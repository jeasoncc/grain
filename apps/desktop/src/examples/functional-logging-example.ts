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
import { migrateWithProgressFlow } from "@/flows/log/migration.flow";

// ============================================================================
// 基本使用示例
// ============================================================================

/**
 * 示例 1: 基本日志记录（异步版本）
 */
export const basicLoggingExample = async () => {
  console.log("=== 基本日志记录示例 ===");

  // 使用 TaskEither 进行错误处理的异步日志
  const result = await pipe(
    logInfo("应用启动", { version: "1.0.0" }, "app"),
    TE.chain(() => logSuccess("数据库连接成功", { host: "localhost" }, "database")),
    TE.chain(() => logWarn("配置文件缺失，使用默认配置", {}, "config")),
    TE.chain(() => logError("网络连接失败", { error: "timeout" }, "network")),
  )();

  if (result._tag === 'Right') {
    console.log("✅ 所有日志记录成功");
  } else {
    console.error("❌ 日志记录失败:", result.left);
  }
};

/**
 * 示例 2: 便捷的同步日志记录（Fire-and-forget）
 */
export const convenientLoggingExample = () => {
  console.log("=== 便捷日志记录示例 ===");

  // 不需要等待结果的同步日志记录
  debug("调试信息：用户点击了按钮", { buttonId: "submit" }, "ui");
  info("用户登录", { userId: 123, username: "alice" }, "auth");
  success("文件保存成功", { filename: "document.txt" }, "file");
  warn("磁盘空间不足", { available: "100MB" }, "system");
  error("API 调用失败", { endpoint: "/api/users", status: 500 }, "api");

  console.log("📝 同步日志已发送（不等待结果）");
};

/**
 * 示例 3: 日志查询
 */
export const logQueryExample = async () => {
  console.log("=== 日志查询示例 ===");

  const result = await queryLogs({
    limit: 5,
    level_filter: ['error', 'warn'],
    source_filter: 'api',
  })();

  if (result._tag === 'Right') {
    const logs = result.right;
    console.log(`找到 ${logs.entries.length} 条日志:`);
    logs.entries.forEach(log => {
      console.log(`  [${log.level}] ${log.message} (${log.source})`);
    });
  } else {
    console.error("查询失败:", result.left);
  }
};

// ============================================================================
// 业务场景示例
// ============================================================================

/**
 * 示例 4: 在业务流程中使用日志
 */
export const businessFlowWithLoggingExample = async () => {
  console.log("=== 业务流程日志示例 ===");

  // 模拟一个用户注册流程
  const registerUser = (userData: { email: string; username: string }) =>
    pipe(
      logInfo("开始用户注册流程", userData, "user-registration"),
      TE.chain(() => {
        // 模拟验证邮箱
        if (!userData.email.includes('@')) {
          return pipe(
            logError("邮箱格式无效", { email: userData.email }, "validation"),
            TE.chain(() => TE.left({ type: "VALIDATION_ERROR" as const, message: "Invalid email" }))
          );
        }
        return logInfo("邮箱验证通过", { email: userData.email }, "validation");
      }),
      TE.chain(() => {
        // 模拟保存到数据库
        return logInfo("保存用户到数据库", { username: userData.username }, "database");
      }),
      TE.chain(() => {
        // 模拟发送欢迎邮件
        return logInfo("发送欢迎邮件", { email: userData.email }, "email");
      }),
      TE.chain(() => logSuccess("用户注册完成", userData, "user-registration")),
    );

  // 执行注册流程
  const result = await registerUser({
    email: "user@example.com",
    username: "newuser"
  })();

  if (result._tag === 'Right') {
    console.log("✅ 用户注册成功");
  } else {
    console.error("❌ 用户注册失败:", result.left);
  }
};

/**
 * 示例 5: 错误处理和降级
 */
export const errorHandlingExample = async () => {
  console.log("=== 错误处理示例 ===");

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
      TE.chain(() => logSuccess("风险操作成功", {}, "risky-op")),
      // 错误处理：即使主操作失败，也要记录错误日志
      TE.orElse((error) =>
        pipe(
          logError("风险操作失败，启用降级方案", { error: error.message }, "risky-op"),
          TE.chain(() => logInfo("使用缓存数据", {}, "fallback")),
          TE.map(() => "fallback-success")
        )
      )
    );

  const result = await riskyOperation()();
  
  if (result._tag === 'Right') {
    console.log("✅ 操作完成:", result.right);
  } else {
    console.error("❌ 操作失败:", result.left);
  }
};

// ============================================================================
// 迁移示例
// ============================================================================

/**
 * 示例 6: 执行日志迁移
 */
export const migrationExample = async () => {
  console.log("=== 日志迁移示例 ===");

  const result = await migrateWithProgressFlow((progress) => {
    console.log(`📊 迁移进度: ${progress.progress}% - ${progress.message}`);
    if (progress.processedCount !== undefined && progress.totalCount !== undefined) {
      console.log(`   处理进度: ${progress.processedCount}/${progress.totalCount}`);
    }
  })();

  if (result._tag === 'Right') {
    const migrationResult = result.right;
    console.log("✅ 迁移完成:", migrationResult);
  } else {
    console.error("❌ 迁移失败:", result.left);
  }
};

// ============================================================================
// 完整示例运行器
// ============================================================================

/**
 * 运行所有示例
 */
export const runAllExamples = async () => {
  console.log("🚀 开始运行函数式日志系统示例...\n");

  try {
    // 首先测试日志系统
    console.log("1. 测试日志系统...");
    quickTestLogSystem();
    
    // 等待一下让测试完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 运行各种示例
    await basicLoggingExample();
    console.log();

    convenientLoggingExample();
    console.log();

    await logQueryExample();
    console.log();

    await businessFlowWithLoggingExample();
    console.log();

    await errorHandlingExample();
    console.log();

    await migrationExample();
    console.log();

    console.log("🎉 所有示例运行完成！");
  } catch (error) {
    console.error("💥 示例运行过程中发生错误:", error);
  }
};

// ============================================================================
// 对比：旧 vs 新的日志方式
// ============================================================================

/**
 * 对比旧的命令式日志和新的函数式日志
 */
export const comparisonExample = () => {
  console.log("=== 旧 vs 新日志方式对比 ===");

  // 旧的方式（命令式）
  console.log("❌ 旧的命令式方式:");
  console.log(`
    import logger from "@/io/log/logger";
    
    // 命令式，有副作用
    logger.info("用户登录", { userId: 123 });
    logger.error("登录失败", { error: "invalid password" });
    
    // 难以组合和测试
    // 错误处理不一致
    // 无法利用函数式编程的优势
  `);

  // 新的方式（函数式）
  console.log("✅ 新的函数式方式:");
  console.log(`
    import { logInfo, logError } from "@/io/log/logger.api";
    import { pipe } from "fp-ts/function";
    import * as TE from "fp-ts/TaskEither";
    
    // 函数式，可组合
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
  `);
};

// 如果直接运行此文件，执行所有示例
if (typeof window === 'undefined' && require.main === module) {
  runAllExamples();
}