/**
 * Workspace Service
 * Provides workspace management using WorkspaceBuilder and WorkspaceRepository
 *
 * Requirements: 6.2
 */
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { z } from "zod";
import { database } from "@/db/database";
import {
	WorkspaceRepository,
	type WorkspaceInterface,
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

export function useAllWorkspaces(): WorkspaceInterface[] {
	const data = useLiveQuery(() => database.workspaces.toArray(), [] as const);
	return (data ?? []) as WorkspaceInterface[];
}
