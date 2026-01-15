/**
 * @file node.builder.ts
 * @description Node Builder
 *
 * 实现用于创建 Node 对象的函数式 Builder 模式。
 * 提供带有可链式调用方法的流畅 API。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import type { NodeInterface, NodeType } from "./node.interface";
import { NodeSchema } from "./node.schema";

/**
 * 函数式 NodeBuilder 类型
 * 提供用于构建 Node 对象的流畅 API
 */
export interface NodeBuilder {
	readonly workspace: (id: string) => NodeBuilder;
	readonly parent: (id: string | null) => NodeBuilder;
	readonly type: (type: NodeType) => NodeBuilder;
	readonly title: (title: string) => NodeBuilder;
	readonly order: (order: number) => NodeBuilder;
	readonly collapsed: (collapsed: boolean) => NodeBuilder;
	readonly id: (id: string) => NodeBuilder;
	readonly createDate: (timestamp: string) => NodeBuilder;
	readonly lastEdit: (timestamp: string) => NodeBuilder;
	readonly tags: (tags: readonly string[]) => NodeBuilder;
	readonly from: (node: NodeInterface) => NodeBuilder;
	readonly build: () => NodeInterface;
	readonly buildPartial: () => Partial<NodeInterface>;
}

/**
 * 创建函数式 NodeBuilder 实例
 * @param initialData - 初始数据（可选）
 * @returns NodeBuilder 实例
 */
const createNodeBuilder = (initialData?: Partial<NodeInterface>): NodeBuilder => {
	const now = dayjs().toISOString();
	const defaultData: Partial<NodeInterface> = {
		id: uuidv4(),
		parent: null,
		type: "file",
		title: "New Node",
		order: 0,
		collapsed: true,
		createDate: now,
		lastEdit: now,
		...initialData,
	};

	const createBuilder = (data: Partial<NodeInterface>): NodeBuilder => ({
		workspace: (id: string) => createBuilder({ ...data, workspace: id }),
		parent: (id: string | null) => createBuilder({ ...data, parent: id }),
		type: (type: NodeType) => createBuilder({ ...data, type }),
		title: (title: string) => createBuilder({ ...data, title }),
		order: (order: number) => createBuilder({ ...data, order }),
		collapsed: (collapsed: boolean) => createBuilder({ ...data, collapsed }),
		id: (id: string) => createBuilder({ ...data, id }),
		createDate: (timestamp: string) => createBuilder({ ...data, createDate: timestamp }),
		lastEdit: (timestamp: string) => createBuilder({ ...data, lastEdit: timestamp }),
		tags: (tags: readonly string[]) => createBuilder({ ...data, tags: [...tags] }),
		from: (node: NodeInterface) => createBuilder({ ...data, ...node }),

		build: (): NodeInterface => {
			const now = dayjs().toISOString();
			const finalData = {
				...data,
				lastEdit: data.lastEdit || now,
				createDate: data.createDate || now,
			};

			const result = NodeSchema.parse(finalData);
			return Object.freeze(result) as NodeInterface;
		},

		buildPartial: (): Partial<NodeInterface> => {
			const finalData = {
				...data,
				lastEdit: dayjs().toISOString(),
			};
			return Object.freeze(finalData) as Partial<NodeInterface>;
		},
	});

	return createBuilder(defaultData);
};

/**
 * 创建新的 NodeBuilder 实例
 * @returns NodeBuilder 实例
 */
export const NodeBuilder = (): NodeBuilder => createNodeBuilder();

/**
 * 从现有节点对象创建 NodeBuilder 实例
 * @param node - 现有的节点对象
 * @returns NodeBuilder 实例
 */
export const NodeBuilderFrom = (node: NodeInterface): NodeBuilder => createNodeBuilder(node);
