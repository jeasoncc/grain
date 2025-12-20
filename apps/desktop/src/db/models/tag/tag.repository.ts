/**
 * Tag Repository
 *
 * Provides CRUD operations for the tags aggregation cache.
 * Note: The source of truth for tags is nodes.tags array.
 * This repository manages the cache for statistics and visualization.
 *
 * @requirements 6.2
 */

import { database } from "../../database";
import type { TagInterface } from "./tag.interface";

/**
 * Tag Repository
 */
export const TagRepository = {
	// ============================================================================
	// Basic CRUD
	// ============================================================================

	/**
	 * Get a tag by ID
	 */
	async getById(id: string): Promise<TagInterface | undefined> {
		return database.tags.get(id);
	},

	/**
	 * Get all tags for a workspace
	 */
	async getByWorkspace(workspaceId: string): Promise<TagInterface[]> {
		return database.tags.where("workspace").equals(workspaceId).toArray();
	},

	/**
	 * Add or update a tag in the cache
	 */
	async upsert(tag: TagInterface): Promise<void> {
		await database.tags.put(tag);
	},

	/**
	 * Delete a tag from the cache
	 */
	async delete(id: string): Promise<void> {
		await database.tags.delete(id);
	},

	/**
	 * Delete all tags for a workspace
	 */
	async deleteByWorkspace(workspaceId: string): Promise<number> {
		return database.tags.where("workspace").equals(workspaceId).delete();
	},

	// ============================================================================
	// Cache Sync Operations
	// ============================================================================

	/**
	 * Sync tags to the aggregation cache
	 * Called after saving a document with tags
	 */
	async syncCache(workspaceId: string, tags: string[]): Promise<void> {
		const now = new Date().toISOString();

		for (const tagName of tags) {
			const tagId = `${workspaceId}:${tagName}`;
			const existing = await database.tags.get(tagId);

			if (existing) {
				await database.tags.update(tagId, { lastUsed: now });
			} else {
				await database.tags.add({
					id: tagId,
					name: tagName,
					workspace: workspaceId,
					count: 0,
					lastUsed: now,
					createDate: now,
				});
			}
		}

		// Recalculate counts
		await this.recalculateCounts(workspaceId, tags);
	},

	/**
	 * Recalculate tag usage counts from nodes.tags
	 */
	async recalculateCounts(workspaceId: string, tags: string[]): Promise<void> {
		for (const tagName of tags) {
			const tagId = `${workspaceId}:${tagName}`;
			const count = await database.nodes
				.where("tags")
				.equals(tagName)
				.and((node) => node.workspace === workspaceId)
				.count();

			await database.tags.update(tagId, { count });
		}
	},

	/**
	 * Rebuild entire tag cache for a workspace
	 * Use this for data recovery or initial migration
	 */
	async rebuildCache(workspaceId: string): Promise<void> {
		const nodes = await database.nodes
			.where("workspace")
			.equals(workspaceId)
			.toArray();

		const now = new Date().toISOString();

		// Functional: flatten all tags and count occurrences using reduce
		const tagCounts = nodes
			.flatMap((node) => node.tags ?? [])
			.reduce<Map<string, number>>(
				(acc, tag) => acc.set(tag, (acc.get(tag) || 0) + 1),
				new Map(),
			);

		// Clear existing cache
		await database.tags.where("workspace").equals(workspaceId).delete();

		// Functional: transform Map entries to TagInterface array
		const tagEntries: TagInterface[] = Array.from(
			tagCounts,
			([name, count]) => ({
				id: `${workspaceId}:${name}`,
				name,
				workspace: workspaceId,
				count,
				lastUsed: now,
				createDate: now,
			}),
		);

		if (tagEntries.length > 0) {
			await database.tags.bulkAdd(tagEntries);
		}
	},

	// ============================================================================
	// Query Operations
	// ============================================================================

	/**
	 * Search tags by name prefix
	 */
	async search(workspaceId: string, query: string): Promise<TagInterface[]> {
		const lowerQuery = query.toLowerCase();
		return database.tags
			.where("workspace")
			.equals(workspaceId)
			.filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
			.toArray();
	},

	/**
	 * Get nodes by tag
	 */
	async getNodesByTag(workspaceId: string, tagName: string) {
		return database.nodes
			.where("tags")
			.equals(tagName)
			.and((node) => node.workspace === workspaceId)
			.toArray();
	},

	/**
	 * Get tag graph data for visualization
	 */
	async getGraphData(workspaceId: string) {
		const tags = await this.getByWorkspace(workspaceId);
		const nodes = await database.nodes
			.where("workspace")
			.equals(workspaceId)
			.toArray();

		// Build co-occurrence matrix
		const coOccurrence = new Map<string, Map<string, number>>();

		for (const node of nodes) {
			if (!node.tags || node.tags.length < 2) continue;

			for (let i = 0; i < node.tags.length; i++) {
				for (let j = i + 1; j < node.tags.length; j++) {
					const tag1 = node.tags[i];
					const tag2 = node.tags[j];

					if (!coOccurrence.has(tag1)) {
						coOccurrence.set(tag1, new Map());
					}
					if (!coOccurrence.has(tag2)) {
						coOccurrence.set(tag2, new Map());
					}

					const map1 = coOccurrence.get(tag1)!;
					const map2 = coOccurrence.get(tag2)!;

					map1.set(tag2, (map1.get(tag2) || 0) + 1);
					map2.set(tag1, (map2.get(tag1) || 0) + 1);
				}
			}
		}

		// Build graph nodes and edges
		const graphNodes = tags.map((tag) => ({
			id: tag.id,
			name: tag.name,
			count: tag.count,
		}));

		const edges: Array<{ source: string; target: string; weight: number }> = [];
		const addedEdges = new Set<string>();

		for (const [tag1, connections] of coOccurrence) {
			for (const [tag2, weight] of connections) {
				const edgeKey = [tag1, tag2].sort().join(":");
				if (!addedEdges.has(edgeKey)) {
					edges.push({
						source: `${workspaceId}:${tag1}`,
						target: `${workspaceId}:${tag2}`,
						weight,
					});
					addedEdges.add(edgeKey);
				}
			}
		}

		return { nodes: graphNodes, edges };
	},
};
