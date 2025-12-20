/**
 * Drawing Model - Unified Exports
 *
 * Exports all drawing-related types, schemas, builder, repository, and hooks.
 *
 * @requirements 2.1
 */

// Interface exports
export type {
  DrawingInterface,
  DrawingCreateInput,
  DrawingUpdateInput,
} from "./drawing.interface";

// Schema exports
export {
  DrawingSchema,
  DrawingCreateSchema,
  DrawingUpdateSchema,
  DEFAULT_DRAWING_WIDTH,
  DEFAULT_DRAWING_HEIGHT,
} from "./drawing.schema";

export type {
  DrawingSchemaType,
  DrawingCreateSchemaType,
  DrawingUpdateSchemaType,
} from "./drawing.schema";

// Builder export
export { DrawingBuilder } from "./drawing.builder";

// Repository export
export { DrawingRepository } from "./drawing.repository";

// Hooks exports
export {
  useDrawingsByProject,
  useDrawing,
  useDrawingSearch,
  useDrawingCount,
  useDrawingExists,
  useRecentDrawings,
  useAllDrawings,
} from "./drawing.hooks";

// Utils exports (pure functions)
export {
  sanitizeDrawingContent,
  isValidDrawingSize,
  getSafeDrawingDimensions,
  hasInvalidAppState,
  MAX_COORD,
  MAX_ELEMENT_SIZE,
  EMPTY_DRAWING_CONTENT,
} from "./drawing.utils";
