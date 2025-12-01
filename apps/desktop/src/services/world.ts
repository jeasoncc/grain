import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/db/curd";
import type { WorldEntryInterface } from "@/db/schema";

export function useWorldEntriesByProject(
	projectId: string | null,
): WorldEntryInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? db.worldEntries.where("project").equals(projectId).toArray()
				: Promise.resolve([] as WorldEntryInterface[]),
		[projectId] as const,
	);

	return (data ?? []) as WorldEntryInterface[];
}

export async function createWorldEntry(params: {
	projectId: string;
	name: string;
	category?: string;
	summary?: string;
}): Promise<WorldEntryInterface> {
	const now = new Date().toISOString();
	const entry: WorldEntryInterface = {
		id: "", // will be replaced by Dexie/uuid in db.put if needed
		project: params.projectId,
		name: params.name || "New Entry",
		category: params.category ?? "location",
		summary: params.summary ?? "",
		tags: [],
		createDate: now,
		updatedAt: now,
	} as WorldEntryInterface;

	const id = await db.worldEntries.add(entry as any);
	return { ...entry, id } as WorldEntryInterface;
}

export async function updateWorldEntry(
	id: string,
	updates: Partial<WorldEntryInterface>,
): Promise<void> {
	await db.worldEntries.update(id, {
		...updates,
		updatedAt: new Date().toISOString(),
	});
}

export async function deleteWorldEntry(id: string): Promise<void> {
	await db.worldEntries.delete(id);
}
