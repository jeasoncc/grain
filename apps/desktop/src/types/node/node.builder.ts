/**
 * @file node.builder.ts
 * @description Node Builder
 *
 * 实现用于创建 Node 对象的 Builder 模式。
 * 提供带有可链式调用方法的流畅 API。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import type { NodeInterface, NodeType } from "./node.interface";
import { NodeSchema } from "./node.schema";

/**
 * Builder 内部使用的可变类型
 * 用于在构建过程中修改数据
 */
type MutableNode = {
	-readonly [K in keyof NodeInterface]: NodeInterface[K];
};

/**
 * NodeBuilder 类
 *
 * 提供用于构建 Node 对象的流畅 API：
 * - 可选属性的合理默认值
 * - 方法链式调用以获得清晰、可读的代码
 * - build() 时进行 Zod 验证
 * - 返回不可变对象（Object.freeze）
 */
export class NodeBuilder {
	private data: Partial<MutableNode> = {};

	constructor() {
		// 设置合理的默认值
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			parent: null,
			type: "file",
			title: "New Node",
			order: 0,
			collapsed: true,
			createDate: now,
			lastEdit: now,
		};
	}

	/**
	 * 设置此节点所属的工作区 ID
	 * @param id - 父工作区的 UUID
	 * @returns 用于链式调用的 this builder
	 */
	workspace(id: string): this {
		this.data.workspace = id;
		return this;
	}

	/**
	 * 设置父节点 ID
	 * @param id - 父节点的 UUID，根级节点为 null
	 * @returns 用于链式调用的 this builder
	 */
	parent(id: string | null): this {
		this.data.parent = id;
		return this;
	}

	/**
	 * 设置节点类型
	 * @param type - 节点类型（"folder" | "file" | "canvas" | "diary"）
	 * @returns 用于链式调用的 this builder
	 */
	type(type: NodeType): this {
		this.data.type = type;
		return this;
	}

	/**
	 * 设置节点标题
	 * @param title - 节点的显示标题
	 * @returns 用于链式调用的 this builder
	 */
	title(title: string): this {
		this.data.title = title;
		return this;
	}

	/**
	 * 设置排序顺序
	 * @param order - 兄弟节点间的排序顺序（从 0 开始）
	 * @returns 用于链式调用的 this builder
	 */
	order(order: number): this {
		this.data.order = order;
		return this;
	}

	/**
	 * 设置折叠状态
	 * @param collapsed - 文件夹是否折叠
	 * @returns 用于链式调用的 this builder
	 */
	collapsed(collapsed: boolean): this {
		this.data.collapsed = collapsed;
		return this;
	}

	/**
	 * 设置自定义 ID（可选，默认自动生成）
	 * @param id - 节点的 UUID
	 * @returns 用于链式调用的 this builder
	 */
	id(id: string): this {
		this.data.id = id;
		return this;
	}

	/**
	 * 设置自定义 createDate 时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns 用于链式调用的 this builder
	 */
	createDate(timestamp: string): this {
		this.data.createDate = timestamp;
		return this;
	}

	/**
	 * 设置自定义 lastEdit 时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns 用于链式调用的 this builder
	 */
	lastEdit(timestamp: string): this {
		this.data.lastEdit = timestamp;
		return this;
	}

	/**
	 * 设置标签数组
	 * @param tags - 标签字符串数组
	 * @returns 用于链式调用的 this builder
	 */
	tags(tags: string[]): this {
		this.data.tags = tags;
		return this;
	}

	/**
	 * 从现有节点复制数据
	 * @param node - 要复制的节点
	 * @returns 用于链式调用的 this builder
	 */
	from(node: NodeInterface): this {
		this.data = { ...node };
		return this;
	}

	/**
	 * 构建并验证 Node 对象
	 * @returns 一个经过验证的不可变 NodeInterface 对象
	 * @throws ZodError 如果验证失败
	 */
	build(): NodeInterface {
		// 如果构造后未显式设置，则更新 lastEdit 为当前时间
		const now = dayjs().toISOString();
		if (!this.data.lastEdit) {
			this.data.lastEdit = now;
		}
		if (!this.data.createDate) {
			this.data.createDate = now;
		}

		// 验证并返回不可变对象
		const result = NodeSchema.parse(this.data);
		return Object.freeze(result) as NodeInterface;
	}

	/**
	 * 为更新操作构建部分 Node 对象
	 * 不需要所有字段，只验证提供的字段
	 * @returns 带有更新的 lastEdit 的部分 NodeInterface 对象
	 */
	buildPartial(): Partial<NodeInterface> {
		// 部分构建时始终更新 lastEdit
		this.data.lastEdit = dayjs().toISOString();
		return Object.freeze({ ...this.data }) as Partial<NodeInterface>;
	}

	/**
	 * 重置 builder 到初始状态
	 * 用于重用同一个 builder 实例
	 * @returns 用于链式调用的 this builder
	 */
	reset(): this {
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			parent: null,
			type: "file",
			title: "New Node",
			order: 0,
			collapsed: true,
			createDate: now,
			lastEdit: now,
		};
		return this;
	}
}
