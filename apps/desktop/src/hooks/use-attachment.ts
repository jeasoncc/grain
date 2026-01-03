/**
 * @file hooks/use-attachment.ts
 * @description Attachment React Hooks
 *
 * Provides React hooks for accessing attachment data.
 * Uses TanStack Query for data fetching from Rust backend.
 *
 * @requirements 8.3
 */

import {
	useAttachment as useAttachmentQuery,
	useAttachments as useAttachmentsQuery,
	useAttachmentsByProject as useAttachmentsByProjectQuery,
	useAttachmentsByType as useAttachmentsByTypeQuery,
	useAudioFilesByProject as useAudioFilesByProjectQuery,
	useImagesByProject as useImagesByProjectQuery,
} from "@/queries";
import type { AttachmentInterface, AttachmentType } from "@/types/attachment";

/**
 * Hook to get all attachments
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
	const { data } = useAttachmentsQuery();
	return data;
}

/**
 * Hook to get a single attachment by ID
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
	attachmentId: string | null | undefined,
): AttachmentInterface | undefined {
	const { data } = useAttachmentQuery(attachmentId);
	return data ?? undefined;
}

/**
 * Hook to get attachments by project ID
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
	projectId: string | null | undefined,
): AttachmentInterface[] | undefined {
	const { data } = useAttachmentsByProjectQuery(projectId);
	return data;
}

/**
 * Hook to get attachments by type
 *
 * @param type - The attachment type (can be null/undefined)
 * @returns Array of attachments of the specified type
 */
export function useAttachmentsByType(
	type: AttachmentType | null | undefined,
): AttachmentInterface[] | undefined {
	// For global type filtering, we get all attachments and filter
	const { data: allAttachments } = useAttachmentsQuery();
	if (!type || !allAttachments) return allAttachments;
	return allAttachments.filter((a) => a.type === type);
}

/**
 * Hook to get attachments by project and type
 *
 * @param projectId - The project ID
 * @param type - The attachment type
 * @returns Array of attachments matching both criteria
 */
export function useAttachmentsByProjectAndType(
	projectId: string | null | undefined,
	type: AttachmentType | null | undefined,
): AttachmentInterface[] | undefined {
	const { data } = useAttachmentsByTypeQuery(projectId, type);
	return data;
}

/**
 * Hook to get image attachments for a project
 *
 * @param projectId - The project ID
 * @returns Array of image attachments
 */
export function useProjectImages(
	projectId: string | null | undefined,
): AttachmentInterface[] | undefined {
	const { data } = useImagesByProjectQuery(projectId);
	return data;
}

/**
 * Hook to get audio attachments for a project
 *
 * @param projectId - The project ID
 * @returns Array of audio attachments
 */
export function useProjectAudioFiles(
	projectId: string | null | undefined,
): AttachmentInterface[] | undefined {
	const { data } = useAudioFilesByProjectQuery(projectId);
	return data;
}

/**
 * Hook to get global attachments (not associated with any project)
 *
 * @returns Array of global attachments
 */
export function useGlobalAttachments(): AttachmentInterface[] | undefined {
	const { data: allAttachments } = useAttachmentsQuery();
	if (!allAttachments) return undefined;
	return allAttachments.filter((a) => !a.project);
}

/**
 * Hook to count attachments
 *
 * @returns The count of attachments or undefined while loading
 */
export function useAttachmentCount(): number | undefined {
	const { data: allAttachments } = useAttachmentsQuery();
	return allAttachments?.length;
}

/**
 * Hook to count attachments by project
 *
 * @param projectId - The project ID
 * @returns The count of attachments for the project
 */
export function useAttachmentCountByProject(
	projectId: string | null | undefined,
): number | undefined {
	const { data: attachments } = useAttachmentsByProjectQuery(projectId);
	return attachments?.length;
}

/**
 * Hook to check if an attachment exists
 *
 * @param attachmentId - The attachment ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useAttachmentExists(
	attachmentId: string | null | undefined,
): boolean | undefined {
	const { data, isLoading } = useAttachmentQuery(attachmentId);
	if (isLoading) return undefined;
	return data !== null && data !== undefined;
}

/**
 * Hook to get total size of attachments for a project
 *
 * @param projectId - The project ID
 * @returns Total size in bytes or undefined while loading
 */
export function useProjectAttachmentSize(
	projectId: string | null | undefined,
): number | undefined {
	const { data: attachments } = useAttachmentsByProjectQuery(projectId);
	if (!attachments) return undefined;
	return attachments.reduce((total, a) => total + (a.size || 0), 0);
}
