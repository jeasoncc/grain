/**
 * @file node.builder.ts
 * @description Node Builder
 *
 * 实现用于创建 Node 对象的函数式 Builder 模式。
 * 提供带有可链式调用方法的流畅 API。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs"
import { v4 as uuidv4 } from "uuid"
import type { NodeInterface, NodeType } from "./node.interface"
import { NodeSchema } from "./node.schema"

/**
 * 函数式 NodeBuilder 类型
 * 提供用于构建 Node 对象的流畅 API
 */
export interface NodeBuilder {
	readonly workspace: (id: string) => NodeBuilder
	readonly parent: (id: string | null) => NodeBuilder
	readonly type: (type: NodeType) => NodeBuilder
	readonly title: (title: string) => NodeBuilder
	readonly order: (order: number) => NodeBuilder
	readonly collapsed: (collapsed: boolean) => NodeBuilder
	readonly id: (id: string) => NodeBuilder
	readonly createDate: (timestamp: string) => NodeBuilder
	readonly lastEdit: (timestamp: string) => NodeBuilder
	readonly tags: (tags: readonly string[]) => NodeBuilder
	readonly from: (node: NodeInterface) => NodeBuilder
	readonly build: () => NodeInterface
	readonly buildPartial: () => Partial<NodeInterface>
}

/**
 * 创建函数式 NodeBuilder 实例
 * @param initialData - 初始数据（可选）
 * @returns NodeBuilder 实例
 */
const createNodeBuilder = (initialData?: Partial<NodeInterface>): NodeBuilder => {
	const now = dayjs().toISOString()
	const defaultData: Partial<NodeInterface> = {
		collapsed: true,
		createDate: now,
		id: uuidv4(),
		lastEdit: now,
		order: 0,
		parent: null,
		title: "New Node",
		type: "file",
		...initialData,
	}

	const createBuilder = (data: Partial<NodeInterface>): NodeBuilder => ({
		build: (): NodeInterface => {
			const now = dayjs().toISOString()
			const finalData = {
				...data,
				createDate: data.createDate || now,
				lastEdit: data.lastEdit || now,
			}

			const result = NodeSchema.parse(finalData)
			return Object.freeze(result) as NodeInterface
		},

		buildPartial: (): Partial<NodeInterface> => {
			const finalData = {
				...data,
				lastEdit: dayjs().toISOString(),
			}
			return Object.freeze(finalData) as Partial<NodeInterface>
		},
		collapsed: (collapsed: boolean) => createBuilder({ ...data, collapsed }),
		createDate: (timestamp: string) => createBuilder({ ...data, createDate: timestamp }),
		from: (node: NodeInterface) => createBuilder({ ...data, ...node }),
		id: (id: string) => createBuilder({ ...data, id }),
		lastEdit: (timestamp: string) => createBuilder({ ...data, lastEdit: timestamp }),
		order: (order: number) => createBuilder({ ...data, order }),
		parent: (id: string | null) => createBuilder({ ...data, parent: id }),
		tags: (tags: readonly string[]) => createBuilder({ ...data, tags: [...tags] }),
		title: (title: string) => createBuilder({ ...data, title }),
		type: (type: NodeType) => createBuilder({ ...data, type }),
		workspace: (id: string) => createBuilder({ ...data, workspace: id }),
	})

	return createBuilder(defaultData)
}

/**
 * 创建新的 NodeBuilder 实例
 * @returns NodeBuilder 实例
 */
export const NodeBuilder = (): NodeBuilder => createNodeBuilder()

/**
 * 从现有节点对象创建 NodeBuilder 实例
 * @param node - 现有的节点对象
 * @returns NodeBuilder 实例
 */
export const NodeBuilderFrom = (node: NodeInterface): NodeBuilder => createNodeBuilder(node)
