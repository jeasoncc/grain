/**
 * @file types/tag/tag.builder.ts
 * @description 标签 Builder
 *
 * 实现用于创建 Tag 对象的 Builder 模式。
 * 提供带有链式方法的流畅 API 来设置属性。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs";
import type { TagInterface } from "./tag.interface";
import { TagSchema } from "./tag.schema";

/**
 * Builder 内部使用的可变类型
 * 用于在构建过程中修改数据
 */
type MutableTag = {
	-readonly [K in keyof TagInterface]: TagInterface[K];
};

/**
 * TagBuilder 类
 *
 * 提供用于构建 Tag 对象的流畅 API：
 * - 可选属性的合理默认值
 * - 方法链式调用，代码清晰易读
 * - build() 时进行 Zod 校验
 * - 使用 Object.freeze() 返回不可变对象
 */
export class TagBuilder {
	private data: Partial<MutableTag> = {};

	constructor() {
		// 设置合理的默认值
		const now = dayjs().toISOString();
		this.data = {
			count: 1,
			lastUsed: now,
			createDate: now,
		};
	}

	/**
	 * 设置标签 ID
	 * @param id - 标签的唯一标识符（通常与 name 相同）
	 * @returns this builder 用于链式调用
	 */
	id(id: string): this {
		this.data.id = id;
		return this;
	}

	/**
	 * 设置标签名称
	 * @param name - 标签显示名称
	 * @returns this builder 用于链式调用
	 */
	name(name: string): this {
		this.data.name = name;
		// 如果未设置 id，则使用 name 作为 id
		if (!this.data.id) {
			this.data.id = name;
		}
		return this;
	}

	/**
	 * 设置工作区 ID
	 * @param workspace - 工作区的 UUID
	 * @returns this builder 用于链式调用
	 */
	workspace(workspace: string): this {
		this.data.workspace = workspace;
		return this;
	}

	/**
	 * 设置使用计数
	 * @param count - 使用此标签的文档数量
	 * @returns this builder 用于链式调用
	 */
	count(count: number): this {
		this.data.count = count;
		return this;
	}

	/**
	 * 设置最后使用时间戳
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	lastUsed(timestamp: string): this {
		this.data.lastUsed = timestamp;
		return this;
	}

	/**
	 * 设置创建日期时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	createDate(timestamp: string): this {
		this.data.createDate = timestamp;
		return this;
	}

	/**
	 * 从现有标签对象初始化 Builder
	 * @param tag - 现有的标签对象
	 * @returns this builder 用于链式调用
	 */
	from(tag: TagInterface): this {
		this.data = { ...tag };
		return this;
	}

	/**
	 * 增加使用计数
	 * @param amount - 增加的数量（默认为 1）
	 * @returns this builder 用于链式调用
	 */
	incrementCount(amount = 1): this {
		this.data.count = (this.data.count || 0) + amount;
		this.data.lastUsed = dayjs().toISOString();
		return this;
	}

	/**
	 * 减少使用计数
	 * @param amount - 减少的数量（默认为 1）
	 * @returns this builder 用于链式调用
	 */
	decrementCount(amount = 1): this {
		this.data.count = Math.max(0, (this.data.count || 0) - amount);
		return this;
	}

	/**
	 * 构建并校验 Tag 对象
	 * @returns 经过校验的不可变 TagInterface 对象
	 * @throws ZodError 如果校验失败
	 */
	build(): TagInterface {
		// 确保 id 存在（如果未设置，使用 name）
		if (!this.data.id && this.data.name) {
			this.data.id = this.data.name;
		}

		// 确保时间戳存在
		const now = dayjs().toISOString();
		if (!this.data.lastUsed) {
			this.data.lastUsed = now;
		}
		if (!this.data.createDate) {
			this.data.createDate = now;
		}

		// 校验并返回不可变对象
		const result = TagSchema.parse(this.data);
		return Object.freeze(result) as TagInterface;
	}

	/**
	 * 构建用于更新操作的部分 Tag 对象
	 * 不需要所有字段，只校验提供的字段
	 * @returns 带有更新的 lastUsed 的部分 TagInterface 对象
	 */
	buildPartial(): Partial<TagInterface> {
		// 部分构建时更新 lastUsed
		this.data.lastUsed = dayjs().toISOString();
		return Object.freeze({ ...this.data }) as Partial<TagInterface>;
	}

	/**
	 * 重置 Builder 到初始状态
	 * 用于重用同一个 Builder 实例
	 * @returns this builder 用于链式调用
	 */
	reset(): this {
		const now = dayjs().toISOString();
		this.data = {
			count: 1,
			lastUsed: now,
			createDate: now,
		};
		return this;
	}
}
