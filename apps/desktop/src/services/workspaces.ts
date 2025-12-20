/**
 * Workspace Service
 * Provides workspace management using WorkspaceBuilder and WorkspaceRepository
 *
 * Requirements: 6.2
 */
import { toast } from "sonner";
import { z } from "zod";
import {
	WorkspaceRepository,
	type WorkspaceInterface,
} from "@/db/models";

export const bookSchema = z.object({
	title: z.string().trim().min(2).max(100),
	author: z.string().trim().min(2).max(50),
	description: z.string().trim().max(500).optional(),
});

/**
 * 创建新书籍/工作区
 * 
 * @param input - 书籍数据，包含标题、作者和可选描述
 * @returns 创建的工作区对象
 */
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

// Note: useAllWorkspaces hook is available from @/db/models/workspace/workspace.hooks.ts
// Import it from @/db/models instead of this service file
