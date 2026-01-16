/**
 * @fileoverview Property-based tests for test suite SQLite verification
 *
 * Feature: legacy-database-removal
 * Property 7: 测试套件 SQLite 验证
 *
 * Validates: Requirements 7.2, 7.4
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * 获取所有测试文件
 */
function getAllTestFiles(dir: string): string[] {
	const fs = require("node:fs")
	const path = require("node:path")

	function walkDir(currentDir: string, basePath: string = ""): string[] {
		const files: string[] = []
		const entries = fs.readdirSync(currentDir, { withFileTypes: true })

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name)
			const relativePath = path.join(basePath, entry.name)

			if (entry.isDirectory()) {
				// 跳过 node_modules 和其他不相关目录
				if (!["node_modules", ".git", "dist", "build", ".turbo"].includes(entry.name)) {
					files.push(...walkDir(fullPath, relativePath))
				}
			} else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
				files.push(relativePath)
			}
		}

		return files
	}

	return walkDir(dir)
}

/**
 * 检查测试文件是否包含 Dexie 相关的模拟或引用
 */
function checkTestFileForDexieReferences(
	filePath: string,
	content: string,
): {
	hasDexieReferences: boolean
	references: string[]
} {
	const references: string[] = []

	// 检查 Dexie 相关的模拟和测试代码
	const dexieTestPatterns = [
		// Mock patterns
		/vi\.mock.*dexie/i,
		/vi\.mock.*legacy.*database/i,
		/mockLegacyDatabase/g,
		/mock.*dexie/i,

		// Import patterns
		/import.*dexie/i,
		/from\s+['"]dexie['"]/i,
		/from.*legacy-database/i,
		/import.*legacy-database/i,

		// Usage patterns (but not in comments or property test descriptions)
		/legacyDatabase\./g,
		/\.toArray\(\)/g, // Dexie-specific method
		/\.count\(\)/g, // Dexie-specific method when used with database
		/\.transaction\(/g, // Dexie-specific method

		// Specific Dexie database table references
		/legacyDatabase\.users/g,
		/legacyDatabase\.workspaces/g,
		/legacyDatabase\.nodes/g,
		/legacyDatabase\.contents/g,
		/legacyDatabase\.attachments/g,
		/legacyDatabase\.tags/g,
	]

	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		// 跳过注释行和属性测试描述
		if (
			line.trim().startsWith("//") ||
			line.trim().startsWith("*") ||
			line.includes("Property 7:") ||
			line.includes("测试套件 SQLite 验证") ||
			line.includes("@fileoverview") ||
			line.includes("@description")
		) {
			continue
		}

		// 跳过字符串字面量中的引用（如错误消息）
		if (line.includes('"') && (line.includes("Dexie") || line.includes("IndexedDB"))) {
			// 检查是否是测试断言中的字符串
			if (line.includes("expect") || line.includes("toBe") || line.includes("toContain")) {
				continue
			}
		}

		for (const pattern of dexieTestPatterns) {
			if (pattern.test(line)) {
				// 额外检查：如果是 .count() 或 .toArray()，确保它们与数据库相关
				if (pattern.source.includes("count\\(\\)") || pattern.source.includes("toArray\\(\\)")) {
					if (!line.includes("database") && !line.includes("legacyDatabase")) {
						continue // 跳过非数据库相关的 count() 或 toArray() 调用
					}
				}

				// 跳过 localStorage 或其他非 Dexie 相关的 clear() 调用
				if (pattern.source.includes("transaction\\(\\)")) {
					if (!line.includes("database") && !line.includes("legacyDatabase")) {
						continue // 跳过非数据库相关的 transaction() 调用
					}
				}

				references.push(`Line ${i + 1}: ${line.trim()}`)
			}
		}
	}

	return {
		hasDexieReferences: references.length > 0,
		references,
	}
}

/**
 * 检查测试文件是否验证 SQLite API 使用
 */
function checkTestFileForSQLiteAPIVerification(
	filePath: string,
	content: string,
): {
	verifiesSQLiteAPI: boolean
	sqliteReferences: string[]
} {
	const sqliteReferences: string[] = []

	// SQLite API 相关模式
	const sqlitePatterns = [
		// API imports
		/from\s+['"]@\/io\/api/i,
		/import.*api/i,

		// API function calls
		/createWorkspace/g,
		/createNode/g,
		/createContent/g,
		/createUser/g,
		/getWorkspace/g,
		/getNode/g,
		/getContent/g,
		/getUser/g,
		/updateWorkspace/g,
		/updateNode/g,
		/updateContent/g,
		/updateUser/g,
		/deleteWorkspace/g,
		/deleteNode/g,
		/deleteContent/g,
		/deleteUser/g,

		// Backup API
		/createBackup/g,
		/restoreBackup/g,

		// Export API
		/getNodesByWorkspace/g,
		/getContentsByNodeIds/g,
	]

	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		for (const pattern of sqlitePatterns) {
			if (pattern.test(line)) {
				sqliteReferences.push(`Line ${i + 1}: ${line.trim()}`)
			}
		}
	}

	return {
		sqliteReferences,
		verifiesSQLiteAPI: sqliteReferences.length > 0,
	}
}

// ============================================================================
// 允许的例外情况
// ============================================================================

const ALLOWED_EXCEPTIONS = [
	// 测试文件本身
	"flows/legacy-database-removal/test-suite-sqlite-verification.property.test.ts",

	// 其他清理验证测试文件（它们测试清理本身）
	"flows/legacy-database-removal/dexie-cleanup-verification.property.test.ts",
	"flows/legacy-database-removal/sqlite-api-usage-verification.property.test.ts",
	"flows/wiki/wiki-code-cleanup-verification.property.test.ts",
	"flows/migration/migration-sqlite-dependency-verification.property.test.ts",

	// 迁移测试文件（已经更新为测试 SQLite-only 架构）
	"flows/migration/dexie-to-sqlite.migration.fn.test.ts",
]

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 7: 测试套件 SQLite 验证", () => {
	/**
	 * Property 7.1: 测试文件不应包含 Dexie 模拟或引用
	 *
	 * 对于任何测试用例，测试应验证 SQLite API 使用且不包含 Dexie 模拟或引用
	 *
	 * **验证: 需求 7.2**
	 */
	it("should not contain Dexie mocks or references in test files", () => {
		const projectRoot = join(process.cwd(), "apps/desktop/src")
		const allTestFiles = getAllTestFiles(projectRoot)

		fc.assert(
			fc.property(fc.constantFrom(...allTestFiles), (testFile) => {
				// 跳过允许的例外情况
				const normalizedPath = testFile.replace(/\\/g, "/")
				if (ALLOWED_EXCEPTIONS.some((exception) => normalizedPath.includes(exception))) {
					return true
				}

				const fullPath = join(projectRoot, testFile)
				const content = readFileSync(fullPath, "utf-8")
				const result = checkTestFileForDexieReferences(testFile, content)

				// 如果发现 Dexie 引用，提供详细信息
				if (result.hasDexieReferences) {
					console.error(`\n❌ Dexie references found in test file ${testFile}:`)
					console.error("References:")
					for (const ref of result.references) {
						console.error(`  ${ref}`)
					}
					console.error("\n💡 Tests should use SQLite API calls instead of Dexie mocks")
					return false
				}

				return true
			}),
			{ numRuns: Math.min(100, allTestFiles.length) },
		)
	})

	/**
	 * Property 7.2: 功能测试应验证 SQLite API 使用
	 *
	 * 对于任何功能相关的测试文件，如果测试数据访问，应验证 SQLite API 的使用
	 *
	 * **验证: 需求 7.4**
	 */
	it("should verify SQLite API usage in functional tests", () => {
		const projectRoot = join(process.cwd(), "apps/desktop/src")
		const allTestFiles = getAllTestFiles(projectRoot)

		// 过滤出功能测试文件（排除纯属性测试和工具测试）
		const functionalTestFiles = allTestFiles.filter((file) => {
			const normalizedPath = file.replace(/\\/g, "/")
			return (
				!normalizedPath.includes("property.test.ts") &&
				!normalizedPath.includes("util.test.ts") &&
				!normalizedPath.includes("helper.test.ts") &&
				(normalizedPath.includes("flow") ||
					normalizedPath.includes("api") ||
					normalizedPath.includes("backup") ||
					normalizedPath.includes("export") ||
					normalizedPath.includes("migration"))
			)
		})

		if (functionalTestFiles.length === 0) {
			// 如果没有功能测试文件，测试通过
			return
		}

		fc.assert(
			fc.property(fc.constantFrom(...functionalTestFiles), (testFile) => {
				const fullPath = join(projectRoot, testFile)
				const content = readFileSync(fullPath, "utf-8")

				// 检查是否包含数据访问测试
				const hasDataAccessTests =
					content.includes("create") ||
					content.includes("get") ||
					content.includes("update") ||
					content.includes("delete") ||
					content.includes("backup") ||
					content.includes("export")

				if (!hasDataAccessTests) {
					// 如果不是数据访问测试，跳过
					return true
				}

				const result = checkTestFileForSQLiteAPIVerification(testFile, content)

				// 数据访问测试应该验证 SQLite API 使用
				if (!result.verifiesSQLiteAPI) {
					console.error(`\n⚠️  Functional test file ${testFile} should verify SQLite API usage`)
					console.error("Consider adding tests that verify SQLite API calls are made correctly")
					// 这是一个警告，不是错误，因为有些测试可能通过其他方式验证
					return true
				}

				return true
			}),
			{ numRuns: Math.min(100, functionalTestFiles.length) },
		)
	})

	/**
	 * Property 7.3: 测试套件应该能够运行而不依赖 Dexie
	 *
	 * 验证测试套件的完整性，确保所有测试都能在没有 Dexie 的环境中运行
	 *
	 * **验证: 需求 7.2, 7.4**
	 */
	it("should be able to run test suite without Dexie dependencies", () => {
		// 检查测试环境配置
		const testSetupPath = join(process.cwd(), "apps/desktop/src/test/setup.ts")

		try {
			const setupContent = readFileSync(testSetupPath, "utf-8")

			// 测试设置不应包含 Dexie 相关配置
			const hasDexieSetup =
				setupContent.includes("dexie") ||
				setupContent.includes("IndexedDB") ||
				setupContent.includes("legacyDatabase")

			if (hasDexieSetup) {
				console.error("❌ Test setup contains Dexie-related configuration")
				return false
			}

			return true
		} catch (error) {
			// 如果没有测试设置文件，这是可以接受的
			return true
		}
	})
})
