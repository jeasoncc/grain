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

export async function createCanvasScene(params: { projectId: string; chapterId: string; title: string; order: number }) {
  // 生成文件路径
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = `canvas/${params.projectId}/${timestamp}.excalidraw`;
  
  return db.addScene({
    project: params.projectId,
    chapter: params.chapterId,
    title: params.title,
    order: params.order,
    content: JSON.stringify({ elements: [], appState: {}, files: {} }),
    type: "canvas",
    filePath,
  });
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

export async function moveScene(projectId: string, sceneId: string, targetChapterId: string, newIndex: number) {
  const scene = await db.getScene(sceneId);
  if (!scene) return;

  // 1. Get target list
  const scenes = await db.getScenesByChapter(targetChapterId);
  // Filter out the moving scene if it's already in the list (reordering within same chapter)
  const sorted = scenes.filter(s => s.id !== sceneId).sort((a, b) => a.order - b.order);
  
  // 2. Insert into new position
  const safeIndex = Math.max(0, Math.min(newIndex, sorted.length));
  
  // If moving to new chapter, update the object
  if (scene.chapter !== targetChapterId) {
      await db.updateScene(sceneId, { chapter: targetChapterId });
      scene.chapter = targetChapterId;
  }
  
  sorted.splice(safeIndex, 0, scene);

  // 3. Update orders
  await Promise.all(sorted.map((s, i) => {
    const newOrder = i + 1;
    if (s.order !== newOrder) {
      return db.updateScene(s.id, { order: newOrder });
    }
    return Promise.resolve();
  }));
}

export async function deleteScene(id: string) {
  return db.deleteScene(id);
}
