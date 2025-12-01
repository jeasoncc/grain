import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import type { ChapterInterface } from "@/db/schema";

export function useChaptersByProject(
	projectId: string | null,
): ChapterInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? db.getChaptersByProject(projectId)
				: Promise.resolve([] as ChapterInterface[]),
		[projectId] as const,
	);
	return (data ?? []) as ChapterInterface[];
}

export async function createChapter(params: {
	projectId: string;
	title: string;
	order: number;
}) {
	return db.addChapter({
		project: params.projectId,
		title: params.title,
		order: params.order,
		open: false,
		showEdit: false,
	});
}

export async function renameChapter(id: string, title: string) {
	return db.updateChapter(id, { title });
}

export async function reorderChapters(
	aId: string,
	aOrder: number,
	bId: string,
	bOrder: number,
) {
	await Promise.all([
		db.updateChapter(aId, { order: bOrder }),
		db.updateChapter(bId, { order: aOrder }),
	]);
}

export async function moveChapter(
	projectId: string,
	chapterId: string,
	newIndex: number,
) {
	const chapters = await db.getChaptersByProject(projectId);
	const sorted = chapters.sort((a, b) => a.order - b.order);

	const currentIndex = sorted.findIndex((c) => c.id === chapterId);
	if (currentIndex === -1) return;

	const [moved] = sorted.splice(currentIndex, 1);
	const safeIndex = Math.max(0, Math.min(newIndex, sorted.length));
	sorted.splice(safeIndex, 0, moved);

	await Promise.all(
		sorted.map((c, i) => {
			const newOrder = i + 1;
			if (c.order !== newOrder) {
				return db.updateChapter(c.id, { order: newOrder });
			}
			return Promise.resolve();
		}),
	);
}

export async function deleteChapter(id: string) {
	return db.deleteChapter(id);
}
