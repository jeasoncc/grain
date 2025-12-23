/**
 * Diary Service - Integrated with File Tree
 * Creates diary entries as nodes in the workspace file tree structure.
 * Compatible with org-roam folder hierarchy and naming conventions.
 *
 * Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { createFileInTree } from "@/routes/actions";
import type { NodeInterface } from "@/types/node";

// Re-export pure functions from utils for backward compatibility
export {
	type DiaryFolderStructure,
	generateDiaryContent,
	getChineseEra,
	getChineseHour,
	getDiaryFolderStructure,
	getZodiacAnimal,
} from "./diary.utils";

import { generateDiaryContent, getDiaryFolderStructure } from "./diary.utils";

// ==============================
// Constants
// ==============================

/** Diary root folder name */
export const DIARY_ROOT_FOLDER = "Diary";

// ==============================
// Types
// ==============================

export interface DiaryMetadata {
	title: string;
	author: string;
	email: string;
	date: string;
	year: string; // "甲辰 Dragon"
	createTime: string; // "2024-12-14 14:30:00 未时"
	device: string;
	tags: string[];
}

// ==============================
// Types
// ==============================

export interface DiaryCreationResult {
	/** The created diary node */
	node: NodeInterface;
	/** The generated content (Lexical JSON string) */
	content: string;
	/** The parsed content (Lexical JSON object) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parsedContent: any;
}

// ==============================
// File Tree Integration
// ==============================

/**
 * Create a diary entry in the file tree
 * Creates the full folder hierarchy: Diary > year > month > day > diary file
 *
 * Requirements: 1.1, 1.2, 1.3
 *
 * @param workspaceId - The workspace to create the diary in
 * @param date - Optional date for the diary (defaults to now)
 * @returns The created diary node and its content
 */
export async function createDiaryInFileTree(
	workspaceId: string,
	date: Date = new Date(),
): Promise<DiaryCreationResult> {
	const structure = getDiaryFolderStructure(date);

	// Generate diary content with date
	const content = generateDiaryContent(date);
	const parsedContent = JSON.parse(content);

	// Create diary file using the unified file creator
	const { node } = await createFileInTree({
		workspaceId,
		title: structure.filename,
		folderPath: [
			DIARY_ROOT_FOLDER,
			structure.yearFolder,
			structure.monthFolder,
			structure.dayFolder,
		],
		type: "diary",
		tags: ["diary"],
		content,
	});

	return { node, content, parsedContent };
}
