/**
 * Attachment React Hooks
 *
 * Provides React hooks for accessing attachment data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../../database";
import type { AttachmentInterface, AttachmentType } from "./attachment.interface";

/**
 * Hook to get all attachments with live updates
 *
 * Returns attachments sorted by uploadedAt (most recent first).
 *
 * @returns Array of attachments or undefined while loading
 *
 * @example
 * ```tsx
 * function AttachmentList() {
 *   const attachments = useAllAttachments();
 *
 *   if (attachments === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {attachments.map(attachment => (
 *         <li key={attachment.id}>{attachment.fileName}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAllAttachments(): AttachmentInterface[] | undefined {
  return useLiveQuery(
    async () => {
      const attachments = await database.attachments.toArray();
      return attachments.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    },
    [],
    undefined
  );
}

/**
 * Hook to get a single attachment by ID with live updates
 *
 * @param attachmentId - The attachment ID (can be null/undefined)
 * @returns The attachment or undefined
 *
 * @example
 * ```tsx
 * function AttachmentDetail({ attachmentId }: { attachmentId: string }) {
 *   const attachment = useAttachment(attachmentId);
 *
 *   if (!attachment) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{attachment.fileName}</h1>;
 * }
 * ```
 */
export function useAttachment(
  attachmentId: string | null | undefined
): AttachmentInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!attachmentId) return undefined;
      return database.attachments.get(attachmentId);
    },
    [attachmentId],
    undefined
  );
}

/**
 * Hook to get attachments by project ID with live updates
 *
 * @param projectId - The project ID (can be null/undefined)
 * @returns Array of attachments for the project
 *
 * @example
 * ```tsx
 * function ProjectAttachments({ projectId }: { projectId: string }) {
 *   const attachments = useAttachmentsByProject(projectId);
 *
 *   if (attachments === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return <AttachmentGrid attachments={attachments} />;
 * }
 * ```
 */
export function useAttachmentsByProject(
  projectId: string | null | undefined
): AttachmentInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];
      const attachments = await database.attachments
        .where("project")
        .equals(projectId)
        .toArray();
      return attachments.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to get attachments by type with live updates
 *
 * @param type - The attachment type (can be null/undefined)
 * @returns Array of attachments of the specified type
 */
export function useAttachmentsByType(
  type: AttachmentType | null | undefined
): AttachmentInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!type) return [];
      const attachments = await database.attachments.toArray();
      return attachments
        .filter((a) => a.type === type)
        .sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    },
    [type],
    undefined
  );
}

/**
 * Hook to get attachments by project and type with live updates
 *
 * @param projectId - The project ID
 * @param type - The attachment type
 * @returns Array of attachments matching both criteria
 */
export function useAttachmentsByProjectAndType(
  projectId: string | null | undefined,
  type: AttachmentType | null | undefined
): AttachmentInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId || !type) return [];
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
    [projectId, type],
    undefined
  );
}

/**
 * Hook to get image attachments for a project
 *
 * @param projectId - The project ID
 * @returns Array of image attachments
 */
export function useProjectImages(
  projectId: string | null | undefined
): AttachmentInterface[] | undefined {
  return useAttachmentsByProjectAndType(projectId, "image");
}

/**
 * Hook to get audio attachments for a project
 *
 * @param projectId - The project ID
 * @returns Array of audio attachments
 */
export function useProjectAudioFiles(
  projectId: string | null | undefined
): AttachmentInterface[] | undefined {
  return useAttachmentsByProjectAndType(projectId, "audio");
}

/**
 * Hook to get global attachments (not associated with any project)
 *
 * @returns Array of global attachments
 */
export function useGlobalAttachments(): AttachmentInterface[] | undefined {
  return useLiveQuery(
    async () => {
      const attachments = await database.attachments.toArray();
      return attachments
        .filter((a) => !a.project)
        .sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    },
    [],
    undefined
  );
}

/**
 * Hook to count attachments
 *
 * @returns The count of attachments or undefined while loading
 */
export function useAttachmentCount(): number | undefined {
  return useLiveQuery(
    async () => {
      return database.attachments.count();
    },
    [],
    undefined
  );
}

/**
 * Hook to count attachments by project
 *
 * @param projectId - The project ID
 * @returns The count of attachments for the project
 */
export function useAttachmentCountByProject(
  projectId: string | null | undefined
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return 0;
      return database.attachments.where("project").equals(projectId).count();
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to check if an attachment exists
 *
 * @param attachmentId - The attachment ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useAttachmentExists(
  attachmentId: string | null | undefined
): boolean | undefined {
  return useLiveQuery(
    async () => {
      if (!attachmentId) return false;
      const count = await database.attachments
        .where("id")
        .equals(attachmentId)
        .count();
      return count > 0;
    },
    [attachmentId],
    undefined
  );
}

/**
 * Hook to get total size of attachments for a project
 *
 * @param projectId - The project ID
 * @returns Total size in bytes or undefined while loading
 */
export function useProjectAttachmentSize(
  projectId: string | null | undefined
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return 0;
      const attachments = await database.attachments
        .where("project")
        .equals(projectId)
        .toArray();
      return attachments.reduce((total, a) => total + (a.size || 0), 0);
    },
    [projectId],
    undefined
  );
}
