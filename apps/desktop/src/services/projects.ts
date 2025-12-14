import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "@/db/curd";
import type {
	AttachmentInterface,
	ProjectInterface,
	NodeInterface,
	WikiEntryInterface,
} from "@/db/schema";

export const bookSchema = z.object({
	title: z.string().trim().min(2).max(100),
	author: z.string().trim().min(2).max(50),
	description: z.string().trim().max(500).optional(),
});

export async function createBook(
	input: z.infer<typeof bookSchema>,
): Promise<ProjectInterface> {
	const parsed = bookSchema.safeParse(input);
	if (!parsed.success)
		throw new Error(parsed.error.issues[0]?.message || "Invalid book data");
	const project = await db.addProject(parsed.data);
	toast.success(`Created book "${project.title}"`);
	return project as ProjectInterface;
}

export function useAllProjects(): ProjectInterface[] {
	const data = useLiveQuery(() => db.getAllProjects(), [] as const);
	return (data ?? []) as ProjectInterface[];
}

export interface ExportBundle {
	version: number;
	projects: ProjectInterface[];
	nodes: NodeInterface[];
	wikiEntries: WikiEntryInterface[];
	attachments: AttachmentInterface[];
}

export async function exportAll(projectId?: string): Promise<string> {
	const projects = projectId 
		? await db.projects.get(projectId).then(p => p ? [p] : [])
		: await db.getAllProjects();
	const nodes = projectId
		? await db.nodes.where("workspace").equals(projectId).toArray()
		: await db.nodes.toArray();
	const wikiEntries = projectId
		? await db.wikiEntries.where("project").equals(projectId).toArray()
		: await db.wikiEntries.toArray();
	const attachments = projectId
		? await db.attachments.where("project").equals(projectId).toArray()
		: await db.attachments.toArray();
	
	const bundle: ExportBundle = {
		version: 2,
		projects: projects as ProjectInterface[],
		nodes: nodes as NodeInterface[],
		wikiEntries: wikiEntries as WikiEntryInterface[],
		attachments: attachments as AttachmentInterface[],
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

function sanitizeFileName(name: string): string {
	return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "未命名";
}

export async function importFromJson(
	jsonText: string,
	{ keepIds = false } = {},
): Promise<void> {
	const data = JSON.parse(jsonText) as Partial<ExportBundle>;
	const projects = data.projects ?? [];
	const nodes = data.nodes ?? [];
	const wikiEntries = data.wikiEntries ?? [];
	const attachments = data.attachments ?? [];

	const idMap = new Map<string, string>();

	for (const p of projects) {
		const pid = keepIds ? p.id : uuidv4();
		idMap.set(p.id as string, pid);
		await db.projects.put({ ...p, id: pid } as ProjectInterface);
	}
	
	for (const n of nodes) {
		const nid = keepIds ? n.id : uuidv4();
		const workspace = idMap.get(n.workspace as string) ?? n.workspace;
		const parent = n.parent ? (idMap.get(n.parent) ?? n.parent) : null;
		idMap.set(n.id as string, nid);
		await db.nodes.put({ ...n, id: nid, workspace, parent } as NodeInterface);
	}
	
	for (const w of wikiEntries) {
		const wid = keepIds ? w.id : uuidv4();
		const project = idMap.get(w.project as string) ?? w.project;
		await db.wikiEntries.put({ ...w, id: wid, project } as WikiEntryInterface);
	}
	
	for (const a of attachments) {
		const newProject = a.project && idMap.has(a.project) ? idMap.get(a.project) : a.project;
		await db.attachments.put({ ...a, project: newProject } as AttachmentInterface);
	}

	toast.success("Import completed");
}

export async function exportAsMarkdown(projectId: string): Promise<string> {
	const project = await db.projects.get(projectId);
	if (!project) throw new Error("Project not found");

	const nodes = await db.nodes.where("workspace").equals(projectId).toArray();
	const sortedNodes = nodes.sort((a, b) => a.order - b.order);

	const lines: string[] = [];
	lines.push(`# ${project.title || "Untitled"}`);
	if (project.author) lines.push(`作者：${project.author}`);
	if (project.description) { lines.push(""); lines.push(project.description); }
	lines.push("");

	function outputNode(node: NodeInterface, depth: number) {
		const prefix = "#".repeat(Math.min(depth + 2, 6));
		lines.push(""); lines.push(`${prefix} ${node.title || "未命名"}`);
		if (node.content) {
			try {
				const parsed = JSON.parse(node.content);
				const text = extractText(parsed.root);
				if (text.trim()) { lines.push(""); lines.push(text); }
			} catch { lines.push(""); lines.push(node.content); }
		}
		const children = sortedNodes.filter(n => n.parent === node.id);
		for (const child of children) outputNode(child, depth + 1);
	}
	
	const rootNodes = sortedNodes.filter(n => !n.parent);
	for (const node of rootNodes) outputNode(node, 0);
	return lines.join("\n");
}

function extractText(node: any): string {
	if (!node) return "";
	if (node.type === "text") return node.text || "";
	if (node.children) return node.children.map(extractText).join("");
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
