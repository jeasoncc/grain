/**
 * Attachment Model - Unified Exports
 *
 * Exports all attachment-related types, schemas, builder, repository, and hooks.
 *
 * @requirements 2.1
 */

// Interface exports
export type {
  AttachmentInterface,
  AttachmentCreateInput,
  AttachmentUpdateInput,
  AttachmentType,
} from "./attachment.interface";

// Schema exports
export {
  AttachmentSchema,
  AttachmentCreateSchema,
  AttachmentUpdateSchema,
  AttachmentTypeSchema,
} from "./attachment.schema";

export type {
  AttachmentSchemaType,
  AttachmentCreateSchemaType,
  AttachmentUpdateSchemaType,
} from "./attachment.schema";

// Builder export
export { AttachmentBuilder } from "./attachment.builder";

// Repository export
export { AttachmentRepository } from "./attachment.repository";

// Hooks exports
export {
  useAllAttachments,
  useAttachment,
  useAttachmentsByProject,
  useAttachmentsByType,
  useAttachmentsByProjectAndType,
  useProjectImages,
  useProjectAudioFiles,
  useGlobalAttachments,
  useAttachmentCount,
  useAttachmentCountByProject,
  useAttachmentExists,
  useProjectAttachmentSize,
} from "./attachment.hooks";
