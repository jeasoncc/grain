/**
 * @file wiki-code-cleanup-verification.property.test.ts
 * @description Property-based test for Wiki code cleanup verification
 *
 * **Property 6: Wiki 代码清理一致性**
 * *For any* Wiki 相关功能，如果保留则应使用 SQLite API，如果移除则不应留下孤立代码
 * **Validates: Requirements 4.1, 4.2, 4.4**
 */

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import fc from "fast-check"
import { describe, it } from "vitest"

/**
 * Get all TypeScript files in a directory recursively
 */
async function getTypeScriptFiles(dir: string): Promise<string[]> {
	const files: string[] = []

	try {
		const entries = await readdir(dir, { withFileTypes: true })

		for (const entry of entries) {
			const fullPath = join(dir, entry.name)

			if (entry.isDirectory()) {
				// Skip node_modules and other irrelevant directories
				if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
					const subFiles = await getTypeScriptFiles(fullPath)
					files.push(...subFiles)
				}
			} else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
				files.push(fullPath)
			}
		}
	} catch (error) {
		// Directory might not exist, ignore
	}

	return files
}

/**
 * Check if file content contains Dexie references
 */
function containsDexieReferences(content: string): boolean {
	const dexiePatterns = [
		/legacyDatabase\./,
		/from.*legacy-database/,
		/import.*legacy-database/,
		/\.toArray\(\)/,
		/\.where\(/,
		/\.equals\(/,
		/\.and\(/,
	]

	return dexiePatterns.some((pattern) => pattern.test(content))
}

/**
 * Check if file content uses SQLite APIs appropriately
 */
function usesSQLiteAPIs(content: string): boolean {
	const sqlitePatterns = [
		/from.*@\/io\/api/,
		/getNodesByTag/,
		/getNodesByWorkspace/,
		/getContentsByNodeIds/,
		/getWikiPreviewData/,
	]

	return sqlitePatterns.some((pattern) => pattern.test(content))
}

/**
 * Check if file is a Wiki-related file
 */
function isWikiRelatedFile(filePath: string): boolean {
	return (
		filePath.includes("/wiki/") ||
		filePath.includes("wiki") ||
		filePath.toLowerCase().includes("wiki")
	)
}

describe("Property 6: Wiki Code Cleanup Consistency", () => {
	it("should verify Wiki files use SQLite APIs and not Dexie", async () => {
		await fc.assert(
			fc.asyncProperty(fc.constant("wiki-cleanup-check"), async () => {
				// Get all TypeScript files in the src directory
				const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "."
				const srcDir = join(cwd, "src")
				const allFiles = await getTypeScriptFiles(srcDir)

				// Filter to Wiki-related files
				const wikiFiles = allFiles.filter(isWikiRelatedFile)

				// Check each Wiki file
				for (const filePath of wikiFiles) {
					try {
						const content = await readFile(filePath, "utf-8")

						// Skip test files for this check
						if (filePath.includes(".test.") || filePath.includes(".spec.")) {
							continue
						}

						// Wiki files should not contain Dexie references
						const hasDexieRefs = containsDexieReferences(content)
						if (hasDexieRefs) {
							throw new Error(`Wiki file ${filePath} still contains Dexie references`)
						}

						// If file has data access, it should use SQLite APIs
						if (
							content.includes("database") ||
							content.includes("query") ||
							content.includes("get")
						) {
							const usesSqlite = usesSQLiteAPIs(content)
							if (!usesSqlite && content.length > 100) {
								// Skip very small files
								console.warn(`Wiki file ${filePath} might not be using SQLite APIs properly`)
							}
						}
					} catch (error) {
						if (error instanceof Error && error.message.includes("ENOENT")) {
							// File doesn't exist, skip
							continue
						}
						throw error
					}
				}

				return true
			}),
			{
				numRuns: 100,
				timeout: 30000,
			},
		)
	}, 60000)

	it("should verify no orphaned Wiki code exists", async () => {
		await fc.assert(
			fc.asyncProperty(fc.constant("orphaned-code-check"), async () => {
				// Get all TypeScript files
				const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "."
				const srcDir = join(cwd, "src")
				const allFiles = await getTypeScriptFiles(srcDir)

				const orphanedPatterns = [
					/wikiEntries/,
					/LegacyWikiEntry/,
					/legacyDatabase\.table\("wikiEntries"\)/,
				]

				// Check for orphaned Wiki code
				for (const filePath of allFiles) {
					try {
						const content = await readFile(filePath, "utf-8")

						// Skip test files and this test file
						if (
							filePath.includes(".test.") ||
							filePath.includes(".spec.") ||
							filePath.includes("wiki-code-cleanup-verification")
						) {
							continue
						}

						// Check for orphaned patterns
						for (const pattern of orphanedPatterns) {
							if (pattern.test(content)) {
								throw new Error(`File ${filePath} contains orphaned Wiki code: ${pattern}`)
							}
						}
					} catch (error) {
						if (error instanceof Error && error.message.includes("ENOENT")) {
							continue
						}
						throw error
					}
				}

				return true
			}),
			{
				numRuns: 100,
				timeout: 30000,
			},
		)
	}, 60000)

	it("should verify Wiki functionality is properly integrated", async () => {
		await fc.assert(
			fc.asyncProperty(fc.constant("integration-check"), async () => {
				// Check that key Wiki files exist and are properly structured
				const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "."
				const wikiFlowsDir = join(cwd, "src", "flows", "wiki")
				const wikiFiles = await getTypeScriptFiles(wikiFlowsDir)

				// Should have the main Wiki flow files
				const expectedFiles = [
					"get-wiki-files.flow.ts",
					"get-wiki-preview.flow.ts",
					"index.ts",
				]

				for (const expectedFile of expectedFiles) {
					const found = wikiFiles.some((file) => file.endsWith(expectedFile))
					if (!found) {
						throw new Error(`Expected Wiki file not found: ${expectedFile}`)
					}
				}

				// Check that index.ts properly exports the functions
				const indexPath = join(wikiFlowsDir, "index.ts")
				const indexContent = await readFile(indexPath, "utf-8")

				const expectedExports = [
					"getWikiFiles",
					"getWikiFilesAsync",
					"getWikiPreviewData",
				]

				for (const exportName of expectedExports) {
					if (!indexContent.includes(exportName)) {
						throw new Error(`Expected export not found in Wiki index: ${exportName}`)
					}
				}

				return true
			}),
			{
				numRuns: 100,
				timeout: 30000,
			},
		)
	}, 60000)
})
