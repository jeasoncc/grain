/**
 * Workspace Service
 * Provides workspace/project management using WorkspaceBuilder and WorkspaceRepository
 *
 * Requirements: 6.2
 */
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { database } from "@/db/database";
import {
	WorkspaceRepository,
	WorkspaceBuilder,
	NodeRepository,
	ContentRepository,
	WikiRepository,
	type WorkspaceInterface,
	type NodeInterface,
	type WikiInterface,
} from "@/db/models";

export const bookSchema = z.object({
	title: z.string().trim().min(2).max(100),
	author: z.string().trim().min(2).max(50),
	description: z.string().trim().max(500).optional(),
});

export async function createBook(
	input: z.infer<typeof bookSchema>,
): Promise<WorkspaceInterface> {
	const parsed = bookSchema.safeParse(input);
	if (!parsed.success)
		throw new Error(parsed.error.issues[0]?.message || "Invalid book data");
	
	const workspace = await WorkspaceRepository.add(parsed.data.title, {
		author: parsed.data.author,
		description: parsed.data.description,
	});
	
	toast.success(`Created book "${workspace.title}"`);
	return workspace;
}

export function useAllProjects(): WorkspaceInterface[] {
	const data = useLiveQuery(() => database.workspaces.toArray(), [] as const);
	return (data ?? []) as WorkspaceInterface[];
}

// Alias for backward compatibility
export const useAllWorkspaces = useAllProjects;

export interface ExportBundle {
	version: number;
	projects: WorkspaceInterface[];
	nodes: NodeInterface[];
	contents: unknown[];
	wikiEntries: WikiInterface[];
	attachments: unknown[];
}

export async function exportAll(projectId?: string): Promise<string> {
	const projects = projectId 
		? await database.workspaces.get(projectId).then(p => p ? [p] : [])
		: await database.workspaces.toArray();
	const nodes = projectId
		? await database.nodes.where("workspace").equals(projectId).toArray()
		: await database.nodes.toArray();
	
	// Get content for all nodes
	const nodeIds = nodes.map(n => n.id);
	const contents = nodeIds.length > 0 
		? await ContentRepository.getByNodeIds(nodeIds)
		: [];
	
	const wikiEntries = projectId
		? await database.wikiEntries.where("project").equals(projectId).toArray()
		: await database.wikiEntries.toArray();
	const attachments = projectId
		? await database.attachments.where("project").equals(projectId).toArray()
		: await database.attachments.toArray();
	
	const bundle: ExportBundle = {
		version: 3,
		projects: projects as WorkspaceInterface[],
		nodes: nodes as NodeInterface[],
		contents,
		wikiEntries: wikiEntries as WikiInterface[],
		attachments,
	};
	return JSON.stringify(bundle, null, 2);
}

export async function exportAllAsZip(projectId?: string): Promise<Blob> {
	const JSZip = (await import("jszip")).default;
	const zip = new JSZip();
	const jsonData = await exportAll(projectId);
	zip.file("data.json", jsonData);
	return await zip.generateAsync({ type: "blob" });
}

export async function importFromJson(
	jsonText: string,
	{ keepIds = false } = {},
): Promise<void> {
	const data = JSON.parse(jsonText) as Partial<ExportBundle>;
	const projects = data.projects ?? [];
	const nodes = data.nodes ?? [];
	const contents = (data.contents ?? []) as Array<{ id: string; nodeId: string; content: string; contentType: string; lastEdit: string }>;
	const wikiEntries = data.wikiEntries ?? [];
	const attachments = data.attachments ?? [];

	const idMap = new Map<string, string>();

	for (const p of projects) {
		const pid = keepIds ? p.id : uuidv4();
		idMap.set(p.id as string, pid);
		await database.workspaces.put({ ...p, id: pid } as WorkspaceInterface);
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
	
	for (const w of wikiEntries) {
		const wid = keepIds ? w.id : uuidv4();
		const project = idMap.get(w.project as string) ?? w.project;
		await database.wikiEntries.put({ ...w, id: wid, project } as WikiInterface);
	}
	
	for (const a of attachments as Array<{ id: string; project?: string }>) {
		const newProject = a.project && idMap.has(a.project) ? idMap.get(a.project) : a.project;
		await database.attachments.put({ ...a, project: newProject } as never);
	}

	toast.success("Import completed");
}

export async function exportAsMarkdown(projectId: string): Promise<string> {
	const project = await database.workspaces.get(projectId);
	if (!project) throw new Error("Project not found");

	const nodes = await database.nodes.where("workspace").equals(projectId).toArray();
	const sortedNodes = nodes.sort((a, b) => a.order - b.order);
	
	// Get content for all nodes
	const nodeIds = nodes.map(n => n.id);
	const contents = await ContentRepository.getByNodeIds(nodeIds);
	const contentMap = new Map(contents.map(c => [c.nodeId, c.content]));

	const lines: string[] = [];
	lines.push(`# ${project.title || "Untitled"}`);
	if (project.author) lines.push(`作者：${project.author}`);
	if (project.description) { lines.push(""); lines.push(project.description); }
	lines.push("");

	function outputNode(node: NodeInterface, depth: number) {
		const prefix = "#".repeat(Math.min(depth + 2, 6));
		lines.push(""); lines.push(`${prefix} ${node.title || "未命名"}`);
		
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
