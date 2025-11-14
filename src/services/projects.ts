import { z } from "zod";
import { db } from "@/db/curd";
import { useLiveQuery } from "dexie-react-hooks";
import type { ChapterInterface, ProjectInterface, SceneInterface, RoleInterface, AttachmentInterface } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export const bookSchema = z.object({
  title: z.string().trim().min(2).max(100),
  author: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional(),
});

export async function createBook(input: z.infer<typeof bookSchema>): Promise<ProjectInterface> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid book data");
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

export async function importFromJson(jsonText: string, { keepIds = false } = {}): Promise<void> {
  const data = JSON.parse(jsonText) as Partial<ExportBundle>;
  const projects = data.projects ?? [];
  const chapters = data.chapters ?? [];
  const scenes = data.scenes ?? [];
  const roles = data.roles ?? [];
  const attachments = data.attachments ?? [];

  await db.transaction('rw', [db.projects, db.chapters, db.scenes, db.roles, db.attachments], async () => {
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
      await db.chapters.put({ ...c, id: cid, project: pid } as ChapterInterface);
    }
    for (const s of scenes) {
      const sid = keepIds ? s.id : uuidv4();
      const newChapter = keepIds ? s.chapter : (s.chapter && idMap.has(s.chapter as string) ? idMap.get(s.chapter as string) : s.chapter);
      const newProject = keepIds ? s.project : (s.project && idMap.has(s.project as string) ? idMap.get(s.project as string) : s.project);
      await db.scenes.put({ ...s, id: sid, chapter: newChapter as string, project: newProject as string } as SceneInterface);
    }
    for (const r of roles) {
      const newProject = keepIds ? r.project : (r.project && idMap.has(r.project as string) ? idMap.get(r.project as string) : r.project);
      await db.roles.put({ ...r, project: newProject } as RoleInterface);
    }
    for (const a of attachments) {
      const newProject = keepIds ? a.project : (a.project && idMap.has(a.project as string) ? idMap.get(a.project as string) : a.project);
      const newChapter = keepIds ? a.chapter : (a.chapter && idMap.has(a.chapter as string) ? idMap.get(a.chapter as string) : a.chapter);
      const newScene = keepIds ? a.scene : (a.scene && idMap.has(a.scene as string) ? idMap.get(a.scene as string) : a.scene);
      await db.attachments.put({ ...a, project: newProject, chapter: newChapter, scene: newScene } as AttachmentInterface);
    }
  });
  toast.success("Import completed");
}

export function triggerDownload(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
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
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
