/**
 * 架构层级工具函数
 * Architecture layer utility functions for ESLint rules
 */

import path from "path"
import {
	CONTAINER_EXTRA_DEPENDENCIES,
	DEPRECATED_DIRECTORIES,
	LEGACY_LAYER_DEPENDENCIES,
	STRICT_LAYER_DEPENDENCIES,
} from "../types/config.types.js"
import type { ArchitectureLayer } from "../types/rule.types.js"

/**
 * 判断文件所属架构层级
 */
export function getArchitectureLayer(filename: string): ArchitectureLayer | null {
	const normalizedPath = path.normalize(filename)

	const layerPatterns: [string, ArchitectureLayer][] = [
		["/src/views/", "views"],
		["/src/hooks/", "hooks"],
		["/src/flows/", "flows"],
		["/src/pipes/", "pipes"],
		["/src/io/", "io"],
		["/src/state/", "state"],
		["/src/utils/", "utils"],
		["/src/types/", "types"],
		["/src/queries/", "queries"],
		["/src/routes/", "routes"],
	]

	for (const [pattern, layer] of layerPatterns) {
		if (normalizedPath.includes(pattern)) {
			return layer
		}
	}

	return null
}

/**
 * 判断是否为容器组件
 */
export function isContainerComponent(filename: string | undefined): boolean {
	return filename?.includes(".container.fn.tsx") ?? false
}

/**
 * 判断是否为视图组件
 */
export function isViewComponent(filename: string | undefined): boolean {
	return filename?.includes(".view.fn.tsx") ?? false
}

/**
 * 判断是否为测试文件
 */
export function isTestFile(filename: string): boolean {
	return /\.(test|spec)\.(ts|tsx)$/.test(filename)
}

/**
 * 从导入路径提取层级
 */
export function getImportLayer(importPath: string): ArchitectureLayer | null {
	const match = importPath.match(/@\/([^/]+)/)
	if (!match) return null

	const segment = match[1] as ArchitectureLayer
	return STRICT_LAYER_DEPENDENCIES[segment] !== undefined ? segment : null
}

/**
 * 获取允许的依赖层级（严格模式）
 */
export function getAllowedDependencies(
	layer: ArchitectureLayer,
	strict: boolean = true,
): ArchitectureLayer[] {
	const dependencies = strict ? STRICT_LAYER_DEPENDENCIES : LEGACY_LAYER_DEPENDENCIES
	return dependencies[layer] || []
}

/**
 * 获取容器组件额外允许的依赖
 */
export function getContainerExtraDependencies(): ArchitectureLayer[] {
	return CONTAINER_EXTRA_DEPENDENCIES
}

/**
 * 检查导入是否违反层级依赖（严格模式）
 */
export function isLayerViolation(
	currentLayer: ArchitectureLayer,
	importLayer: ArchitectureLayer,
	isContainer: boolean = false,
	strict: boolean = true,
): boolean {
	const allowed = getAllowedDependencies(currentLayer, strict)

	if (isContainer && currentLayer === "views") {
		return ![...allowed, ...CONTAINER_EXTRA_DEPENDENCIES].includes(importLayer)
	}

	return !allowed.includes(importLayer)
}

/**
 * 获取层级违规的详细信息
 */
export function getLayerViolationDetails(
	currentLayer: ArchitectureLayer,
	importLayer: ArchitectureLayer,
	strict: boolean = true,
): {
	allowed: ArchitectureLayer[]
	message: string
	suggestion: string
} {
	const allowed = getAllowedDependencies(currentLayer, strict)

	return {
		allowed,
		message: `${currentLayer}/ 层不能依赖 ${importLayer}/ 层`,
		suggestion: `${currentLayer}/ 只能依赖: ${allowed.join(", ") || "无"}`,
	}
}

/**
 * 检查是否为废弃目录导入
 */
export function isDeprecatedDirectoryImport(importPath: string): boolean {
	const match = importPath.match(/@\/([^/]+)/)
	if (!match) return false

	const segment = match[1]
	return DEPRECATED_DIRECTORIES.includes(segment as (typeof DEPRECATED_DIRECTORIES)[number])
}

/**
 * 获取废弃目录的迁移建议
 */
export function getDeprecatedDirectoryMigration(directory: string): string {
	const migrations: Record<string, string> = {
		actions: "flows/",
		components: "views/",
		fn: "pipes/, utils/, flows/, views/",
		lib: "utils/",
		stores: "state/",
	}

	return migrations[directory] || "请参考架构文档"
}

/**
 * 检查是否为外部导入
 */
export function isExternalImport(importPath: string): boolean {
	return !importPath.startsWith(".") && !importPath.startsWith("@/")
}

/**
 * 检查是否为内部导入
 */
export function isInternalImport(importPath: string): boolean {
	return importPath.startsWith("./") || importPath.startsWith("../") || importPath.startsWith("@/")
}

/**
 * 检查是否为相对导入
 */
export function isRelativeImport(importPath: string): boolean {
	return importPath.startsWith("./") || importPath.startsWith("../")
}

/**
 * 检查是否为别名导入
 */
export function isAliasImport(importPath: string): boolean {
	return importPath.startsWith("@/")
}

/**
 * 获取相对导入的深度
 */
export function getRelativeImportDepth(importPath: string): number {
	const matches = importPath.match(/\.\.\//g)
	return matches ? matches.length : 0
}

/**
 * 检查相对导入是否超过允许的深度
 */
export function isRelativeImportTooDeep(importPath: string, maxDepth: number = 2): boolean {
	return getRelativeImportDepth(importPath) > maxDepth
}

/**
 * 获取预期的测试文件路径
 */
export function getExpectedTestFilePath(sourceFilePath: string): string {
	const ext = path.extname(sourceFilePath)
	const basePath = sourceFilePath.replace(ext, "")
	return `${basePath}.test${ext}`
}

/**
 * 检查文件是否在正确的目录
 */
export function isFileInCorrectDirectory(
	filename: string,
	expectedLayer: ArchitectureLayer,
): boolean {
	const actualLayer = getArchitectureLayer(filename)
	return actualLayer === expectedLayer
}

/**
 * 获取文件应该所在的目录
 */
export function getSuggestedDirectory(
	filename: string,
	fileType: "pipe" | "flow" | "api" | "state" | "hook" | "view" | "util",
): string {
	const typeToLayer: Record<string, string> = {
		api: "io/api",
		flow: "flows",
		hook: "hooks",
		pipe: "pipes",
		state: "state",
		util: "utils",
		view: "views",
	}

	return `src/${typeToLayer[fileType]}/`
}

/**
 * 检查 index.ts 是否只包含重导出
 */
export function isIndexFilePattern(filename: string): boolean {
	return /\/index\.(ts|tsx)$/.test(filename)
}

/**
 * 获取层级的中文名称
 */
export function getLayerChineseName(layer: ArchitectureLayer): string {
	const names: Record<ArchitectureLayer, string> = {
		flows: "流程层",
		hooks: "绑定层",
		io: "IO 层",
		pipes: "管道层",
		queries: "查询层",
		routes: "路由层",
		state: "状态层",
		types: "类型层",
		utils: "工具层",
		views: "视图层",
	}

	return names[layer] || layer
}

/**
 * 获取层级的描述
 */
export function getLayerDescription(layer: ArchitectureLayer): string {
	const descriptions: Record<ArchitectureLayer, string> = {
		flows: "业务流程，组合 pipes 和 io",
		hooks: "React 生命周期绑定，连接 flows 和 state",
		io: "外部交互（API、存储、文件）",
		pipes: "纯数据转换函数，无副作用",
		queries: "TanStack Query hooks",
		routes: "路由定义",
		state: "应用状态管理（Zustand）",
		types: "类型定义",
		utils: "通用工具函数",
		views: "UI 渲染组件，只能依赖 hooks 和 types",
	}

	return descriptions[layer] || ""
}
