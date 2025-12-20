/**
 * Import/Export Service
 * Provides data import and export functionality for workspaces
 *
 * Note: This service uses direct database access for bulk operations
 * (bulkPut) that are not available through Repository pattern.
 * Repository pattern is used where applicable.
 *
 * Requirements: 6.2
 */
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { database } from "@/db/database";
import {
	ContentRepository,
	WorkspaceRepository,
	NodeRepository,
	AttachmentRepository,
	type WorkspaceInterface,
	type NodeInterface,
} from "@/db/models";

// Re-export pure functions from utils
export {
	extractText,
	triggerDownload,
	triggerBlobDownload,
	readFileAsText,
} from "./import-export.utils";

import { extractText } from "./import-export.utils";

export interface ExportBundle {
	version: number;
	projects: WorkspaceInterface[];
	nodes: NodeInterface[];
	contents: unknown[];
	/** @deprecated Wiki entries are now stored as file nodes with "wiki" tag */
	wikiEntries?: unknown[];
	attachments: unknown[];
}

/**
 * 导出所有数据或指定工作区的数据
 *
 * @param workspaceId - 可选的工作区 ID，不传则导出全部
 * @returns JSON 字符串
 */
export async function exportAll(workspaceId?: string): Promise<string> {
	// 使用 Repository 获取工作区
	const workspaces = workspaceId
		? await WorkspaceRepository.getById(workspaceId).then(w => w ? [w] : [])
		: await WorkspaceRepository.getAll();

	// 使用 Repository 获取节点
	const nodes = workspaceId
		? await NodeRepository.getByWorkspace(workspaceId)
		: await NodeRepository.getAll();

	// 使用 Repository 获取内容
	const nodeIds = nodes.map(n => n.id);
	const contents = nodeIds.length > 0
		? await ContentRepository.getByNodeIds(nodeIds)
		: [];

	// 使用 Repository 获取附件
	const attachments = workspaceId
		? await AttachmentRepository.getByProject(workspaceId)
		: await AttachmentRepository.getAll();

	const bundle: ExportBundle = {
		version: 4, // Bumped version - wiki entries now in nodes
		projects: workspaces as WorkspaceInterface[], // Keep "projects" key for backward compatibility
		nodes: nodes as NodeInterface[],
		contents,
		// wikiEntries no longer exported - they are now file nodes with "wiki" tag
		attachments,
	};
	return JSON.stringify(bundle, null, 2);
}

/**
 * 导出数据为 ZIP 压缩包
 *
 * @param workspaceId - 可选的工作区 ID
 * @returns Blob 对象
 */
export async function exportAllAsZip(workspaceId?: string): Promise<Blob> {
	const JSZip = (await import("jszip")).default;
	const zip = new JSZip();
	const jsonData = await exportAll(workspaceId);
	zip.file("data.json", jsonData);
	return await zip.generateAsync({ type: "blob" });
}

/**
 * 从 JSON 导入数据
 * 注意：使用直接数据库访问进行批量插入，因为 Repository 不支持 bulkPut
 *
 * @param jsonText - JSON 字符串
 * @param options - 导入选项
 */
export async function importFromJson(
	jsonText: string,
	{ keepIds = false } = {},
): Promise<void> {
	const data = JSON.parse(jsonText) as Partial<ExportBundle>;
	const workspaces = data.projects ?? [];
	const nodes = data.nodes ?? [];
	const contents = (data.contents ?? []) as Array<{
		id: string;
		nodeId: string;
		content: string;
		contentType: string;
		lastEdit: string;
	}>;
	const attachments = data.attachments ?? [];

	const idMap = new Map<string, string>();

	// 导入工作区 - 使用直接数据库访问进行 put 操作
	for (const w of workspaces) {
		const wid = keepIds ? w.id : uuidv4();
		idMap.set(w.id as string, wid);
		await database.workspaces.put({ ...w, id: wid } as WorkspaceInterface);
	}

	// 导入节点 - 使用直接数据库访问进行 put 操作
	for (const n of nodes) {
		const nid = keepIds ? n.id : uuidv4();
		const workspace = idMap.get(n.workspace as string) ?? n.workspace;
		const parent = n.parent ? (idMap.get(n.parent) ?? n.parent) : null;
		idMap.set(n.id as string, nid);
		await database.nodes.put({ ...n, id: nid, workspace, parent } as NodeInterface);
	}

	// 导入内容 - 使用直接数据库访问进行 put 操作
	for (const c of contents) {
		const cid = keepIds ? c.id : uuidv4();
		const nodeId = idMap.get(c.nodeId) ?? c.nodeId;
		await database.contents.put({ ...c, id: cid, nodeId } as never);
	}

	// Note: wikiEntries from old exports are ignored - they should be migrated separately

	// 导入附件 - 使用直接数据库访问进行 put 操作
	for (const a of attachments as Array<{ id: string; project?: string }>) {
		const newWorkspace = a.project && idMap.has(a.project) ? idMap.get(a.project) : a.project;
		await database.attachments.put({ ...a, project: newWorkspace } as never);
	}

	toast.success("Import completed");
}

/**
 * 导出工作区为 Markdown 格式
 *
 * @param workspaceId - 工作区 ID
 * @returns Markdown 字符串
 */
export async function exportAsMarkdown(workspaceId: string): Promise<string> {
	// 使用 Repository 获取工作区
	const workspace = await WorkspaceRepository.getById(workspaceId);
	if (!workspace) throw new Error("Workspace not found");

	// 使用 Repository 获取节点
	const nodes = await NodeRepository.getByWorkspace(workspaceId);
	const sortedNodes = nodes.sort((a, b) => a.order - b.order);

	// 使用 Repository 获取内容
	const nodeIds = nodes.map(n => n.id);
	const contents = await ContentRepository.getByNodeIds(nodeIds);
	const contentMap = new Map(contents.map(c => [c.nodeId, c.content]));

	const lines: string[] = [];
	lines.push(`# ${workspace.title || "Untitled"}`);
	if (workspace.author) lines.push(`Author: ${workspace.author}`);
	if (workspace.description) {
		lines.push("");
		lines.push(workspace.description);
	}
	lines.push("");

	function outputNode(node: NodeInterface, depth: number) {
		const prefix = "#".repeat(Math.min(depth + 2, 6));
		lines.push("");
		lines.push(`${prefix} ${node.title || "Untitled"}`);

		const content = contentMap.get(node.id);
		if (content) {
			try {
				const parsed = JSON.parse(content);
				const text = extractText(parsed.root);
				if (text.trim()) {
					lines.push("");
					lines.push(text);
				}
			} catch {
				lines.push("");
				lines.push(content);
			}
		}
		const children = sortedNodes.filter(n => n.parent === node.id);
		for (const child of children) outputNode(child, depth + 1);
	}

	const rootNodes = sortedNodes.filter(n => !n.parent);
	for (const node of rootNodes) outputNode(node, 0);
	return lines.join("\n");
}
