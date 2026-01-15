/**
 * @file types/tag/tag.interface.ts
 * @description 标签接口定义
 *
 * 标签直接存储在 nodes.tags 数组中。
 * 此表是用于统计和图形可视化的聚合缓存。
 *
 * @requirements 2.1
 */

import type { ISODateString, UUID } from "../shared"

/**
 * 标签接口 - 聚合缓存
 *
 * 这不是数据的真实来源。真实来源是 nodes.tags 数组。
 * 此表提供：
 * - 标签使用统计
 * - 自动完成的快速查找
 * - 图形可视化的数据
 */
export interface TagInterface {
	/** 标签名称作为 ID（每个工作区唯一） */
	readonly id: string

	/** 标签显示名称 */
	readonly name: string

	/** 标签所属的工作区 */
	readonly workspace: UUID

	/** 使用此标签的文档数量 */
	readonly count: number

	/** 最后使用此标签的时间 */
	readonly lastUsed: ISODateString

	/** 首次创建此标签的时间 */
	readonly createDate: ISODateString
}

/**
 * 标签创建输入类型
 * 创建新标签时使用
 */
export interface TagCreateInput {
	readonly name: string
	readonly workspace: UUID
}

/**
 * 标签更新输入类型
 * 更新现有标签时使用
 */
export interface TagUpdateInput {
	readonly name?: string
	readonly count?: number
	readonly lastUsed?: ISODateString
}
