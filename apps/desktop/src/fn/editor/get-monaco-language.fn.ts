/**
 * @file get-monaco-language.fn.ts
 * @description 根据文件扩展名获取 Monaco 编辑器语言的纯函数
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12
 */

import { getFileExtension } from "./get-editor-type.fn";

// ==============================
// Constants
// ==============================

/**
 * 扩展名到 Monaco 语言 ID 的映射
 */
const EXTENSION_TO_MONACO_LANGUAGE: Record<string, string> = {
	// JavaScript / TypeScript
	".js": "javascript",
	".jsx": "javascript",
	".ts": "typescript",
	".tsx": "typescript",

	// Web
	".html": "html",
	".htm": "html",
	".css": "css",
	".scss": "scss",
	".less": "less",

	// Data formats
	".json": "json",
	".yaml": "yaml",
	".yml": "yaml",
	".toml": "ini", // Monaco 没有原生 TOML 支持，使用 ini
	".xml": "xml",

	// Markdown
	".md": "markdown",
	".markdown": "markdown",

	// Shell
	".sh": "shell",
	".bash": "shell",
	".zsh": "shell",

	// Python
	".py": "python",
	".pyw": "python",

	// Rust
	".rs": "rust",

	// Go
	".go": "go",

	// Java
	".java": "java",

	// C / C++
	".c": "c",
	".h": "c",
	".cpp": "cpp",
	".cc": "cpp",
	".cxx": "cpp",
	".hpp": "cpp",
	".hxx": "cpp",

	// SQL
	".sql": "sql",

	// GraphQL
	".graphql": "graphql",
	".gql": "graphql",

	// Dockerfile
	".dockerfile": "dockerfile",

	// Plain text
	".txt": "plaintext",

	// Mermaid / PlantUML（作为纯文本处理）
	".mermaid": "plaintext",
	".plantuml": "plaintext",
	".puml": "plaintext",

	// Grain（作为 JSON 处理，因为 Lexical 状态是 JSON）
	".grain": "json",

	// Excalidraw（作为 JSON 处理）
	".excalidraw": "json",
};

// ==============================
// Main Function
// ==============================

/**
 * 根据文件名获取 Monaco 编辑器语言 ID
 *
 * @param filename - 文件名
 * @returns Monaco 语言 ID，未知扩展名返回 "plaintext"
 *
 * @example
 * getMonacoLanguage("script.js") // "javascript"
 * getMonacoLanguage("styles.css") // "css"
 * getMonacoLanguage("config.yaml") // "yaml"
 * getMonacoLanguage("unknown.xyz") // "plaintext"
 */
export const getMonacoLanguage = (filename: string): string => {
	const extension = getFileExtension(filename);

	if (!extension) {
		return "plaintext";
	}

	return EXTENSION_TO_MONACO_LANGUAGE[extension] ?? "plaintext";
};

/**
 * 获取所有支持的 Monaco 语言列表
 *
 * @returns 支持的语言 ID 数组（去重）
 */
export const getSupportedMonacoLanguages = (): string[] => {
	const languages = new Set(Object.values(EXTENSION_TO_MONACO_LANGUAGE));
	return Array.from(languages).sort();
};

/**
 * 检查扩展名是否有对应的 Monaco 语言支持
 *
 * @param extension - 扩展名（包含点号）
 * @returns 是否支持
 */
export const isMonacoLanguageSupported = (extension: string): boolean => {
	return extension.toLowerCase() in EXTENSION_TO_MONACO_LANGUAGE;
};
