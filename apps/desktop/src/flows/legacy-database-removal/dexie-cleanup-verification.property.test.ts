/**
 * @fileoverview Property-based tests for Dexie cleanup verification
 *
 * Feature: legacy-database-removal
 * Property 1: 代码库 Dexie 清理完整性
 *
 * Validates: Requirements 1.2, 2.4, 3.3, 4.3, 5.3, 7.1, 7.3
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import fc from "fast-check"
import { describe, expect, it } from "vitest"

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * 递归获取所有 TypeScript 文件
 */
function getAllTypeScriptFiles(dir: string, basePath: string = ""): string[] {
	const files: string[] = []
	const entries = readdirSync(dir)

	for (const entry of entries) {
		const fullPath = join(dir, entry)
		const relativePath = basePath ? join(basePath, entry) : entry
		const stat = statSync(fullPath)

		if (stat.isDirectory()) {
			// 跳过 node_modules, dist, .turbo 等目录
			if (!["node_modules", "dist", ".turbo", ".git", "target"].includes(entry)) {
				files.push(...getAllTypeScriptFiles(fullPath, relativePath))
			}
		} else if (stat.isFile() && [".ts", ".tsx"].includes(extname(entry))) {
			files.push(relativePath)
		}
	}

	return files
}

/**
 * 检查文件内容是否包含 Dexie 相关引用
 */
function checkFileForDexieReferences(
	filePath: string,
	content: string,
): {
	hasDexieReferences: boolean
	references: string[]
} {
	const references: string[] = []

	// 检查 Dexie 相关的导入和使用
	const dexiePatterns = [
		/import.*dexie/i,
		/from\s+['"]dexie['"]/i,
		/legacyDatabase/g,
		/IndexedDB/g,
		/\.table\(/g,
		/\.transaction\(/g,
		/legacyDatabase\.users/g,
		/legacyDatabase\.workspaces/g,
		/legacyDatabase\.nodes/g,
		/legacyDatabase\.contents/g,
		/legacyDatabase\.attachments/g,
		/legacyDatabase\.tags/g,
		/legacyDatabase\.dbVersions/g,
		/database\.users/g,
		/database\.workspaces/g,
		/database\.nodes/g,
		/database\.contents/g,
		/database\.attachments/g,
		/database\.tags/g,
		/database\.dbVersions/g,
		/clearIndexedDB/g,
		/hasDexieData/g,
		/clearDexieData/g,
	]

	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		// 跳过注释行（但保留 TODO 注释中的引用）
		if (line.trim().startsWith("//") && !line.includes("TODO") && !line.includes("FIXME")) {
			continue
		}

		// 跳过多行注释（但保留 TODO 注释中的引用）
		if (line.trim().startsWith("*") && !line.includes("TODO") && !line.includes("FIXME")) {
			continue
		}

		// 跳过 JSX 文本内容中的 IndexedDB 引用（UI 显示文本）
		if (
			line.includes("<p") ||
			line.includes("<h") ||
			line.includes("{/*") ||
			line.includes("*/}")
		) {
			// 检查是否是纯文本引用
			if (
				line.includes("IndexedDB") &&
				!line.includes("indexedDB.") &&
				!line.includes("window.indexedDB")
			) {
				continue
			}
		}

		for (const pattern of dexiePatterns) {
			if (pattern.test(line)) {
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
 * 允许的例外文件（在清理过程中可能暂时保留的文件）
 */
const ALLOWED_EXCEPTIONS = [
	// 测试文件本身
	"flows/legacy-database-removal/dexie-cleanup-verification.property.test.ts",
	// 迁移相关文件（在完全清理前可能需要保留）
	"flows/migration/dexie-to-sqlite.migration.fn.ts",
	"flows/migration/dexie-to-sqlite.migration.fn.test.ts",
	// 遗留数据库文件（将在最后阶段删除）
	"io/db/legacy-database.ts",
	"io/db/index.ts",
]

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 1: 代码库 Dexie 清理完整性", () => {
	/**
	 * Property 1: 代码库 Dexie 清理完整性
	 *
	 * 对于任何代码文件，该文件不应包含对 legacyDatabase、dexie、或 IndexedDB 的引用
	 * **验证: 需求 1.2, 2.4, 3.3, 4.3, 5.3, 7.1, 7.3**
	 */
	it("should not contain Dexie references in any TypeScript file", () => {
		const projectRoot = join(process.cwd(), "src")
		const allFiles = getAllTypeScriptFiles(projectRoot)

		// 使用 fast-check 生成文件路径进行测试
		fc.assert(
			fc.property(fc.constantFrom(...allFiles), (filePath) => {
				// 跳过允许的例外文件
				const normalizedPath = filePath.replace(/\\/g, "/")
				if (ALLOWED_EXCEPTIONS.some((exception) => normalizedPath.includes(exception))) {
					return true
				}

				const fullPath = join(projectRoot, filePath)
				const content = readFileSync(fullPath, "utf-8")
				const result = checkFileForDexieReferences(filePath, content)

				// 如果发现 Dexie 引用，提供详细信息
				if (result.hasDexieReferences) {
					console.error(`\n❌ Dexie references found in ${filePath}:`)
					for (const ref of result.references) {
						console.error(`  ${ref}`)
					}
					return false
				}

				return true
			}),
			{
				numRuns: Math.min(100, allFiles.length),
				verbose: true,
			},
		)
	})

	/**
	 * 验证 package.json 中不包含 Dexie 依赖
	 */
	it("should not have Dexie dependencies in package.json", () => {
		const packageJsonPath = join(process.cwd(), "package.json")
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))

		const dependencies = packageJson.dependencies || {}
		const devDependencies = packageJson.devDependencies || {}
		const allDeps = { ...dependencies, ...devDependencies }

		// 检查是否包含 Dexie 相关依赖
		const dexieDeps = Object.keys(allDeps).filter(
			(dep) => dep.toLowerCase().includes("dexie") || dep.toLowerCase().includes("indexeddb"),
		)

		expect(dexieDeps).toEqual([])
	})

	/**
	 * 验证运行时不会尝试初始化 IndexedDB
	 */
	it("should not attempt to initialize IndexedDB at runtime", () => {
		fc.assert(
			fc.property(
				fc.constantFrom(
					"new Dexie(",
					"indexedDB.open(",
					"window.indexedDB",
					"global.indexedDB",
					"self.indexedDB",
				),
				(pattern) => {
					const projectRoot = join(process.cwd(), "src")
					const allFiles = getAllTypeScriptFiles(projectRoot)

					for (const filePath of allFiles) {
						// 跳过允许的例外文件
						const normalizedPath = filePath.replace(/\\/g, "/")
						if (ALLOWED_EXCEPTIONS.some((exception) => normalizedPath.includes(exception))) {
							continue
						}

						const fullPath = join(projectRoot, filePath)
						const content = readFileSync(fullPath, "utf-8")

						if (content.includes(pattern)) {
							console.error(`❌ IndexedDB initialization found in ${filePath}: ${pattern}`)
							return false
						}
					}

					return true
				},
			),
			{ numRuns: 100 },
		)
	})
})
