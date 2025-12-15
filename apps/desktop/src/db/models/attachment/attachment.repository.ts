/**
 * Attachment Repository
 *
 * Provides CRUD operations for the attachments table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type {
  AttachmentInterface,
  AttachmentType,
  AttachmentUpdateInput,
} from "./attachment.interface";
import { AttachmentBuilder } from "./attachment.builder";

/**
 * Attachment Repository
 *
 * Provides methods for:
 * - CRUD: add, update, delete, get
 * - Query: getAll, getByProject, getByType
 */
export const AttachmentRepository = {
  /**
   * Add a new attachment
   * @param fileName - The file name
   * @param filePath - The file path
   * @param type - The attachment type
   * @param options - Optional attachment properties
   * @returns The created attachment
   */
  async add(
    fileName: string,
    filePath: string,
    type: AttachmentType,
    options: {
      project?: string;
      size?: number;
      mimeType?: string;
    } = {}
  ): Promise<AttachmentInterface> {
    const builder = new AttachmentBuilder()
      .fileName(fileName)
      .filePath(filePath)
      .type(type);

    if (options.project) {
      builder.project(options.project);
    }
    if (options.size !== undefined) {
      builder.size(options.size);
    }
    if (options.mimeType) {
      builder.mimeType(options.mimeType);
    }

    const attachment = builder.build();
    await database.attachments.add(attachment);
    return attachment;
  },

  /**
   * Update an existing attachment
   * @param id - The attachment ID
   * @param updates - Partial attachment updates
   * @returns The number of records updated (0 or 1)
   */
  async update(id: string, updates: AttachmentUpdateInput): Promise<number> {
    return database.attachments.update(id, updates);
  },

  /**
   * Delete an attachment by ID
   * @param id - The attachment ID
   */
  async delete(id: string): Promise<void> {
    await database.attachments.delete(id);
  },

  /**
   * Get an attachment by ID
   * @param id - The attachment ID
   * @returns The attachment or undefined if not found
   */
  async getById(id: string): Promise<AttachmentInterface | undefined> {
    return database.attachments.get(id);
  },

  /**
   * Get all attachments
   * @returns Array of all attachments sorted by uploadedAt (most recent first)
   */
  async getAll(): Promise<AttachmentInterface[]> {
    const attachments = await database.attachments.toArray();
    return attachments.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  },

  /**
   * Get attachments by project ID
   * @param projectId - The project ID
   * @returns Array of attachments for the project
   */
  async getByProject(projectId: string): Promise<AttachmentInterface[]> {
    const attachments = await database.attachments
      .where("project")
      .equals(projectId)
      .toArray();
    return attachments.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  },

  /**
   * Get attachments by type
   * @param type - The attachment type
   * @returns Array of attachments of the specified type
   */
  async getByType(type: AttachmentType): Promise<AttachmentInterface[]> {
    const attachments = await database.attachments.toArray();
    return attachments
      .filter((a) => a.type === type)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  },

  /**
   * Get attachments by project and type
   * @param projectId - The project ID
   * @param type - The attachment type
   * @returns Array of attachments matching both criteria
   */
  async getByProjectAndType(
    projectId: string,
    type: AttachmentType
  ): Promise<AttachmentInterface[]> {
    const attachments = await database.attachments
      .where("project")
      .equals(projectId)
      .toArray();
    return attachments
      .filter((a) => a.type === type)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  },

  /**
   * Check if an attachment exists
   * @param id - The attachment ID
   * @returns True if the attachment exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await database.attachments.where("id").equals(id).count();
    return count > 0;
  },

  /**
   * Count all attachments
   * @returns The total number of attachments
   */
  async count(): Promise<number> {
    return database.attachments.count();
  },

  /**
   * Count attachments by project
   * @param projectId - The project ID
   * @returns The number of attachments for the project
   */
  async countByProject(projectId: string): Promise<number> {
    return database.attachments.where("project").equals(projectId).count();
  },

  /**
   * Delete all attachments for a project
   * @param projectId - The project ID
   * @returns The number of deleted attachments
   */
  async deleteByProject(projectId: string): Promise<number> {
    return database.attachments.where("project").equals(projectId).delete();
  },

  /**
   * Get global attachments (not associated with any project)
   * @returns Array of global attachments
   */
  async getGlobalAttachments(): Promise<AttachmentInterface[]> {
    const attachments = await database.attachments.toArray();
    return attachments
      .filter((a) => !a.project)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  },

  /**
   * Get total size of attachments for a project
   * @param projectId - The project ID
   * @returns Total size in bytes
   */
  async getTotalSizeByProject(projectId: string): Promise<number> {
    const attachments = await database.attachments
      .where("project")
      .equals(projectId)
      .toArray();
    return attachments.reduce((total, a) => total + (a.size || 0), 0);
  },

  /**
   * Get images for a project
   * Convenience method for getting image attachments
   * @param projectId - The project ID
   * @returns Array of image attachments
   */
  async getImages(projectId: string): Promise<AttachmentInterface[]> {
    return this.getByProjectAndType(projectId, "image");
  },

  /**
   * Get audio files for a project
   * Convenience method for getting audio attachments
   * @param projectId - The project ID
   * @returns Array of audio attachments
   */
  async getAudioFiles(projectId: string): Promise<AttachmentInterface[]> {
    return this.getByProjectAndType(projectId, "audio");
  },
};
