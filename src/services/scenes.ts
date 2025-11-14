import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import type { SceneInterface } from "@/db/schema";

export function useScenesByProject(projectId: string | null): SceneInterface[] {
  const data = useLiveQuery(
    () => (projectId ? db.getScenesByProject(projectId) : Promise.resolve([] as SceneInterface[])),
    [projectId] as const,
  );
  return (data ?? []) as SceneInterface[];
}

export function useScenesByChapter(chapterId: string | null): SceneInterface[] {
  const data = useLiveQuery(
    () => (chapterId ? db.getScenesByChapter(chapterId) : Promise.resolve([] as SceneInterface[])),
    [chapterId] as const,
  );
  return (data ?? []) as SceneInterface[];
}

export async function createScene(params: { projectId: string; chapterId: string; title: string; order: number; content?: string }) {
  return db.addScene({ project: params.projectId, chapter: params.chapterId, title: params.title, order: params.order, content: params.content ?? "" });
}

export async function renameScene(id: string, title: string) {
  return db.updateScene(id, { title });
}

export async function reorderScenes(aId: string, aOrder: number, bId: string, bOrder: number) {
  await Promise.all([
    db.updateScene(aId, { order: bOrder }),
    db.updateScene(bId, { order: aOrder }),
  ]);
}

export async function deleteScene(id: string) {
  return db.deleteScene(id);
}
