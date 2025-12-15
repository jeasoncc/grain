/**
 * Drawing Repository
 *
 * Provides CRUD operations for the drawings table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type { DrawingInterface, DrawingUpdateInput } from "./drawing.interface";
import { DrawingBuilder } from "./drawing.builder";
import { DEFAULT_DRAWING_WIDTH, DEFAULT_DRAWING_HEIGHT } from "./drawing.schema";

/**
 * Drawing Repository
 *
 * Provides methods for:
 * - CRUD: add, update, delete, get
 * - Query: getByProject, search
 */
export const DrawingRepository = {
  /**
   * Add a new drawing
   * @param projectId - The project/workspace ID
   * @param name - The drawing name
   * @param options - Optional drawing properties
   * @returns The created drawing
   */
  async add(
    projectId: string,
    name: string,
    options: {
      content?: string;
      width?: number;
      height?: number;
    } = {}
  ): Promise<DrawingInterface> {
    const builder = new DrawingBuilder().project(projectId).name(name);

    if (options.content !== undefined) {
      builder.content(options.content);
    }
    if (options.width !== undefined) {
      builder.width(options.width);
    }
    if (options.height !== undefined) {
      builder.height(options.height);
    }

    const drawing = builder.build();
    await database.drawings.add(drawing);
    return drawing;
  },

  /**
   * Update an existing drawing
   * @param id - The drawing ID
   * @param updates - Partial drawing updates
   * @returns The number of records updated (0 or 1)
   */
  async update(id: string, updates: DrawingUpdateInput): Promise<number> {
    return database.drawings.update(id, {
      ...updates,
      updatedAt: dayjs().toISOString(),
    });
  },

  /**
   * Delete a drawing by ID
   * @param id - The drawing ID
   */
  async delete(id: string): Promise<void> {
    await database.drawings.delete(id);
  },

  /**
   * Delete all drawings for a project
   * @param projectId - The project/workspace ID
   */
  async deleteByProject(projectId: string): Promise<void> {
    await database.drawings.where("project").equals(projectId).delete();
  },

  /**
   * Get a drawing by ID
   * @param id - The drawing ID
   * @returns The drawing or undefined if not found
   */
  async getById(id: string): Promise<DrawingInterface | undefined> {
    return database.drawings.get(id);
  },

  /**
   * Get all drawings for a project
   * @param projectId - The project/workspace ID
   * @returns Array of drawings sorted by name
   */
  async getByProject(projectId: string): Promise<DrawingInterface[]> {
    const drawings = await database.drawings
      .where("project")
      .equals(projectId)
      .toArray();
    return drawings.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Get all drawings
   * @returns Array of all drawings
   */
  async getAll(): Promise<DrawingInterface[]> {
    return database.drawings.toArray();
  },

  /**
   * Search drawings by name
   * @param projectId - The project/workspace ID
   * @param query - Search query string
   * @returns Array of matching drawings
   */
  async search(projectId: string, query: string): Promise<DrawingInterface[]> {
    const lowerQuery = query.toLowerCase();
    const drawings = await database.drawings
      .where("project")
      .equals(projectId)
      .toArray();

    return drawings.filter((drawing) =>
      drawing.name.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Check if a drawing exists
   * @param id - The drawing ID
   * @returns True if the drawing exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await database.drawings.where("id").equals(id).count();
    return count > 0;
  },

  /**
   * Check if a drawing with the given name exists in a project
   * @param projectId - The project/workspace ID
   * @param name - The drawing name to check
   * @returns True if a drawing with this name exists
   */
  async existsByName(projectId: string, name: string): Promise<boolean> {
    const drawings = await database.drawings
      .where("project")
      .equals(projectId)
      .toArray();

    return drawings.some(
      (drawing) => drawing.name.toLowerCase() === name.toLowerCase()
    );
  },

  /**
   * Count drawings for a project
   * @param projectId - The project/workspace ID
   * @returns The count of drawings
   */
  async countByProject(projectId: string): Promise<number> {
    return database.drawings.where("project").equals(projectId).count();
  },

  /**
   * Count all drawings
   * @returns The total count of drawings
   */
  async count(): Promise<number> {
    return database.drawings.count();
  },

  /**
   * Update drawing name
   * @param id - The drawing ID
   * @param name - The new name
   */
  async updateName(id: string, name: string): Promise<void> {
    await this.update(id, { name });
  },

  /**
   * Update drawing content
   * @param id - The drawing ID
   * @param content - The new Excalidraw JSON content
   */
  async updateContent(id: string, content: string): Promise<void> {
    await this.update(id, { content });
  },

  /**
   * Update drawing dimensions
   * @param id - The drawing ID
   * @param width - The new width
   * @param height - The new height
   */
  async updateDimensions(
    id: string,
    width: number,
    height: number
  ): Promise<void> {
    await this.update(id, { width, height });
  },

  /**
   * Get recently updated drawings
   * @param projectId - The project/workspace ID
   * @param limit - Maximum number of drawings to return
   * @returns Array of recently updated drawings
   */
  async getRecent(
    projectId: string,
    limit: number = 10
  ): Promise<DrawingInterface[]> {
    const drawings = await database.drawings
      .where("project")
      .equals(projectId)
      .toArray();

    return drawings
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  },

  /**
   * Duplicate a drawing
   * @param id - The drawing ID to duplicate
   * @param newName - Optional new name for the duplicate
   * @returns The duplicated drawing or undefined if original not found
   */
  async duplicate(
    id: string,
    newName?: string
  ): Promise<DrawingInterface | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const duplicateName = newName || `${original.name} (Copy)`;
    return this.add(original.project, duplicateName, {
      content: original.content,
      width: original.width,
      height: original.height,
    });
  },
};

// Re-export default dimensions for convenience
export { DEFAULT_DRAWING_WIDTH, DEFAULT_DRAWING_HEIGHT };
