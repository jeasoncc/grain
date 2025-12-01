/**
 * 功能测试工具
 * 用于验证新功能是否正常工作
 */
import { db } from "@/db/curd";
import logger from "@/log/index";
import { createBackup, getDatabaseStats } from "@/services/backup";
import { searchEngine } from "@/services/search";

/**
 * 测试备份功能
 */
export async function testBackupFeature() {
	logger.info("🧪 测试备份功能...");

	try {
		// 1. 获取统计信息
		const stats = await getDatabaseStats();
		logger.info("📊 数据统计:", stats);

		// 2. 创建备份
		const backup = await createBackup();
		logger.success(`✅ 备份创建成功: ${backup.metadata.projectCount} 个项目`);

		// 3. 验证备份数据
		if (backup.projects.length !== stats.projectCount) {
			throw new Error("备份项目数量不匹配");
		}

		logger.success("✅ 备份功能测试通过");
		return true;
	} catch (error) {
		logger.error("❌ 备份功能测试失败:", error);
		return false;
	}
}

/**
 * 测试搜索功能
 */
export async function testSearchFeature() {
	logger.info("🧪 测试搜索功能...");

	try {
		// 1. 获取测试数据
		const scenes = await db.scenes.limit(10).toArray();
		if (scenes.length === 0) {
			logger.warn("⚠️ 没有场景数据，跳过搜索测试");
			return true;
		}

		// 2. 测试简单搜索
		const testQuery = scenes[0].title.slice(0, 3);
		logger.info(`🔍 搜索关键词: "${testQuery}"`);

		const results = await searchEngine.simpleSearch(testQuery, {
			limit: 10,
		});

		logger.info(`📝 找到 ${results.length} 个结果`);

		// 3. 验证结果
		if (results.length === 0) {
			logger.warn("⚠️ 搜索结果为空");
		} else {
			logger.info("前3个结果:");
			results.slice(0, 3).forEach((result, index) => {
				logger.info(`  ${index + 1}. [${result.type}] ${result.title}`);
			});
		}

		logger.success("✅ 搜索功能测试通过");
		return true;
	} catch (error) {
		logger.error("❌ 搜索功能测试失败:", error);
		return false;
	}
}

/**
 * 测试数据库索引
 */
export async function testDatabaseIndexes() {
	logger.info("🧪 测试数据库索引...");

	try {
		// 1. 测试项目查询
		const projects = await db.projects.toArray();
		if (projects.length > 0) {
			const projectId = projects[0].id;

			// 2. 测试章节查询（使用 project 索引）
			const startTime1 = performance.now();
			const chapters = await db.chapters
				.where("project")
				.equals(projectId)
				.toArray();
			const time1 = performance.now() - startTime1;
			logger.info(
				`📖 章节查询: ${chapters.length} 个结果, 耗时 ${time1.toFixed(2)}ms`,
			);

			// 3. 测试场景查询（使用 project 索引）
			const startTime2 = performance.now();
			const scenes = await db.scenes
				.where("project")
				.equals(projectId)
				.toArray();
			const time2 = performance.now() - startTime2;
			logger.info(
				`📄 场景查询: ${scenes.length} 个结果, 耗时 ${time2.toFixed(2)}ms`,
			);

			// 4. 验证性能
			if (time1 > 100 || time2 > 100) {
				logger.warn("⚠️ 查询性能较慢，可能需要优化");
			}
		}

		logger.success("✅ 数据库索引测试通过");
		return true;
	} catch (error) {
		logger.error("❌ 数据库索引测试失败:", error);
		return false;
	}
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
	logger.info("🚀 开始运行功能测试...");
	logger.info("=".repeat(50));

	const results = {
		backup: await testBackupFeature(),
		search: await testSearchFeature(),
		database: await testDatabaseIndexes(),
	};

	logger.info("=".repeat(50));
	logger.info("📊 测试结果汇总:");
	logger.info(`  备份功能: ${results.backup ? "✅ 通过" : "❌ 失败"}`);
	logger.info(`  搜索功能: ${results.search ? "✅ 通过" : "❌ 失败"}`);
	logger.info(`  数据库索引: ${results.database ? "✅ 通过" : "❌ 失败"}`);

	const allPassed = Object.values(results).every((r) => r);
	if (allPassed) {
		logger.success("🎉 所有测试通过！");
	} else {
		logger.error("❌ 部分测试失败，请检查日志");
	}

	return results;
}

// 在开发环境下暴露到全局
if (import.meta.env.DEV) {
	(window as any).testFeatures = {
		runAll: runAllTests,
		backup: testBackupFeature,
		search: testSearchFeature,
		database: testDatabaseIndexes,
	};
	logger.info("💡 测试工具已加载，在控制台输入 testFeatures.runAll() 运行测试");
}
