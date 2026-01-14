/**
 * @file fn/import/import.json.fn.ts
 * @description JSON 导入纯函数
 *
 * 功能说明：
 * - 解析 JSON 备份数据
 * - 验证导入数据结构
 * - 生成 ID 映射
 *
 * 这些函数无副作用，可组合，可测试。
 */

import * as E from "fp-ts/Either";
import { v4 as uuidv4 } from "uuid";
import type { NodeInterface } from "@/types/node";
import type { WorkspaceInterface } from "@/types/workspace";

// ==============================
// Types
// ==============================

/**
 * 导出数据包结构
 */
export interface ExportBundle {
	readonly version: number;
	readonly projects: readonly WorkspaceInterface[];
	readonly nodes: readonly NodeInterface[];
	readonly contents: readonly ContentData[];
	/** @deprecated Wiki entries are now stored as file nodes with "wiki" tag */
	readonly wikiEntries?: readonly unknown[];
	readonly attachments: readonly AttachmentData[];
}

/**
 * 内容数据结构
 */
export interface ContentData {
	readonly id: string;
	readonly nodeId: string;
	readonly content: string;
	readonly contentType: string;
	readonly lastEdit: string;
}

/**
 * 附件数据结构
 */
export interface AttachmentData {
	readonly id: string;
	readonly project?: string;
	readonly [key: string]: unknown;
}

/**
 * JSON 导入选项
 */
export interface JsonImportOptions {
	/** 是否保留原始 ID */
	readonly keepIds?: boolean;
}

/**
 * 导入错误类型
 */
export type JsonImportError =
	| { readonly type: "PARSE_ERROR"; readonly message: string }
	| { readonly type: "INVALID_FORMAT"; readonly message: string }
	| { readonly type: "VERSION_ERROR"; readonly message: string };

/**
 * 解析后的导入数据
 */
export interface ParsedImportData {
	readonly workspaces: readonly WorkspaceInterface[];
	readonly nodes: readonly NodeInterface[];
	readonly contents: readonly ContentData[];
	readonly attachments: readonly AttachmentData[];
	readonly idMap: ReadonlyMap<string, string>;
}

// ==============================
// Pure Functions
// ==============================

/**
 * 解析 JSON 字符串为导出数据包
 *
 * @param jsonText - JSON 字符串
 * @returns Either<JsonImportError, Partial<ExportBundle>>
 */
export function parseJsonBundle(
	jsonText: string,
): E.Either<JsonImportError, Partial<ExportBundle>> {
	return E.tryCatch(
		() => JSON.parse(jsonText) as Partial<ExportBundle>,
		(error) => ({
			type: "PARSE_ERROR" as const,
			message: `JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`,
		}),
	);
}

/**
 * 验证导出数据包结构
 *
 * @param data - 部分导出数据包
 * @returns Either<JsonImportError, ExportBundle>
 */
export function validateBundle(
	data: Partial<ExportBundle>,
): E.Either<JsonImportError, ExportBundle> {
	// 检查必要字段
	if (!data.projects && !data.nodes) {
		return E.left({
			type: "INVALID_FORMAT",
			message: "无效的备份格式：缺少 projects 或 nodes 字段",
		});
	}

	// 构建完整的数据包
	const bundle: ExportBundle = {
		version: data.version ?? 1,
		projects: data.projects ?? [],
		nodes: data.nodes ?? [],
		contents: (data.contents ?? []) as ContentData[],
		attachments: (data.attachments ?? []) as AttachmentData[],
	};

	return E.right(bundle);
}

/**
 * 生成 ID 映射
 *
 * @param bundle - 导出数据包
 * @param keepIds - 是否保留原始 ID
 * @returns ID 映射表
 */
export function generateIdMap(
	bundle: ExportBundle,
	keepIds: boolean,
): Map<string, string> {
	const idMap = new Map<string, string>();

	if (keepIds) {
		// 保留原始 ID
		for (const w of bundle.projects) {
			idMap.set(w.id, w.id);
		}
		for (const n of bundle.nodes) {
			idMap.set(n.id, n.id);
		}
	} else {
		// 生成新 ID
		for (const w of bundle.projects) {
			idMap.set(w.id, uuidv4());
		}
		for (const n of bundle.nodes) {
			idMap.set(n.id, uuidv4());
		}
	}

	return idMap;
}

/**
 * 转换工作区数据（应用 ID 映射）
 *
 * @param workspaces - 原始工作区数组
 * @param idMap - ID 映射表
 * @returns 转换后的工作区数组
 */
export function transformWorkspaces(
	workspaces: readonly WorkspaceInterface[],
	idMap: ReadonlyMap<string, string>,
): WorkspaceInterface[] {
	return workspaces.map((w) => ({
		...w,
		id: idMap.get(w.id) ?? w.id,
	}));
}

/**
 * 转换节点数据（应用 ID 映射）
 *
 * @param nodes - 原始节点数组
 * @param idMap - ID 映射表
 * @returns 转换后的节点数组
 */
export function transformNodes(
	nodes: readonly NodeInterface[],
	idMap: ReadonlyMap<string, string>,
): NodeInterface[] {
	return nodes.map((n) => ({
		...n,
		id: idMap.get(n.id) ?? n.id,
		workspace: idMap.get(n.workspace) ?? n.workspace,
		parent: n.parent ? (idMap.get(n.parent) ?? n.parent) : null,
	}));
}

/**
 * 转换内容数据（应用 ID 映射）
 *
 * @param contents - 原始内容数组
 * @param idMap - ID 映射表
 * @param keepIds - 是否保留原始 ID
 * @returns 转换后的内容数组
 */
export function transformContents(
	contents: readonly ContentData[],
	idMap: ReadonlyMap<string, string>,
	keepIds: boolean,
): ContentData[] {
	return contents.map((c) => ({
		...c,
		id: keepIds ? c.id : uuidv4(),
		nodeId: idMap.get(c.nodeId) ?? c.nodeId,
	}));
}

/**
 * 转换附件数据（应用 ID 映射）
 *
 * @param attachments - 原始附件数组
 * @param idMap - ID 映射表
 * @returns 转换后的附件数组
 */
export function transformAttachments(
	attachments: readonly AttachmentData[],
	idMap: ReadonlyMap<string, string>,
): AttachmentData[] {
	return attachments.map((a) => ({
		...a,
		project:
			a.project && idMap.has(a.project) ? idMap.get(a.project) : a.project,
	}));
}

/**
 * 解析并转换导入数据
 *
 * @param jsonText - JSON 字符串
 * @param options - 导入选项
 * @returns Either<JsonImportError, ParsedImportData>
 */
export function parseImportData(
	jsonText: string,
	options: JsonImportOptions = {},
): E.Either<JsonImportError, ParsedImportData> {
	const { keepIds = false } = options;

	// 解析 JSON
	const parseResult = parseJsonBundle(jsonText);
	if (E.isLeft(parseResult)) {
		return parseResult;
	}

	// 验证数据结构
	const validateResult = validateBundle(parseResult.right);
	if (E.isLeft(validateResult)) {
		return validateResult;
	}

	const bundle = validateResult.right;

	// 生成 ID 映射
	const idMap = generateIdMap(bundle, keepIds);

	// 转换数据
	const workspaces = transformWorkspaces(bundle.projects, idMap);
	const nodes = transformNodes(bundle.nodes, idMap);
	const contents = transformContents(bundle.contents, idMap, keepIds);
	const attachments = transformAttachments(bundle.attachments, idMap);

	return E.right({
		workspaces,
		nodes,
		contents,
		attachments,
		idMap,
	});
}
