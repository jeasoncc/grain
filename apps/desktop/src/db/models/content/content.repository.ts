/**
 * Content Repository
 *
 * Provides CRUD operations for the contents table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type { ContentInterface, ContentType } from "./content.interface";
import { ContentBuilder } from "./content.builder";

/**
 * Content Repository
 *
 * Provides methods for:
 * - add: Create new content records
 * - update: Update existing content
 * - delete: Remove content records
 * - getByNodeId: Retrieve content by node ID
 * - getById: Retrieve content by its own ID
 */
export const ContentRepository = {
  /**
   * Add a new content record
   * @param nodeId - The parent node ID
   * @param content - The content string (optional, defaults to empty)
   * @param contentType - The content type (optional, defaults to "lexical")
   * @returns The created content record
   */
  async add(
    nodeId: string,
    content: string = "",
    contentType: ContentType = "lexical"
  ): Promise<ContentInterface> {
    const contentRecord = new ContentBuilder()
      .nodeId(nodeId)
      .content(content)
      .contentType(contentType)
      .build();

    await database.contents.add(contentRecord);
    return contentRecord;
  },

  /**
   * Update an existing content record
   * @param id - The content record ID
   * @param updates - Partial content updates
   * @returns The number of records updated (0 or 1)
   */
  async update(
    id: string,
    updates: Partial<Pick<ContentInterface, "content" | "contentType">>
  ): Promise<number> {
    return database.contents.update(id, {
      ...updates,
      lastEdit: dayjs().toISOString(),
    });
  },

  /**
   * Update content by node ID
   * Creates the content record if it doesn't exist
   * @param nodeId - The parent node ID
   * @param content - The new content string
   * @param contentType - The content type (optional)
   * @returns The content record
   */
  async updateByNodeId(
    nodeId: string,
    content: string,
    contentType?: ContentType
  ): Promise<ContentInterface> {
    const existing = await this.getByNodeId(nodeId);

    if (existing) {
      const updates: Partial<ContentInterface> = { content };
      if (contentType) {
        updates.contentType = contentType;
      }
      await this.update(existing.id, updates);
      return {
        ...existing,
        ...updates,
        lastEdit: dayjs().toISOString(),
      };
    }

    // Create new content if it doesn't exist
    return this.add(nodeId, content, contentType || "lexical");
  },

  /**
   * Delete a content record by ID
   * @param id - The content record ID
   */
  async delete(id: string): Promise<void> {
    await database.contents.delete(id);
  },

  /**
   * Delete content by node ID
   * @param nodeId - The parent node ID
   */
  async deleteByNodeId(nodeId: string): Promise<void> {
    await database.contents.where("nodeId").equals(nodeId).delete();
  },

  /**
   * Get content by node ID
   * @param nodeId - The parent node ID
   * @returns The content record or undefined if not found
   */
  async getByNodeId(nodeId: string): Promise<ContentInterface | undefined> {
    return database.contents.where("nodeId").equals(nodeId).first();
  },

  /**
   * Get content by its own ID
   * @param id - The content record ID
   * @returns The content record or undefined if not found
   */
  async getById(id: string): Promise<ContentInterface | undefined> {
    return database.contents.get(id);
  },

  /**
   * Get all content records for multiple nodes
   * Useful for batch operations like export
   * @param nodeIds - Array of node IDs
   * @returns Array of content records
   */
  async getByNodeIds(nodeIds: string[]): Promise<ContentInterface[]> {
    return database.contents.where("nodeId").anyOf(nodeIds).toArray();
  },

  /**
   * Check if content exists for a node
   * @param nodeId - The parent node ID
   * @returns True if content exists
   */
  async existsForNode(nodeId: string): Promise<boolean> {
    const count = await database.contents
      .where("nodeId")
      .equals(nodeId)
      .count();
    return count > 0;
  },
};
