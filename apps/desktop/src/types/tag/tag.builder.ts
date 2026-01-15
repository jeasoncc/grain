/**
 * @file types/tag/tag.builder.ts
 * @description 标签 Builder
 *
 * 实现用于创建 Tag 对象的函数式 Builder 模式。
 * 提供带有链式方法的流畅 API 来设置属性。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs"
import type { TagInterface } from "./tag.interface"
import { TagSchema } from "./tag.schema"

/**
 * 函数式 TagBuilder 类型
 * 提供用于构建 Tag 对象的流畅 API
 */
export interface TagBuilder {
	readonly id: (id: string) => TagBuilder
	readonly name: (name: string) => TagBuilder
	readonly workspace: (workspace: string) => TagBuilder
	readonly count: (count: number) => TagBuilder
	readonly lastUsed: (timestamp: string) => TagBuilder
	readonly createDate: (timestamp: string) => TagBuilder
	readonly from: (tag: TagInterface) => TagBuilder
	readonly incrementCount: (amount?: number) => TagBuilder
	readonly decrementCount: (amount?: number) => TagBuilder
	readonly build: () => TagInterface
	readonly buildPartial: () => Partial<TagInterface>
}

/**
 * 创建函数式 TagBuilder 实例
 * @param initialData - 初始数据（可选）
 * @returns TagBuilder 实例
 */
const createTagBuilder = (initialData?: Partial<TagInterface>): TagBuilder => {
	const now = dayjs().toISOString()
	const defaultData: Partial<TagInterface> = {
		count: 1,
		createDate: now,
		lastUsed: now,
		...initialData,
	}

	const createBuilder = (data: Partial<TagInterface>): TagBuilder => ({
		build: (): TagInterface => {
			const now = dayjs().toISOString()
			const finalData = {
				...data,
				createDate: data.createDate || now,
				// 确保 id 存在（如果未设置，使用 name）
				id: data.id || data.name || "",
				lastUsed: data.lastUsed || now,
			}

			const result = TagSchema.parse(finalData)
			return Object.freeze(result) as TagInterface
		},

		buildPartial: (): Partial<TagInterface> => {
			const finalData = {
				...data,
				lastUsed: dayjs().toISOString(),
			}
			return Object.freeze(finalData) as Partial<TagInterface>
		},
		count: (count: number) => createBuilder({ ...data, count }),
		createDate: (timestamp: string) => createBuilder({ ...data, createDate: timestamp }),

		decrementCount: (amount = 1) =>
			createBuilder({
				...data,
				count: Math.max(0, (data.count || 0) - amount),
			}),
		from: (tag: TagInterface) => createBuilder({ ...data, ...tag }),
		id: (id: string) => createBuilder({ ...data, id }),

		incrementCount: (amount = 1) =>
			createBuilder({
				...data,
				count: (data.count || 0) + amount,
				lastUsed: dayjs().toISOString(),
			}),
		lastUsed: (timestamp: string) => createBuilder({ ...data, lastUsed: timestamp }),

		name: (name: string) => {
			const newData = { ...data, name }
			// 如果未设置 id，则使用 name 作为 id
			if (!newData.id) {
				newData.id = name
			}
			return createBuilder(newData)
		},

		workspace: (workspace: string) => createBuilder({ ...data, workspace }),
	})

	return createBuilder(defaultData)
}

/**
 * 创建新的 TagBuilder 实例
 * @returns TagBuilder 实例
 */
export const TagBuilder = (): TagBuilder => createTagBuilder()

/**
 * 从现有标签对象创建 TagBuilder 实例
 * @param tag - 现有的标签对象
 * @returns TagBuilder 实例
 */
export const TagBuilderFrom = (tag: TagInterface): TagBuilder => createTagBuilder(tag)
