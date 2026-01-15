/**
 * 命名检查辅助函数
 * Naming convention helper functions for ESLint rules
 */

import type { NamingConfig } from "../types/config.types.js"
import { DEFAULT_NAMING_CONFIG } from "../types/config.types.js"

/**
 * 检查变量名是否符合最小长度要求
 */
export function isValidVariableLength(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): boolean {
	// 允许的短变量名
	if (config.allowedShortNames.includes(name)) {
		return true
	}
	return name.length >= config.minVariableLength
}

/**
 * 检查函数名是否以动词开头
 */
export function startsWithVerb(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): boolean {
	const lowerName = name.toLowerCase()
	return config.verbPrefixes.some((verb) => lowerName.startsWith(verb.toLowerCase()))
}

/**
 * 检查布尔变量名是否有正确的前缀
 */
export function hasValidBooleanPrefix(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): boolean {
	const lowerName = name.toLowerCase()
	return config.booleanPrefixes.some((prefix) => lowerName.startsWith(prefix.toLowerCase()))
}

/**
 * 检查事件处理器名是否有正确的前缀
 */
export function hasValidEventHandlerPrefix(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): boolean {
	const lowerName = name.toLowerCase()
	return config.eventHandlerPrefixes.some((prefix) => lowerName.startsWith(prefix.toLowerCase()))
}

/**
 * 检查常量名是否为 SCREAMING_SNAKE_CASE
 */
export function isScreamingSnakeCase(name: string): boolean {
	return /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(name)
}

/**
 * 检查名称是否为 camelCase
 */
export function isCamelCase(name: string): boolean {
	return /^[a-z][a-zA-Z0-9]*$/.test(name)
}

/**
 * 检查名称是否为 PascalCase
 */
export function isPascalCase(name: string): boolean {
	return /^[A-Z][a-zA-Z0-9]*$/.test(name)
}

/**
 * 检查名称是否为 kebab-case
 */
export function isKebabCase(name: string): boolean {
	return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)
}

/**
 * 检查名称是否为 snake_case
 */
export function isSnakeCase(name: string): boolean {
	return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)
}

/**
 * 检查名称是否以下划线开头（私有）
 */
export function isPrivateName(name: string): boolean {
	return name.startsWith("_")
}

/**
 * 检查 Hook 名称是否以 use 开头
 */
export function isValidHookName(name: string): boolean {
	return /^use[A-Z]/.test(name)
}

/**
 * 检查组件名称是否为 PascalCase
 */
export function isValidComponentName(name: string): boolean {
	return isPascalCase(name)
}

/**
 * 检查类型/接口名称是否为 PascalCase
 */
export function isValidTypeName(name: string): boolean {
	return isPascalCase(name)
}

/**
 * 将 camelCase 转换为 kebab-case
 */
export function camelToKebab(name: string): string {
	return name
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase()
}

/**
 * 将 kebab-case 转换为 camelCase
 */
export function kebabToCamel(name: string): string {
	return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 将 snake_case 转换为 camelCase
 */
export function snakeToCamel(name: string): string {
	return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 将 camelCase 转换为 SCREAMING_SNAKE_CASE
 */
export function camelToScreamingSnake(name: string): string {
	return name
		.replace(/([a-z])([A-Z])/g, "$1_$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
		.toUpperCase()
}

/**
 * 获取建议的布尔变量名
 */
export function suggestBooleanName(name: string): string {
	// 如果已经有前缀，返回原名
	if (hasValidBooleanPrefix(name)) {
		return name
	}

	// 尝试添加 is 前缀
	const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
	return `is${capitalizedName}`
}

/**
 * 获取建议的事件处理器名
 */
export function suggestEventHandlerName(name: string): string {
	// 如果已经有前缀，返回原名
	if (hasValidEventHandlerPrefix(name)) {
		return name
	}

	// 尝试添加 handle 前缀
	const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
	return `handle${capitalizedName}`
}

/**
 * 获取建议的常量名
 */
export function suggestConstantName(name: string): string {
	if (isScreamingSnakeCase(name)) {
		return name
	}
	return camelToScreamingSnake(name)
}

/**
 * 检查文件名是否符合 kebab-case
 */
export function isValidFileName(filename: string): boolean {
	// 移除扩展名
	const nameWithoutExt = filename.replace(/\.[^.]+$/, "")
	// 移除常见后缀如 .view.fn, .pipe, .flow 等
	const baseName = nameWithoutExt
		.replace(/\.(view|container|pipe|flow|action|api|storage|state|util|queries)\.fn$/, "")
		.replace(/\.(view|container|pipe|flow|action|api|storage|state|util|queries)$/, "")

	return isKebabCase(baseName)
}

/**
 * 检查目录名是否符合 kebab-case
 */
export function isValidDirectoryName(dirname: string): boolean {
	return isKebabCase(dirname)
}

/**
 * 获取变量名的问题描述
 */
export function getVariableNameIssue(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): string | null {
	if (!isValidVariableLength(name, config)) {
		return `变量名 "${name}" 太短（最少 ${config.minVariableLength} 个字符）`
	}
	return null
}

/**
 * 获取函数名的问题描述
 */
export function getFunctionNameIssue(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): string | null {
	if (!startsWithVerb(name, config)) {
		return `函数名 "${name}" 应该以动词开头`
	}
	return null
}

/**
 * 获取布尔变量名的问题描述
 */
export function getBooleanNameIssue(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): string | null {
	if (!hasValidBooleanPrefix(name, config)) {
		const suggested = suggestBooleanName(name)
		return `布尔变量 "${name}" 应该以 is/has/can/should 等前缀开头，建议: "${suggested}"`
	}
	return null
}

/**
 * 获取常量名的问题描述
 */
export function getConstantNameIssue(name: string): string | null {
	if (!isScreamingSnakeCase(name)) {
		const suggested = suggestConstantName(name)
		return `常量 "${name}" 应该使用 SCREAMING_SNAKE_CASE，建议: "${suggested}"`
	}
	return null
}

/**
 * 获取事件处理器名的问题描述
 */
export function getEventHandlerNameIssue(
	name: string,
	config: NamingConfig = DEFAULT_NAMING_CONFIG,
): string | null {
	if (!hasValidEventHandlerPrefix(name, config)) {
		const suggested = suggestEventHandlerName(name)
		return `事件处理器 "${name}" 应该以 handle/on 开头，建议: "${suggested}"`
	}
	return null
}
