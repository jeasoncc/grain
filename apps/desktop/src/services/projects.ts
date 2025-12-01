import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "@/db/curd";
import type {
	AttachmentInterface,
	ChapterInterface,
	ProjectInterface,
	RoleInterface,
	SceneInterface,
} from "@/db/schema";
import { extractTextFromSerialized } from "@/lib/statistics";

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
	projects: ProjectInterface[];
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	roles: RoleInterface[];
	attachments: AttachmentInterface[];
}

export async function exportAll(): Promise<string> {
	const [projects, chapters, scenes, roles, attachments] = await Promise.all([
		db.getAllProjects(),
		db.getAllChapters(),
		db.getAllScenes(),
		db.roles.toArray().catch(() => [] as RoleInterface[]),
		db.attachments.toArray().catch(() => [] as AttachmentInterface[]),
	]);
	const bundle: ExportBundle = {
		projects,
		chapters,
		scenes,
		roles,
		attachments,
	} as unknown as ExportBundle;
	return JSON.stringify(bundle, null, 2);
}

/**
 * 导出所有数据为 ZIP 文件
 * @returns Blob 对象，可用于下载
 */
export async function exportAllAsZip(): Promise<Blob> {
	const JSZip = (await import("jszip")).default;
	const zip = new JSZip();
	
	// 获取所有数据
	const [projects, chapters, scenes, roles, attachments, worldEntries] = await Promise.all([
		db.getAllProjects(),
		db.getAllChapters(),
		db.getAllScenes(),
		db.roles.toArray().catch(() => [] as RoleInterface[]),
		db.attachments.toArray().catch(() => [] as AttachmentInterface[]),
		db.worldEntries?.toArray().catch(() => []) || Promise.resolve([]),
	]);
	
	// 创建主数据文件
	const bundle: ExportBundle = {
		projects,
		chapters,
		scenes,
		roles,
		attachments,
	} as unknown as ExportBundle;
	
	zip.file("data.json", JSON.stringify(bundle, null, 2));
	
	// 为每个项目创建单独的文件夹
	for (const project of projects) {
		const projectFolder = zip.folder(sanitizeFileName(project.title));
		if (!projectFolder) continue;
		
		// 项目信息
		projectFolder.file("project.json", JSON.stringify(project, null, 2));
		
		// 获取该项目的章节
		const projectChapters = chapters.filter(c => c.project === project.id);
		
		// 为每个章节创建文件夹
		for (const chapter of projectChapters) {
			const chapterFolder = projectFolder.folder(sanitizeFileName(chapter.title));
			if (!chapterFolder) continue;
			
			// 章节信息
			chapterFolder.file("chapter.json", JSON.stringify(chapter, null, 2));
			
			// 获取该章节的场景
			const chapterScenes = scenes.filter(s => s.chapter === chapter.id);
			
			// 为每个场景创建文本文件
			for (const scene of chapterScenes) {
				const sceneText = extractTextFromSerialized(scene.content);
				chapterFolder.file(`${sanitizeFileName(scene.title)}.txt`, sceneText);
				chapterFolder.file(`${sanitizeFileName(scene.title)}.json`, JSON.stringify(scene, null, 2));
			}
		}
		
		// 导出角色信息
		const projectRoles = roles.filter(r => r.project === project.id);
		if (projectRoles.length > 0) {
			const rolesFolder = projectFolder.folder("角色");
			if (rolesFolder) {
				for (const role of projectRoles) {
					rolesFolder.file(`${sanitizeFileName(role.name)}.json`, JSON.stringify(role, null, 2));
				}
			}
		}
		
		// 导出世界观信息
		const projectWorld = worldEntries.filter((w: any) => w.project === project.id);
		if (projectWorld.length > 0) {
			const worldFolder = projectFolder.folder("世界观");
			if (worldFolder) {
				for (const entry of projectWorld) {
					worldFolder.file(`${sanitizeFileName(entry.name)}.json`, JSON.stringify(entry, null, 2));
				}
			}
		}
	}
	
	// 生成 ZIP 文件
	return await zip.generateAsync({ type: "blob" });
}

/**
 * 清理文件名，移除不安全的字符
 */
function sanitizeFileName(name: string): string {
	return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "未命名";
}

export async function importFromJson(
	jsonText: string,
	{ keepIds = false } = {},
): Promise<void> {
	const data = JSON.parse(jsonText) as Partial<ExportBundle>;
	const projects = data.projects ?? [];
	const chapters = data.chapters ?? [];
	const scenes = data.scenes ?? [];
	const roles = data.roles ?? [];
	const attachments = data.attachments ?? [];

	await db.transaction(
		"rw",
		[db.projects, db.chapters, db.scenes, db.roles, db.attachments],
		async () => {
			// naive import, optionally re-id
			const idMap = new Map<string, string>();

			for (const p of projects) {
				const pid = keepIds ? p.id : uuidv4();
				idMap.set(p.id as string, pid);
				await db.projects.put({ ...p, id: pid } as ProjectInterface);
			}
			for (const c of chapters) {
				const cid = keepIds ? c.id : uuidv4();
				const pid = idMap.get(c.project as string) ?? c.project;
				await db.chapters.put({
					...c,
					id: cid,
					project: pid,
				} as ChapterInterface);
			}
			for (const s of scenes) {
				const sid = keepIds ? s.id : uuidv4();
				const newChapter = keepIds
					? s.chapter
					: s.chapter && idMap.has(s.chapter as string)
						? idMap.get(s.chapter as string)
						: s.chapter;
				const newProject = keepIds
					? s.project
					: s.project && idMap.has(s.project as string)
						? idMap.get(s.project as string)
						: s.project;
				await db.scenes.put({
					...s,
					id: sid,
					chapter: newChapter as string,
					project: newProject as string,
				} as SceneInterface);
			}
			for (const r of roles) {
				const newProject = keepIds
					? r.project
					: r.project && idMap.has(r.project as string)
						? idMap.get(r.project as string)
						: r.project;
				await db.roles.put({ ...r, project: newProject } as RoleInterface);
			}
			for (const a of attachments) {
				const newProject = keepIds
					? a.project
					: a.project && idMap.has(a.project as string)
						? idMap.get(a.project as string)
						: a.project;
				const newChapter = keepIds
					? a.chapter
					: a.chapter && idMap.has(a.chapter as string)
						? idMap.get(a.chapter as string)
						: a.chapter;
				const newScene = keepIds
					? a.scene
					: a.scene && idMap.has(a.scene as string)
						? idMap.get(a.scene as string)
						: a.scene;
				await db.attachments.put({
					...a,
					project: newProject,
					chapter: newChapter,
					scene: newScene,
				} as AttachmentInterface);
			}
		},
	);
	toast.success("Import completed");
}

export async function exportAsMarkdown(projectId: string): Promise<string> {
	const project = await db.projects.get(projectId as string);
	if (!project) {
		throw new Error("Project not found");
	}

	const [chapters, scenes] = await Promise.all([
		db.chapters
			.where("project")
			.equals(projectId as string)
			.toArray(),
		db.scenes
			.where("project")
			.equals(projectId as string)
			.toArray(),
	]);

	const chaptersById = new Map<string, ChapterInterface>();
	for (const c of chapters) {
		if (c.id) chaptersById.set(c.id as string, c as ChapterInterface);
	}

	const scenesByChapter = new Map<string | undefined, SceneInterface[]>();
	for (const s of scenes) {
		const key = (s.chapter as string | undefined) ?? "__no_chapter__";
		const list = scenesByChapter.get(key) ?? [];
		list.push(s as SceneInterface);
		scenesByChapter.set(key, list);
	}

	const lines: string[] = [];

	lines.push(`# ${project.title || "Untitled"}`);
	if (project.author) {
		lines.push(`作者：${project.author}`);
	}
	if (project.description) {
		lines.push("");
		lines.push(project.description);
	}

	lines.push("");

	// Chapters with their scenes
	const orderedChapters = [...chaptersById.values()].sort((a, b) => {
		const ao = (a.order ?? 0) as number;
		const bo = (b.order ?? 0) as number;
		return ao - bo;
	});

	for (const chapter of orderedChapters) {
		lines.push("");
		lines.push(`## ${chapter.title || "未命名章节"}`);

		const chapterScenes = (
			scenesByChapter.get(chapter.id as string) ?? []
		).sort((a, b) => {
			const ao = (a.order ?? 0) as number;
			const bo = (b.order ?? 0) as number;
			return ao - bo;
		});

		for (const scene of chapterScenes) {
			lines.push("");
			lines.push(`### ${scene.title || "未命名场景"}`);
			const text = extractTextFromSerialized(scene.content ?? "");
			if (text.trim()) {
				lines.push("");
				lines.push(text);
			}
		}
	}

	// Scenes without chapter
	const ungroupedScenes = scenesByChapter.get("__no_chapter__") ?? [];
	if (ungroupedScenes.length > 0) {
		lines.push("");
		lines.push("## 未分配章节的场景");

		const orderedScenes = [...ungroupedScenes].sort((a, b) => {
			const ao = (a.order ?? 0) as number;
			const bo = (b.order ?? 0) as number;
			return ao - bo;
		});

		for (const scene of orderedScenes) {
			lines.push("");
			lines.push(`### ${scene.title || "未命名场景"}`);
			const text = extractTextFromSerialized(scene.content ?? "");
			if (text.trim()) {
				lines.push("");
				lines.push(text);
			}
		}
	}

	return lines.join("\n");
}

export function triggerDownload(
	filename: string,
	text: string,
	mimeType = "application/json;charset=utf-8",
) {
	const blob = new Blob([text], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * 触发下载 Blob 对象
 */
export function triggerBlobDownload(filename: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export async function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = reject;
		reader.readAsText(file);
	});
}
