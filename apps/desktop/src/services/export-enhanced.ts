/**
 * 增强的导出服务 - 支持 Tauri 和浏览器环境
 * Enhanced Export Service - Supports both Tauri and Browser environments
 */

import { saveAs } from "file-saver";
import logger from "@/log";
import type { ExportOptions, ExportFormat } from "./export";
import {
	exportToTxt as browserExportToTxt,
	exportToWord as browserExportToWord,
	exportToPdf as browserExportToPdf,
	exportToEpub as browserExportToEpub,
} from "./export";

// Tauri API imports - these will be available only in Tauri environment
let tauriWriteFile: any = null;
let tauriSaveDialog: any = null;

// Lazy load Tauri APIs to avoid errors in browser environment
async function loadTauriAPIs() {
	try {
		if (typeof window !== "undefined" && (window as any).__TAURI__) {
			// For now, we'll implement a fallback that uses the browser download
			// In the future, this can be enhanced with proper Tauri file system APIs
			logger.info("Tauri environment detected, but using browser fallback for file operations");
			return false; // Use browser fallback for now
		}
	} catch (error) {
		logger.warn("Failed to load Tauri APIs:", error);
	}
	return false;
}

/**
 * 检测当前运行环境
 * Detect current runtime environment
 */
export function detectEnvironment(): "tauri" | "browser" {
	if (typeof window !== "undefined") {
		// Check for Tauri-specific globals
		return (window as any).__TAURI__ ? "tauri" : "browser";
	}
	return "browser";
}

/**
 * 导出结果接口
 * Export result interface
 */
export interface ExportResult {
	success: boolean;
	filePath?: string;
	error?: string;
}

/**
 * 导出内容接口
 * Export content interface
 */
export interface ExportContent {
	title: string;
	content: string | Blob;
	metadata?: {
		author?: string;
		format: ExportFormat;
		timestamp: Date;
	};
}

/**
 * 文件对话框配置
 * File dialog configuration
 */
export interface FileDialogConfig {
	defaultPath?: string;
	filters?: Array<{
		name: string;
		extensions: string[];
	}>;
}

/**
 * 统一导出服务类
 * Unified Export Service Class
 */
export class UniversalExportService {
	private environment: "tauri" | "browser";
	private tauriReady = false;

	constructor() {
		this.environment = detectEnvironment();
		this.initializeTauri();
	}

	private async initializeTauri() {
		if (this.environment === "tauri") {
			this.tauriReady = await loadTauriAPIs();
		}
	}

	/**
	 * 获取当前环境
	 * Get current environment
	 */
	getEnvironment(): "tauri" | "browser" {
		return this.environment;
	}

	/**
	 * 检查 Tauri 是否可用
	 * Check if Tauri is available
	 */
	isTauriReady(): boolean {
		return this.tauriReady;
	}

	/**
	 * 显示文件保存对话框 (仅 Tauri)
	 * Show file save dialog (Tauri only)
	 */
	async showSaveDialog(config: FileDialogConfig): Promise<string | null> {
		// For now, return null to use browser fallback
		// This can be implemented later with proper Tauri APIs
		logger.debug("Save dialog requested but using browser fallback");
		return null;
	}

	/**
	 * 保存文件到本地文件系统 (Tauri)
	 * Save file to local file system (Tauri)
	 */
	async saveFileToSystem(
		filePath: string,
		content: string | Uint8Array,
	): Promise<ExportResult> {
		// For now, return error to use browser fallback
		// This can be implemented later with proper Tauri APIs
		return {
			success: false,
			error: "Tauri file system API not yet implemented - using browser fallback",
		};
	}

	/**
	 * 浏览器环境下载文件
	 * Download file in browser environment
	 */
	async downloadInBrowser(
		filename: string,
		content: string | Blob,
		mimeType?: string,
	): Promise<ExportResult> {
		try {
			let blob: Blob;
			if (content instanceof Blob) {
				blob = content;
			} else {
				blob = new Blob([content], { type: mimeType || "text/plain" });
			}

			saveAs(blob, filename);
			return {
				success: true,
				filePath: filename,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to download file: ${error}`,
			};
		}
	}

	/**
	 * 统一导出接口
	 * Unified export interface
	 */
	async exportContent(
		content: ExportContent,
		options?: {
			showDialog?: boolean;
			defaultPath?: string;
		},
	): Promise<ExportResult> {
		const { title, content: fileContent, metadata } = content;
		const format = metadata?.format || "txt";
		const timestamp = metadata?.timestamp || new Date();
		
		// Generate filename
		const sanitizedTitle = title.replace(/[^\w\s-]/g, "").trim();
		const defaultFilename = `${sanitizedTitle || "export"}_${timestamp.toISOString().split("T")[0]}.${format}`;

		// For now, always use browser export but with enhanced UX for Tauri
		return this.exportForBrowser(fileContent, format, defaultFilename);
	}

	/**
	 * Tauri 环境导出
	 * Export for Tauri environment
	 */
	private async exportForTauri(
		content: string | Blob,
		format: ExportFormat,
		defaultFilename: string,
		options?: {
			showDialog?: boolean;
			defaultPath?: string;
		},
	): Promise<ExportResult> {
		try {
			let filePath: string | null = null;

			// Show save dialog if requested
			if (options?.showDialog !== false) {
				const dialogConfig: FileDialogConfig = {
					defaultPath: options?.defaultPath || defaultFilename,
					filters: this.getFileFilters(format),
				};

				filePath = await this.showSaveDialog(dialogConfig);
				if (!filePath) {
					return {
						success: false,
						error: "User cancelled save dialog",
					};
				}
			} else {
				filePath = options?.defaultPath || defaultFilename;
			}

			// Convert content to appropriate format for file system
			let fileContent: string | Uint8Array;
			if (content instanceof Blob) {
				const arrayBuffer = await content.arrayBuffer();
				fileContent = new Uint8Array(arrayBuffer);
			} else {
				fileContent = content;
			}

			return await this.saveFileToSystem(filePath, fileContent);
		} catch (error) {
			return {
				success: false,
				error: `Tauri export failed: ${error}`,
			};
		}
	}

	/**
	 * 浏览器环境导出
	 * Export for browser environment
	 */
	private async exportForBrowser(
		content: string | Blob,
		format: ExportFormat,
		filename: string,
	): Promise<ExportResult> {
		const mimeType = this.getMimeType(format);
		return this.downloadInBrowser(filename, content, mimeType);
	}

	/**
	 * 获取文件过滤器
	 * Get file filters for dialog
	 */
	private getFileFilters(format: ExportFormat) {
		const filters = {
			txt: [{ name: "Text Files", extensions: ["txt"] }],
			docx: [{ name: "Word Documents", extensions: ["docx"] }],
			pdf: [{ name: "PDF Files", extensions: ["pdf"] }],
			epub: [{ name: "EPUB Files", extensions: ["epub"] }],
		};

		return filters[format] || [{ name: "All Files", extensions: ["*"] }];
	}

	/**
	 * 获取 MIME 类型
	 * Get MIME type for format
	 */
	private getMimeType(format: ExportFormat): string {
		const mimeTypes = {
			txt: "text/plain",
			docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			pdf: "application/pdf",
			epub: "application/epub+zip",
		};

		return mimeTypes[format] || "application/octet-stream";
	}

	/**
	 * 导出项目 - 增强版本
	 * Export project - Enhanced version
	 */
	async exportProject(
		projectId: string,
		format: ExportFormat,
		exportOptions?: ExportOptions,
		saveOptions?: {
			showDialog?: boolean;
			defaultPath?: string;
		},
	): Promise<ExportResult> {
		try {
			// Use browser export methods with enhanced UX
			switch (format) {
				case "txt":
					await browserExportToTxt(projectId, exportOptions);
					break;
				case "docx":
					await browserExportToWord(projectId, exportOptions);
					break;
				case "pdf":
					await browserExportToPdf(projectId, exportOptions);
					break;
				case "epub":
					await browserExportToEpub(projectId, exportOptions);
					break;
				default:
					throw new Error(`Unsupported format: ${format}`);
			}

			return {
				success: true,
				filePath: `export.${format}`,
			};
		} catch (error) {
			return {
				success: false,
				error: `Export failed: ${error}`,
			};
		}
	}

	/**
	 * 生成导出内容
	 * Generate export content
	 */
	private async generateExportContent(
		projectId: string,
		format: ExportFormat,
		options?: ExportOptions,
	): Promise<ExportContent> {
		// Import the content generation functions from the original export service
		const { getProjectContent, generateExportBlob } = await import("./export-content-generator");
		
		const { project, chapterContents } = await getProjectContent(projectId);
		const blob = await generateExportBlob(project, chapterContents, format, options);

		return {
			title: project.title || "Untitled",
			content: blob,
			metadata: {
				author: project.author,
				format,
				timestamp: new Date(),
			},
		};
	}
}

// Export singleton instance
export const universalExportService = new UniversalExportService();

// Re-export types for convenience
export type { ExportOptions, ExportFormat } from "./export";