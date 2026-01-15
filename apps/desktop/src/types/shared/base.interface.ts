/**
 * @file base.interface.ts
 * @description 基础类型定义
 *
 * 定义所有数据模型共享的基础类型。
 * 这些类型确保实体标识和时间戳的一致性。
 *
 * @requirements 2.1
 */

/**
 * UUID 类型别名
 * 所有实体 ID 应使用 UUID v4 格式
 */
export type UUID = string

/**
 * ISO 8601 日期字符串类型别名
 * 所有时间戳应以 ISO 格式存储以保持一致性
 * 示例: "2024-01-15T10:30:00.000Z"
 */
export type ISODateString = string

/**
 * 基础实体接口
 * 所有持久化实体都应扩展此接口
 * 提供标识和审计的通用字段
 */
export interface BaseEntity {
	/** 使用 UUID v4 格式的唯一标识符 */
	readonly id: UUID

	/** ISO 8601 格式的创建时间戳 */
	readonly createDate: ISODateString

	/** ISO 8601 格式的最后修改时间戳 */
	readonly lastEdit: ISODateString
}

/**
 * 创建操作的可选基础实体字段
 * 创建实体时，id 和时间戳通常自动生成
 */
export type BaseEntityCreate = Partial<BaseEntity>

/**
 * 更新操作的可选基础实体字段
 * 更新时，通常只有 lastEdit 会自动修改
 */
export type BaseEntityUpdate = Partial<Omit<BaseEntity, "id" | "createDate">>
