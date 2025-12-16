/**
 * Import/Export Service
 * Provides data import and export functionality for workspaces
 *
 * Requirements: 6.2
 */
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { database } from "@/db/database";
import {
	ContentRepository,
	type WorkspaceInterface,
	type NodeInterface,
} from "@/db/models";

export interface ExportBundle {
	version: number;
	projects: WorkspaceInterface[];
	nodes: NodeInterface[];
	contents: unknown[];
	/** @deprecated Wiki entries are now stored as file nodes with "wiki" tag */
	wikiEntries?: unknown[];
	attachments: unknown[];
}

export async function exportAll(workspaceId?: string): Promise<string> {
	const workspaces = workspaceId 
		? await database.workspaces.get(workspaceId).then(w => w ? [w] : [])
		: await database.workspaces.toArray();
	const nodes = workspaceId
		? await database.nodes.where("workspace").equals(workspaceId).toArray()
		: await database.nodes.toArray();
	
	// Get content for all nodes
	const nodeIds = nodes.map(n => n.id);
	const contents = nodeIds.length > 0 
		? await ContentRepository.getByNodeIds(nodeIds)
		: [];
	
	const attachments = workspaceId
		? await database.attachments.where("project").equals(workspaceId).toArray()
		: await database.attachments.toArray();
	
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

export async function exportAllAsZip(workspaceId?: string): Promise<Blob> {
	const JSZip = (await import("jszip")).default;
	const zip = new JSZip();
	const jsonData = await exportAll(workspaceId);
	zip.file("data.json", jsonData);
	return await zip.generateAsync({ type: "blob" });
}

export async function importFromJson(
	jsonText: string,
	{ keepIds = false } = {},
): Promise<void> {
	const data = JSON.parse(jsonText) as Partial<ExportBundle>;
	const workspaces = data.projects ?? [];
	const nodes = data.nodes ?? [];
	const contents = (data.contents ?? []) as Array<{ id: string; nodeId: string; content: string; contentType: string; lastEdit: string }>;
	const wikiEntries = data.wikiEntries ?? [];
	const attachments = data.attachments ?? [];

	const idMap = new Map<string, string>();

	for (const w of workspaces) {
		const wid = keepIds ? w.id : uuidv4();
		idMap.set(w.id as string, wid);
		await database.workspaces.put({ ...w, id: wid } as WorkspaceInterface);
	}
	
	for (const n of nodes) {
		const nid = keepIds ? n.id : uuidv4();
		const workspace = idMap.get(n.workspace as string) ?? n.workspace;
		const parent = n.parent ? (idMap.get(n.parent) ?? n.parent) : null;
		idMap.set(n.id as string, nid);
		await database.nodes.put({ ...n, id: nid, workspace, parent } as NodeInterface);
	}
	
	// Import contents with updated node IDs
	for (const c of contents) {
		const cid = keepIds ? c.id : uuidv4();
		const nodeId = idMap.get(c.nodeId) ?? c.nodeId;
		await database.contents.put({ ...c, id: cid, nodeId } as never);
	}
	
	// Note: wikiEntries from old exports are ignored - they should be migrated separately
	
	for (const a of attachments as Array<{ id: string; project?: string }>) {
		const newWorkspace = a.project && idMap.has(a.project) ? idMap.get(a.project) : a.project;
		await database.attachments.put({ ...a, project: newWorkspace } as never);
	}

	toast.success("Import completed");
}

export async function exportAsMarkdown(workspaceId: string): Promise<string> {
	const workspace = await database.workspaces.get(workspaceId);
	if (!workspace) throw new Error("Workspace not found");

	const nodes = await database.nodes.where("workspace").equals(workspaceId).toArray();
	const sortedNodes = nodes.sort((a, b) => a.order - b.order);
	
	// Get content for all nodes
	const nodeIds = nodes.map(n => n.id);
	const contents = await ContentRepository.getByNodeIds(nodeIds);
	const contentMap = new Map(contents.map(c => [c.nodeId, c.content]));

	const lines: string[] = [];
	lines.push(`# ${workspace.title || "Untitled"}`);
	if (workspace.author) lines.push(`Author: ${workspace.author}`);
	if (workspace.description) { lines.push(""); lines.push(workspace.description); }
	lines.push("");

	function outputNode(node: NodeInterface, depth: number) {
		const prefix = "#".repeat(Math.min(depth + 2, 6));
		lines.push(""); lines.push(`${prefix} ${node.title || "Untitled"}`);
		
		const content = contentMap.get(node.id);
		if (content) {
			try {
				const parsed = JSON.parse(content);
				const text = extractText(parsed.root);
				if (text.trim()) { lines.push(""); lines.push(text); }
			} catch { lines.push(""); lines.push(content); }
		}
		const children = sortedNodes.filter(n => n.parent === node.id);
		for (const child of children) outputNode(child, depth + 1);
	}
	
	const rootNodes = sortedNodes.filter(n => !n.parent);
	for (const node of rootNodes) outputNode(node, 0);
	return lines.join("\n");
}

function extractText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as Record<string, unknown>;
	if (n.type === "text") return (n.text as string) || "";
	if (Array.isArray(n.children)) return n.children.map(extractText).join("");
	return "";
}

export function triggerDownload(filename: string, text: string, mimeType = "application/json;charset=utf-8") {
	const blob = new Blob([text], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a"); a.href = url; a.download = filename;
	document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function triggerBlobDownload(filename: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a"); a.href = url; a.download = filename;
	document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export async function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = reject;
		reader.readAsText(file);
	});
}
