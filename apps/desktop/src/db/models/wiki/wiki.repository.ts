/**
 * Wiki Repository
 *
 * Provides CRUD operations for the wikiEntries table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type { WikiInterface, WikiUpdateInput } from "./wiki.interface";
import { WikiBuilder } from "./wiki.builder";

/**
 * Wiki Repository
 *
 * Provides methods for:
 * - CRUD: add, update, delete, get
 * - Query: getByProject, search, getByTag
 */
export const WikiRepository = {
  /**
   * Add a new wiki entry
   * @param projectId - The project/workspace ID
   * @param name - The entry name
   * @param options - Optional wiki entry properties
   * @returns The created wiki entry
   */
  async add(
    projectId: string,
    name: string,
    options: {
      alias?: string[];
      tags?: string[];
      content?: string;
    } = {}
  ): Promise<WikiInterface> {
    const builder = new WikiBuilder().project(projectId).name(name);

    if (options.alias) {
      builder.alias(options.alias);
    }
    if (options.tags) {
      builder.tags(options.tags);
    }
    if (options.content) {
      builder.content(options.content);
    }

    const wiki = builder.build();
    await database.wikiEntries.add(wiki);
    return wiki;
  },

  /**
   * Update an existing wiki entry
   * @param id - The wiki entry ID
   * @param updates - Partial wiki entry updates
   * @returns The number of records updated (0 or 1)
   */
  async update(id: string, updates: WikiUpdateInput): Promise<number> {
    return database.wikiEntries.update(id, {
      ...updates,
      updatedAt: dayjs().toISOString(),
    });
  },

  /**
   * Delete a wiki entry by ID
   * @param id - The wiki entry ID
   */
  async delete(id: string): Promise<void> {
    await database.wikiEntries.delete(id);
  },

  /**
   * Delete all wiki entries for a project
   * @param projectId - The project/workspace ID
   */
  async deleteByProject(projectId: string): Promise<void> {
    await database.wikiEntries.where("project").equals(projectId).delete();
  },

  /**
   * Get a wiki entry by ID
   * @param id - The wiki entry ID
   * @returns The wiki entry or undefined if not found
   */
  async getById(id: string): Promise<WikiInterface | undefined> {
    return database.wikiEntries.get(id);
  },

  /**
   * Get all wiki entries for a project
   * @param projectId - The project/workspace ID
   * @returns Array of wiki entries sorted by name
   */
  async getByProject(projectId: string): Promise<WikiInterface[]> {
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Get all wiki entries
   * @returns Array of all wiki entries
   */
  async getAll(): Promise<WikiInterface[]> {
    return database.wikiEntries.toArray();
  },

  /**
   * Search wiki entries by name or alias
   * @param projectId - The project/workspace ID
   * @param query - Search query string
   * @returns Array of matching wiki entries
   */
  async search(projectId: string, query: string): Promise<WikiInterface[]> {
    const lowerQuery = query.toLowerCase();
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();

    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.alias.some((a) => a.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Get wiki entries by tag
   * @param projectId - The project/workspace ID
   * @param tag - Tag to filter by
   * @returns Array of wiki entries with the specified tag
   */
  async getByTag(projectId: string, tag: string): Promise<WikiInterface[]> {
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();

    return entries.filter((entry) => entry.tags.includes(tag));
  },

  /**
   * Get all unique tags for a project
   * @param projectId - The project/workspace ID
   * @returns Array of unique tags
   */
  async getAllTags(projectId: string): Promise<string[]> {
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();

    const tagSet = new Set<string>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  },

  /**
   * Check if a wiki entry exists
   * @param id - The wiki entry ID
   * @returns True if the wiki entry exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await database.wikiEntries.where("id").equals(id).count();
    return count > 0;
  },

  /**
   * Check if a wiki entry with the given name exists in a project
   * @param projectId - The project/workspace ID
   * @param name - The entry name to check
   * @returns True if an entry with this name exists
   */
  async existsByName(projectId: string, name: string): Promise<boolean> {
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();

    return entries.some(
      (entry) => entry.name.toLowerCase() === name.toLowerCase()
    );
  },

  /**
   * Count wiki entries for a project
   * @param projectId - The project/workspace ID
   * @returns The count of wiki entries
   */
  async countByProject(projectId: string): Promise<number> {
    return database.wikiEntries.where("project").equals(projectId).count();
  },

  /**
   * Count all wiki entries
   * @returns The total count of wiki entries
   */
  async count(): Promise<number> {
    return database.wikiEntries.count();
  },

  /**
   * Update wiki entry name
   * @param id - The wiki entry ID
   * @param name - The new name
   */
  async updateName(id: string, name: string): Promise<void> {
    await this.update(id, { name });
  },

  /**
   * Update wiki entry content
   * @param id - The wiki entry ID
   * @param content - The new content
   */
  async updateContent(id: string, content: string): Promise<void> {
    await this.update(id, { content });
  },

  /**
   * Add an alias to a wiki entry
   * @param id - The wiki entry ID
   * @param aliasName - The alias to add
   */
  async addAlias(id: string, aliasName: string): Promise<void> {
    const entry = await this.getById(id);
    if (!entry) return;

    const alias = [...entry.alias];
    if (!alias.includes(aliasName)) {
      alias.push(aliasName);
      await this.update(id, { alias });
    }
  },

  /**
   * Remove an alias from a wiki entry
   * @param id - The wiki entry ID
   * @param aliasName - The alias to remove
   */
  async removeAlias(id: string, aliasName: string): Promise<void> {
    const entry = await this.getById(id);
    if (!entry) return;

    const alias = entry.alias.filter((a) => a !== aliasName);
    await this.update(id, { alias });
  },

  /**
   * Add a tag to a wiki entry
   * @param id - The wiki entry ID
   * @param tag - The tag to add
   */
  async addTag(id: string, tag: string): Promise<void> {
    const entry = await this.getById(id);
    if (!entry) return;

    const tags = [...entry.tags];
    if (!tags.includes(tag)) {
      tags.push(tag);
      await this.update(id, { tags });
    }
  },

  /**
   * Remove a tag from a wiki entry
   * @param id - The wiki entry ID
   * @param tag - The tag to remove
   */
  async removeTag(id: string, tag: string): Promise<void> {
    const entry = await this.getById(id);
    if (!entry) return;

    const tags = entry.tags.filter((t) => t !== tag);
    await this.update(id, { tags });
  },

  /**
   * Find wiki entry by name or alias (exact match)
   * @param projectId - The project/workspace ID
   * @param nameOrAlias - Name or alias to find
   * @returns The wiki entry or undefined
   */
  async findByNameOrAlias(
    projectId: string,
    nameOrAlias: string
  ): Promise<WikiInterface | undefined> {
    const lowerName = nameOrAlias.toLowerCase();
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();

    return entries.find(
      (entry) =>
        entry.name.toLowerCase() === lowerName ||
        entry.alias.some((a) => a.toLowerCase() === lowerName)
    );
  },

  /**
   * Get recently updated wiki entries
   * @param projectId - The project/workspace ID
   * @param limit - Maximum number of entries to return
   * @returns Array of recently updated wiki entries
   */
  async getRecent(projectId: string, limit: number = 10): Promise<WikiInterface[]> {
    const entries = await database.wikiEntries
      .where("project")
      .equals(projectId)
      .toArray();

    return entries
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  },
};
