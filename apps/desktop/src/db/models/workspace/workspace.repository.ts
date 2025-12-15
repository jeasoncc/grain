/**
 * Workspace Repository
 *
 * Provides CRUD operations for the workspaces table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type { WorkspaceInterface, WorkspaceUpdateInput } from "./workspace.interface";
import { WorkspaceBuilder } from "./workspace.builder";

/**
 * Workspace Repository
 *
 * Provides methods for:
 * - CRUD: add, update, delete, get
 * - Query: getAll, getByOwner, search
 */
export const WorkspaceRepository = {
  /**
   * Add a new workspace
   * @param title - The workspace title
   * @param options - Optional workspace properties
   * @returns The created workspace
   */
  async add(
    title: string,
    options: {
      author?: string;
      description?: string;
      publisher?: string;
      language?: string;
      members?: string[];
      owner?: string;
    } = {}
  ): Promise<WorkspaceInterface> {
    const builder = new WorkspaceBuilder().title(title);

    if (options.author) {
      builder.author(options.author);
    }
    if (options.description) {
      builder.description(options.description);
    }
    if (options.publisher) {
      builder.publisher(options.publisher);
    }
    if (options.language) {
      builder.language(options.language);
    }
    if (options.members) {
      builder.members(options.members);
    }
    if (options.owner) {
      builder.owner(options.owner);
    }

    const workspace = builder.build();
    await database.workspaces.add(workspace);
    return workspace;
  },

  /**
   * Update an existing workspace
   * @param id - The workspace ID
   * @param updates - Partial workspace updates
   * @returns The number of records updated (0 or 1)
   */
  async update(id: string, updates: WorkspaceUpdateInput): Promise<number> {
    return database.workspaces.update(id, {
      ...updates,
      lastOpen: dayjs().toISOString(),
    });
  },

  /**
   * Delete a workspace by ID
   * Note: This does not delete associated nodes, wiki entries, etc.
   * Use deleteWithContents for cascading delete
   * @param id - The workspace ID
   */
  async delete(id: string): Promise<void> {
    await database.workspaces.delete(id);
  },

  /**
   * Delete a workspace and all its associated data
   * Deletes nodes, contents, wiki entries, drawings, and attachments
   * @param id - The workspace ID
   */
  async deleteWithContents(id: string): Promise<void> {
    await database.transaction(
      "rw",
      [
        database.workspaces,
        database.nodes,
        database.contents,
        database.wikiEntries,
        database.drawings,
        database.attachments,
      ],
      async () => {
        // Get all node IDs for this workspace
        const nodes = await database.nodes
          .where("workspace")
          .equals(id)
          .toArray();
        const nodeIds = nodes.map((n) => n.id);

        // Delete contents associated with nodes
        if (nodeIds.length > 0) {
          await database.contents.where("nodeId").anyOf(nodeIds).delete();
        }

        // Delete nodes
        await database.nodes.where("workspace").equals(id).delete();

        // Delete wiki entries
        await database.wikiEntries.where("project").equals(id).delete();

        // Delete drawings
        await database.drawings.where("project").equals(id).delete();

        // Delete attachments
        await database.attachments.where("project").equals(id).delete();

        // Delete the workspace itself
        await database.workspaces.delete(id);
      }
    );
  },

  /**
   * Get a workspace by ID
   * @param id - The workspace ID
   * @returns The workspace or undefined if not found
   */
  async getById(id: string): Promise<WorkspaceInterface | undefined> {
    return database.workspaces.get(id);
  },

  /**
   * Get all workspaces
   * @returns Array of all workspaces sorted by lastOpen (most recent first)
   */
  async getAll(): Promise<WorkspaceInterface[]> {
    const workspaces = await database.workspaces.toArray();
    return workspaces.sort(
      (a, b) => new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime()
    );
  },

  /**
   * Get workspaces by owner
   * @param ownerId - The owner user ID
   * @returns Array of workspaces owned by the user
   */
  async getByOwner(ownerId: string): Promise<WorkspaceInterface[]> {
    return database.workspaces.where("owner").equals(ownerId).toArray();
  },

  /**
   * Search workspaces by title
   * @param query - Search query string
   * @returns Array of matching workspaces
   */
  async searchByTitle(query: string): Promise<WorkspaceInterface[]> {
    const lowerQuery = query.toLowerCase();
    const workspaces = await database.workspaces.toArray();
    return workspaces.filter((w) =>
      w.title.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Update the lastOpen timestamp
   * @param id - The workspace ID
   */
  async touch(id: string): Promise<void> {
    await database.workspaces.update(id, {
      lastOpen: dayjs().toISOString(),
    });
  },

  /**
   * Check if a workspace exists
   * @param id - The workspace ID
   * @returns True if the workspace exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await database.workspaces.where("id").equals(id).count();
    return count > 0;
  },

  /**
   * Count all workspaces
   * @returns The total number of workspaces
   */
  async count(): Promise<number> {
    return database.workspaces.count();
  },

  /**
   * Get recently opened workspaces
   * @param limit - Maximum number of workspaces to return
   * @returns Array of recently opened workspaces
   */
  async getRecent(limit: number = 5): Promise<WorkspaceInterface[]> {
    const workspaces = await this.getAll();
    return workspaces.slice(0, limit);
  },

  /**
   * Update workspace title
   * @param id - The workspace ID
   * @param title - The new title
   */
  async updateTitle(id: string, title: string): Promise<void> {
    await this.update(id, { title });
  },

  /**
   * Update workspace description
   * @param id - The workspace ID
   * @param description - The new description
   */
  async updateDescription(id: string, description: string): Promise<void> {
    await this.update(id, { description });
  },

  /**
   * Add a member to a workspace
   * @param id - The workspace ID
   * @param memberId - The user ID to add
   */
  async addMember(id: string, memberId: string): Promise<void> {
    const workspace = await this.getById(id);
    if (!workspace) return;

    const members = workspace.members || [];
    if (!members.includes(memberId)) {
      members.push(memberId);
      await this.update(id, { members });
    }
  },

  /**
   * Remove a member from a workspace
   * @param id - The workspace ID
   * @param memberId - The user ID to remove
   */
  async removeMember(id: string, memberId: string): Promise<void> {
    const workspace = await this.getById(id);
    if (!workspace || !workspace.members) return;

    const members = workspace.members.filter((m) => m !== memberId);
    await this.update(id, { members });
  },
};
