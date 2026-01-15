/**
 * Wiki Resolution Functions - Pure Functions Only
 *
 * Provides wiki-related pure functions for data transformation.
 * IO operations have been moved to @/flows/wiki.
 *
 * Requirements: 1.1, 1.2, 2.1
 */

import { WikiFileEntryBuilder } from "./wiki.builder"
import type { WikiFileEntry } from "./wiki.schema"

// ==============================
// Constants
// ==============================

/** Wiki root folder name */
export const WIKI_ROOT_FOLDER = "Wiki"

/** Wiki tag name */
export const WIKI_TAG = "wiki"

// ==============================
// Wiki File Operations
// ==============================

/**
 * Generate default wiki template content in Lexical JSON format
 *
 * @param title - The wiki entry title
 * @returns Lexical editor state JSON string
 */
export function generateWikiTemplate(title: string): string {
	// Get current date for the date tag
	const now = new Date()
	const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

	const template = {
		root: {
			children: [
				// Tags line: #[wiki] #[2024-12-16]
				{
					children: [
						{
							type: "tag",
							version: 1,
							tagName: "wiki",
							text: "#[wiki]",
							format: 0,
							style: "",
							detail: 2,
							mode: "segmented",
						},
						{
							type: "text",
							version: 1,
							text: " ",
							format: 0,
							style: "",
							detail: 0,
							mode: "normal",
						},
						{
							type: "tag",
							version: 1,
							tagName: dateTag,
							text: `#[${dateTag}]`,
							format: 0,
							style: "",
							detail: 2,
							mode: "segmented",
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// Empty line
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// Title heading
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: title,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h1",
				},
				// Empty line after title
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Overview",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Describe basic information here...",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Details",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Add more detailed content...",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Related Entries",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Use @ to link to other wiki entries...",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	}
	return JSON.stringify(template)
}

// NOTE: Wiki file creation has been moved to actions/templated/create-wiki.action.ts
// Use createWiki or createWikiAsync from that module instead.

// ==============================
// Pure Helper Functions
// ==============================

/**
 * Node-like type for path building (accepts both NodeInterface and NodeResponse)
 */
interface NodeLike {
	readonly id: string
	readonly title: string
	readonly parent?: string | null
	readonly parentId?: string | null
}

/**
 * Build the path string for a node (pure function)
 *
 * @param node - The node to build path for
 * @param nodeMap - Map of all nodes by ID
 * @returns Path string (e.g., "wiki/Character.md")
 */
export function buildNodePath<T extends NodeLike>(
	node: T,
	nodeMap: ReadonlyMap<string, T>,
): string {
	const parts: ReadonlyArray<string> = [node.title]
	const parentId = node.parent ?? node.parentId
	const current = parentId ? nodeMap.get(parentId) : undefined

	// Use functional approach to build path parts
	const buildParts = (
		currentNode: T | undefined,
		accumulator: ReadonlyArray<string>,
	): ReadonlyArray<string> => {
		if (!currentNode) return accumulator

		const nextParentId = currentNode.parent ?? currentNode.parentId
		const nextNode = nextParentId ? nodeMap.get(nextParentId) : undefined

		return buildParts(nextNode, [currentNode.title, ...accumulator])
	}

	const allParts = buildParts(current, parts)
	return allParts.join("/")
}

/**
 * Build WikiFileEntry from node data (pure function)
 *
 * @param node - The node (must have id and title)
 * @param content - The content string
 * @param path - The path string
 * @returns WikiFileEntry
 */
export function buildWikiFileEntry(
	node: { readonly id: string; readonly title: string },
	content: string,
	path: string,
): WikiFileEntry {
	return new WikiFileEntryBuilder()
		.id(node.id)
		.name(node.title)
		.alias([])
		.content(content)
		.path(path)
		.build()
}

// ==============================
// Exports
// ==============================

export type { WikiFileEntry }
