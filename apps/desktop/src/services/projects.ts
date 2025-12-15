/**
 * Projects Service - Backward Compatibility Layer
 * Re-exports from workspaces.ts for backward compatibility
 *
 * @deprecated Use workspaces.ts directly for new code
 * Requirements: 6.2
 */

// Re-export everything from workspaces for backward compatibility
export * from "./workspaces";

// Re-export types with legacy names
export type { WorkspaceInterface as ProjectInterface } from "@/db/models";
