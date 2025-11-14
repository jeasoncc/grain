import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import type { ChapterInterface } from "@/db/schema";

export function useChaptersByProject(projectId: string | null): ChapterInterface[] {
  const data = useLiveQuery(
    () => (projectId ? db.getChaptersByProject(projectId) : Promise.resolve([] as ChapterInterface[])),
    [projectId] as const,
  );
  return (data ?? []) as ChapterInterface[];
}

export async function createChapter(params: { projectId: string; title: string; order: number }) {
  return db.addChapter({ project: params.projectId, title: params.title, order: params.order, open: false, showEdit: false });
}

export async function renameChapter(id: string, title: string) {
  return db.updateChapter(id, { title });
}

export async function reorderChapters(aId: string, aOrder: number, bId: string, bOrder: number) {
  await Promise.all([
    db.updateChapter(aId, { order: bOrder }),
    db.updateChapter(bId, { order: aOrder }),
  ]);
}

export async function deleteChapter(id: string) {
  return db.deleteChapter(id);
}
