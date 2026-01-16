/**
 * @fileoverview Property-based tests for SQLite API usage verification
 * 
 * Feature: legacy-database-removal
 * Property 2: SQLite API 使用一致性
 * 
 * Validates: Requirements 2.1, 2.2, 3.1, 6.1, 6.2, 6.3, 6.4
 */

import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, extname } from "node:path"

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
 * 检查文件内容是否正确使用 SQLite API
 */
function checkFileForSQLiteApiUsage(filePath: string, content: string): {
	hasCorrectSQLiteUsage: boolean
	violations: string[]
	sqliteApiUsages: string[]
} {
	const violations: string[] = []
	const sqliteApiUsages: string[] = []
	
	// SQLite API 导入模式（正确的使用方式）
	const correctSQLiteImports = [
		/import.*from\s+['"]@\/io\/api\/backup\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/workspace\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/node\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/content\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/user\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/tag\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/attachment\.api['"]/,
		/import.*from\s+['"]@\/io\/api\/clear-data\.api['"]/,
		/import.*\*\s+as\s+\w+Api\s+from\s+['"]@\/io\/api\/\w+\.api['"]/,
	]

	// SQLite API 函数调用模式（正确的使用方式）
	const correctSQLiteApiCalls = [
		// Backup API
		/\bbackupApi\.(createBackup|restoreBackup|listBackups|deleteBackup|cleanupOldBackups)\(/,
		/\b(createBackup|restoreBackup|listBackups|deleteBackup|cleanupOldBackups)\(/,
		
		// Workspace API
		/\bworkspaceApi\.(getWorkspaces|getWorkspace|createWorkspace|updateWorkspace|deleteWorkspace)\(/,
		/\b(getWorkspaces|getWorkspace|createWorkspace|updateWorkspace|deleteWorkspace)\(/,
		
		// Node API
		/\bnodeApi\.(getNodesByWorkspace|getNode|createNode|updateNode|deleteNode|moveNode)\(/,
		/\b(getNodesByWorkspace|getNode|createNode|updateNode|deleteNode|moveNode|getChildNodes|getRootNodes|getNodesByParent|getNodesByType|getDescendants|getNextSortOrder|duplicateNode|reorderNodes|deleteNodesBatch)\(/,
		
		// Content API
		/\bcontentApi\.(getContentByNodeId|createContent|updateContentByNodeId|saveContent|getContentsByNodeIds)\(/,
		/\b(getContentByNodeId|createContent|updateContentByNodeId|saveContent|getContentsByNodeIds|getContentVersion)\(/,
		
		// User API
		/\buserApi\.(getUsers|getUser|createUser|updateUser|deleteUser)\(/,
		/\b(getUsers|getUser|createUser|updateUser|deleteUser|getCurrentUser|getUserByUsername|getUserByEmail|updateUserLastLogin)\(/,
		
		// Tag API
		/\btagApi\.(getTagsByWorkspace|getTag|createTag|updateTag|deleteTag)\(/,
		/\b(getTagsByWorkspace|getTag|createTag|updateTag|deleteTag|getTagByName|getTopTags|searchTags|getNodesByTag|getTagGraphData|getOrCreateTag|incrementTagCount|decrementTagCount|deleteTagsByWorkspace|syncTagCache|rebuildTagCache|recalculateTagCounts)\(/,
		
		// Clear Data API
		/\bclearDataApi\.(clearSqliteData|clearSqliteDataKeepUsers)\(/,
		/\b(clearSqliteData|clearSqliteDataKeepUsers)\(/,
		
		// Client API 直接调用
		/\bapi\.(getWorkspaces|getWorkspace|createWorkspace|updateWorkspace|deleteWorkspace|getNodesByWorkspace|getNode|createNode|updateNode|deleteNode|getContent|saveContent|createBackup|restoreBackup|getUsers|getUser|createUser|updateUser|deleteUser)\(/,
	]

	// 错误的 Dexie 使用模式（应该被替换的）
	const incorrectDexieUsage = [
		// 直接的 Dexie 数据库访问
		/\blegacyDatabase\.(users|workspaces|nodes|contents|attachments|tags|dbVersions)\./,
		/\bdatabase\.(users|workspaces|nodes|contents|attachments|tags|dbVersions)\./,
		
		// Dexie 查询方法
		/\.(toArray|where|equals|get|add|put|delete|clear|count|each|orderBy|reverse|limit|offset)\(/,
		
		// IndexedDB 直接访问
		/\bindexedDB\.(open|deleteDatabase)\(/,
		/\bnew\s+Dexie\(/,
		
		// 遗留的数据库导入
		/import.*legacyDatabase.*from/,
		/import.*from.*legacy-database/,
	]

	const lines = content.split('\n')
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const lineNumber = i + 1
		
		// 跳过注释行
		if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
			continue
		}

		// 检查正确的 SQLite API 使用
		for (const pattern of correctSQLiteImports) {
			if (pattern.test(line)) {
				sqliteApiUsages.push(`Line ${lineNumber}: ${line.trim()} (SQLite import)`)
			}
		}

		for (const pattern of correctSQLiteApiCalls) {
			if (pattern.test(line)) {
				sqliteApiUsages.push(`Line ${lineNumber}: ${line.trim()} (SQLite API call)`)
			}
		}

		// 检查错误的 Dexie 使用
		for (const pattern of incorrectDexieUsage) {
			if (pattern.test(line)) {
				violations.push(`Line ${lineNumber}: ${line.trim()} (Incorrect Dexie usage)`)
			}
		}
	}

	return {
		hasCorrectSQLiteUsage: violations.length === 0,
		violations,
		sqliteApiUsages
	}
}

/**
 * 检查特定文件是否应该使用 SQLite API
 */
function shouldUseSQLiteApi(filePath: string): boolean {
	const normalizedPath = filePath.replace(/\\/g, "/")
	
	// 需要使用 SQLite API 的文件类型
	const sqliteApiFiles = [
		// 业务流程文件
		/flows\/backup\//,
		/flows\/export\//,
		/flows\/import\//,
		/flows\/workspace\//,
		/flows\/node\//,
		/flows\/content\//,
		/flows\/user\//,
		/flows\/tag\//,
		/flows\/wiki\//,
		/flows\/migration\//,
		
		// API 文件本身
		/io\/api\//,
		
		// 某些 hooks 文件
		/hooks\/use-workspace/,
		/hooks\/use-node/,
		/hooks\/use-content/,
		/hooks\/use-backup/,
		/hooks\/use-user/,
		/hooks\/use-tag/,
		
		// 查询文件
		/queries\//,
	]

	// 排除的文件类型
	const excludedFiles = [
		// 测试文件
		/\.test\./,
		/\.spec\./,
		
		// 类型定义文件
		/types\//,
		/\.interface\./,
		/\.schema\./,
		
		// 工具函数
		/utils\//,
		/pipes\//,
		
		// UI 组件
		/views\//,
		/components\//,
		
		// 路由文件
		/routes\//,
		
		// 状态管理（除非直接操作数据）
		/state\//,
		
		// 配置文件
		/config\//,
		
		// 遗留文件（在清理过程中暂时保留）
		/legacy-database/,
		/dexie-cleanup-verification/,
	]

	// 检查是否应该排除
	for (const pattern of excludedFiles) {
		if (pattern.test(normalizedPath)) {
			return false
		}
	}

	// 检查是否应该使用 SQLite API
	for (const pattern of sqliteApiFiles) {
		if (pattern.test(normalizedPath)) {
			return true
		}
	}

	return false
}

/**
 * 允许的例外文件（在清理过程中可能暂时保留 Dexie 引用的文件）
 */
const ALLOWED_EXCEPTIONS = [
	// 测试文件本身
	"flows/legacy-database-removal/sqlite-api-usage-verification.property.test.ts",
	"flows/legacy-database-removal/dexie-cleanup-verification.property.test.ts",
	
	// 迁移相关文件（在完全清理前可能需要保留）
	"flows/migration/dexie-to-sqlite.migration.fn.ts",
	"flows/migration/dexie-to-sqlite.migration.fn.test.ts",
	
	// 遗留数据库文件（将在最后阶段删除）
	"io/db/legacy-database.ts",
	"io/db/index.ts",
	
	// 清理数据流程（可能需要清理 IndexedDB）
	"flows/backup/clear-data.flow.ts",
]

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 2: SQLite API 使用一致性", () => {
	/**
	 * Property 2: SQLite API 使用一致性
	 * 
	 * 对于任何数据访问操作，系统应使用相应的 SQLite API 而不是 Dexie API
	 * **验证: 需求 2.1, 2.2, 3.1, 6.1, 6.2, 6.3, 6.4**
	 */
	it("should use SQLite APIs instead of Dexie APIs for data access", () => {
		const projectRoot = join(process.cwd(), "src")
		const allFiles = getAllTypeScriptFiles(projectRoot)
		
		// 过滤出需要检查的文件
		const filesToCheck = allFiles.filter(filePath => {
			const normalizedPath = filePath.replace(/\\/g, "/")
			
			// 跳过允许的例外文件
			if (ALLOWED_EXCEPTIONS.some(exception => normalizedPath.includes(exception))) {
				return false
			}
			
			// 只检查应该使用 SQLite API 的文件
			return shouldUseSQLiteApi(filePath)
		})

		if (filesToCheck.length === 0) {
			// 如果没有需要检查的文件，测试通过
			return
		}
		
		// 使用 fast-check 生成文件路径进行测试
		fc.assert(
			fc.property(
				fc.constantFrom(...filesToCheck),
				(filePath) => {
					const fullPath = join(projectRoot, filePath)
					const content = readFileSync(fullPath, "utf-8")
					const result = checkFileForSQLiteApiUsage(filePath, content)

					// 如果发现违规使用，提供详细信息
					if (!result.hasCorrectSQLiteUsage) {
						console.error(`\n❌ Incorrect API usage found in ${filePath}:`)
						for (const violation of result.violations) {
							console.error(`  ${violation}`)
						}
						
						if (result.sqliteApiUsages.length > 0) {
							console.log(`\n✅ Correct SQLite API usages found:`)
							for (const usage of result.sqliteApiUsages.slice(0, 3)) { // 只显示前3个
								console.log(`  ${usage}`)
							}
							if (result.sqliteApiUsages.length > 3) {
								console.log(`  ... and ${result.sqliteApiUsages.length - 3} more`)
							}
						}
						
						return false
					}

					return true
				}
			),
			{ 
				numRuns: Math.min(100, filesToCheck.length),
				verbose: true
			}
		)
	})

	/**
	 * 验证备份功能使用 SQLite API
	 */
	it("should use SQLite backup APIs in backup flows", () => {
		const backupFlowPath = join(process.cwd(), "src/flows/backup/backup.flow.ts")
		
		try {
			const content = readFileSync(backupFlowPath, "utf-8")
			
			// 检查是否导入了正确的 backup API
			expect(content).toMatch(/import.*from\s+['"]@\/io\/api\/backup\.api['"]/)
			
			// 检查是否使用了 SQLite backup API 函数
			expect(content).toMatch(/backupApi\.createBackup\(\)|createBackup\(\)/)
			expect(content).toMatch(/backupApi\.restoreBackup\(|restoreBackup\(/)
			
			// 确保没有使用 Dexie 相关的调用
			expect(content).not.toMatch(/legacyDatabase\.(users|workspaces|nodes|contents|attachments|tags)/)
			expect(content).not.toMatch(/database\.(users|workspaces|nodes|contents|attachments|tags)/)
			expect(content).not.toMatch(/\.toArray\(\)/)
			
		} catch (error) {
			// 如果文件不存在，跳过测试
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				console.warn(`Backup flow file not found: ${backupFlowPath}`)
				return
			}
			throw error
		}
	})

	/**
	 * 验证导出功能使用 SQLite API
	 */
	it("should use SQLite APIs in export flows", () => {
		const exportFlowPath = join(process.cwd(), "src/flows/export")
		
		try {
			const files = readdirSync(exportFlowPath).filter(f => f.endsWith('.ts') && !f.includes('.test.'))
			
			for (const file of files) {
				const filePath = join(exportFlowPath, file)
				const content = readFileSync(filePath, "utf-8")
				
				// 如果文件包含数据访问，应该使用 SQLite API
				if (content.includes('workspace') || content.includes('node') || content.includes('content')) {
					// 检查是否使用了正确的 API 导入
					const hasCorrectImports = 
						content.includes('@/io/api/workspace.api') ||
						content.includes('@/io/api/node.api') ||
						content.includes('@/io/api/content.api') ||
						content.includes('getWorkspace') ||
						content.includes('getNodesByWorkspace') ||
						content.includes('getContentsByNodeIds')
					
					// 确保没有使用 Dexie
					const hasDexieUsage = 
						content.includes('legacyDatabase.') ||
						content.includes('database.workspaces') ||
						content.includes('database.nodes') ||
						content.includes('.toArray()')
					
					if (hasDexieUsage) {
						throw new Error(`Export flow ${file} still uses Dexie APIs`)
					}
					
					// 如果有数据访问但没有正确的导入，可能需要更新
					if (!hasCorrectImports && (content.includes('workspace') || content.includes('node'))) {
						console.warn(`Export flow ${file} may need SQLite API integration`)
					}
				}
			}
		} catch (error) {
			// 如果目录不存在，跳过测试
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				console.warn(`Export flows directory not found: ${exportFlowPath}`)
				return
			}
			throw error
		}
	})

	/**
	 * 验证 API 客户端提供完整的 SQLite 接口
	 */
	it("should provide comprehensive SQLite API interface", () => {
		const clientApiPath = join(process.cwd(), "src/io/api/client.api.ts")
		
		try {
			const content = readFileSync(clientApiPath, "utf-8")
			
			// 验证关键的 SQLite API 方法存在
			const requiredMethods = [
				// Workspace API
				'getWorkspaces',
				'getWorkspace',
				'createWorkspace',
				'updateWorkspace',
				'deleteWorkspace',
				
				// Node API
				'getNodesByWorkspace',
				'getNode',
				'createNode',
				'updateNode',
				'deleteNode',
				
				// Content API
				'getContent',
				'saveContent',
				
				// Backup API
				'createBackup',
				'restoreBackup',
				'listBackups',
				
				// User API
				'getUsers',
				'getUser',
				'createUser',
				'updateUser',
				'deleteUser',
			]
			
			for (const method of requiredMethods) {
				expect(content).toMatch(new RegExp(`readonly ${method}:`))
			}
			
			// 确保没有 Dexie 相关的方法
			expect(content).not.toMatch(/dexie/i)
			expect(content).not.toMatch(/indexeddb/i)
			expect(content).not.toMatch(/legacyDatabase/)
			
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw new Error(`Client API file not found: ${clientApiPath}`)
			}
			throw error
		}
	})

	/**
	 * 验证数据访问一致性 - 所有数据操作都通过 SQLite API
	 */
	it("should ensure all data operations go through SQLite APIs", () => {
		fc.assert(
			fc.property(
				fc.constantFrom(
					"getWorkspaces",
					"getNodesByWorkspace", 
					"getContent",
					"createBackup",
					"restoreBackup",
					"getUsers",
					"createWorkspace",
					"createNode",
					"updateNode",
					"deleteNode",
					"saveContent"
				),
				(apiMethod) => {
					const projectRoot = join(process.cwd(), "src")
					const allFiles = getAllTypeScriptFiles(projectRoot)
					
					// 查找使用该 API 方法的文件
					const filesUsingMethod = allFiles.filter(filePath => {
						const normalizedPath = filePath.replace(/\\/g, "/")
						
						// 跳过允许的例外文件
						if (ALLOWED_EXCEPTIONS.some(exception => normalizedPath.includes(exception))) {
							return false
						}
						
						// 跳过测试文件和类型定义文件
						if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('types/')) {
							return false
						}
						
						const fullPath = join(projectRoot, filePath)
						const content = readFileSync(fullPath, "utf-8")
						
						return content.includes(apiMethod)
					})
					
					// 对于每个使用该方法的文件，验证它使用的是 SQLite API
					for (const filePath of filesUsingMethod) {
						const fullPath = join(projectRoot, filePath)
						const content = readFileSync(fullPath, "utf-8")
						
						// 如果使用了该方法，应该通过正确的 API 导入
						if (content.includes(apiMethod)) {
							const hasCorrectImport = 
								content.includes('@/io/api/') ||
								content.includes('from "./client.api"') ||
								content.includes('import { api }')
							
							const hasDexieUsage = 
								content.includes('legacyDatabase.') ||
								content.includes('database.workspaces') ||
								content.includes('database.nodes') ||
								content.includes('.toArray()')
							
							if (hasDexieUsage) {
								console.error(`❌ File ${filePath} uses ${apiMethod} but still has Dexie usage`)
								return false
							}
							
							if (!hasCorrectImport && shouldUseSQLiteApi(filePath)) {
								console.warn(`⚠️ File ${filePath} uses ${apiMethod} but may not have correct API import`)
							}
						}
					}
					
					return true
				}
			),
			{ numRuns: 100 }
		)
	})
})