/**
 * Workspace Service
 * Provides workspace management using WorkspaceBuilder and db functions
 *
 * Requirements: 6.2
 */
import * as E from "fp-ts/Either";
import { toast } from "sonner";
import { z } from "zod";
import { addWorkspace } from "@/db";
import type { WorkspaceInterface } from "@/types/workspace";

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

	const result = await addWorkspace(parsed.data.title, {
		author: parsed.data.author,
		description: parsed.data.description,
	})();

	if (E.isLeft(result)) {
		throw new Error(`Failed to create workspace: ${result.left.message}`);
	}

	const workspace = result.right;
	toast.success(`Created book "${workspace.title}"`);
	return workspace;
}

// Note: useAllWorkspaces hook is available from @/hooks
// Import it from @/hooks instead of this service file
