/**
 * @file selection.schema.ts
 * @description Selection 状态的 Zod 运行时校验
 *
 * 用于校验外部数据（如 localStorage 恢复的状态）
 */

import { z } from "zod";

// ==============================
// State Schema
// ==============================

/**
 * Selection 状态校验 Schema
 */
export const selectionStateSchema = z.object({
	selectedWorkspaceId: z.string().nullable(),
	selectedNodeId: z.string().nullable(),
});

/**
 * 从 Schema 推断的类型（与 interface 保持一致）
 */
export type SelectionStateFromSchema = z.infer<typeof selectionStateSchema>;

// ==============================
// Payload Schemas
// ==============================

/**
 * 设置工作区 Payload 校验
 */
export const setWorkspacePayloadSchema = z.object({
	workspaceId: z.string().nullable(),
});

/**
 * 设置节点 Payload 校验
 */
export const setNodePayloadSchema = z.object({
	nodeId: z.string().nullable(),
});

// ==============================
// Config Schema
// ==============================

/**
 * Selection 配置校验
 */
export const selectionConfigSchema = z.object({
	storageKey: z.string().min(1),
	persistWorkspace: z.boolean(),
});

export type SelectionConfigFromSchema = z.infer<typeof selectionConfigSchema>;
