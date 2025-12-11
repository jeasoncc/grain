import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import type { DrawingInterface } from "@/db/schema";

export function useDrawingsByProject(projectId: string | null): DrawingInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? db.getDrawingsByProject(projectId)
				: Promise.resolve([] as DrawingInterface[]),
		[projectId] as const,
	);
	return (data ?? []) as DrawingInterface[];
}

export async function createDrawing(params: {
	projectId: string;
	name?: string;
	width?: number;
	height?: number;
}) {
	return db.addDrawing({
		project: params.projectId,
		name: params.name || `Drawing ${Date.now()}`,
		width: params.width || 800,
		height: params.height || 600,
		content: JSON.stringify({ elements: [], appState: {}, files: {} }),
	});
}

export async function updateDrawing(
	id: string,
	updates: Partial<DrawingInterface>,
) {
	return db.updateDrawing(id, updates);
}

export async function renameDrawing(id: string, name: string) {
	return db.updateDrawing(id, { name });
}

export async function deleteDrawing(id: string) {
	return db.deleteDrawing(id);
}

export async function saveDrawingContent(
	id: string,
	content: string,
	width?: number,
	height?: number,
) {
	const updates: Partial<DrawingInterface> = { content };
	if (width !== undefined) updates.width = width;
	if (height !== undefined) updates.height = height;
	return db.updateDrawing(id, updates);
}