/**
 * @file flows/node/generate-node-content.flow.ts
 * @description 生成节点内容的 flow
 *
 * 职责：
 * - 封装 pipes 层的内容生成函数
 * - 提供给 hooks 层调用
 *
 * 依赖：pipes/, types/
 */

import { generateEmptyContent, getDefaultTitle } from "@/pipes/content"
import type { NodeType } from "@/types/node"

/**
 * 根据节点类型生成空内容
 *
 * @param type - 节点类型
 * @param title - 节点标题
 * @returns 序列化的空内容
 */
export const generateNodeContentFlow = (type: NodeType, title: string): string =>
	generateEmptyContent(type, title)

/**
 * 根据节点类型获取默认标题
 *
 * @param type - 节点类型
 * @returns 默认标题
 */
export const getNodeDefaultTitleFlow = (type: NodeType): string => getDefaultTitle(type)
