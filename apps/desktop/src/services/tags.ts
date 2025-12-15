/**
 * Tag Service (Simplified)
 *
 * Tags are stored in nodes.tags array (source of truth).
 * This service manages the tags aggregation cache for:
 * - Tag statistics (usage count)
 * - Quick lookup for autocomplete
 * - Graph visualization data
 *
 * @requirements 6.2
 */

import { database } from "@/db/database";
import type { TagInterface } from "@/db/models/tag";
import { useLiveQuery } from "dexie-react-hooks";

// Re-export TagInterface for convenience
export type { TagInterface } from "@/db/models/tag";

// ============================================
// Tag Cache Sync
// ============================================

/**
 * Sync tags to the aggregation cache
 * Called after saving a document with tags
 */
export async function syncTagsCache(workspaceId: string, tags: string[]): Promise<void> {
  const now = new Date().toISOString();

  for (const tagName of tags) {
    const tagId = `${workspaceId}:${tagName}`;
    const existing = await database.tags.get(tagId);

    if (existing) {
      // Update last used time
      await database.tags.update(tagId, {
        lastUsed: now,
      });
    } else {
      // Create new tag cache entry
      await database.tags.add({
        id: tagId,
        name: tagName,
        workspace: workspaceId,
        count: 0, // Will be recalculated
        lastUsed: now,
        createDate: now,
      });
    }
  }

  // Recalculate counts for affected tags
  await recalculateTagCounts(workspaceId, tags);
}

/**
 * Recalculate tag usage counts from nodes.tags
 */
export async function recalculateTagCounts(workspaceId: string, tags: string[]): Promise<void> {
  for (const tagName of tags) {
    const tagId = `${workspaceId}:${tagName}`;
    // Count nodes that have this tag using multi-entry index
    const count = await database.nodes
      .where("tags")
      .equals(tagName)
      .and((node) => node.workspace === workspaceId)
      .count();

    await database.tags.update(tagId, { count });
  }
}

/**
 * Rebuild entire tag cache for a workspace
 * Use this for data recovery or initial migration
 */
export async function rebuildTagCache(workspaceId: string): Promise<void> {
  // Get all unique tags from nodes
  const nodes = await database.nodes
    .where("workspace")
    .equals(workspaceId)
    .toArray();

  const tagCounts = new Map<string, number>();
  const now = new Date().toISOString();

  for (const node of nodes) {
    if (node.tags && Array.isArray(node.tags)) {
      for (const tag of node.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  // Clear existing cache for workspace
  await database.tags.where("workspace").equals(workspaceId).delete();

  // Rebuild cache
  const tagEntries: TagInterface[] = [];
  for (const [name, count] of tagCounts) {
    tagEntries.push({
      id: `${workspaceId}:${name}`,
      name,
      workspace: workspaceId,
      count,
      lastUsed: now,
      createDate: now,
    });
  }

  if (tagEntries.length > 0) {
    await database.tags.bulkAdd(tagEntries);
  }
}

// ============================================
// Tag Queries
// ============================================

/**
 * Get all tags for a workspace (from cache)
 */
export async function getTagsByWorkspace(workspaceId: string): Promise<TagInterface[]> {
  return database.tags.where("workspace").equals(workspaceId).toArray();
}

/**
 * Search tags by name prefix
 */
export async function searchTags(workspaceId: string, query: string): Promise<TagInterface[]> {
  const lowerQuery = query.toLowerCase();
  return database.tags
    .where("workspace")
    .equals(workspaceId)
    .filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
    .toArray();
}

/**
 * Get nodes by tag
 */
export async function getNodesByTag(workspaceId: string, tagName: string) {
  return database.nodes
    .where("tags")
    .equals(tagName)
    .and((node) => node.workspace === workspaceId)
    .toArray();
}

/**
 * Get tag graph data for visualization
 */
export async function getTagGraphData(workspaceId: string) {
  const tags = await getTagsByWorkspace(workspaceId);
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
}

// ============================================
// React Hooks
// ============================================

/**
 * Hook to get all tags for a workspace
 */
export function useTagsByWorkspace(workspaceId: string | undefined) {
  return useLiveQuery(
    () => (workspaceId ? getTagsByWorkspace(workspaceId) : []),
    [workspaceId],
    []
  );
}

/**
 * Hook to get nodes by tag
 */
export function useNodesByTag(workspaceId: string | undefined, tagName: string | undefined) {
  return useLiveQuery(
    () => (workspaceId && tagName ? getNodesByTag(workspaceId, tagName) : []),
    [workspaceId, tagName],
    []
  );
}

/**
 * Hook to get tag graph data
 */
export function useTagGraph(workspaceId: string | undefined) {
  return useLiveQuery(
    () => (workspaceId ? getTagGraphData(workspaceId) : { nodes: [], edges: [] }),
    [workspaceId],
    { nodes: [], edges: [] }
  );
}

/**
 * Hook to search tags
 */
export function useTagSearch(workspaceId: string | undefined, query: string) {
  return useLiveQuery(
    () => (workspaceId && query ? searchTags(workspaceId, query) : []),
    [workspaceId, query],
    []
  );
}
