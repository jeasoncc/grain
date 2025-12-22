/**
 * @file types/workspace/workspace.builder.ts
 * @description Workspace Builder
 *
 * 实现 Builder 模式用于创建 Workspace 对象。
 * 提供链式方法的流畅 API 用于设置属性。
 *
 * @requirements 2.3, 2.4
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import type { WorkspaceInterface } from "./workspace.interface";
import { WorkspaceSchema } from "./workspace.schema";

/**
 * Builder 内部使用的可变类型
 * 用于在构建过程中修改数据
 */
type MutableWorkspace = {
	-readonly [K in keyof WorkspaceInterface]: WorkspaceInterface[K];
};

/**
 * WorkspaceBuilder 类
 *
 * 提供流畅的 API 用于构建 Workspace 对象：
 * - 可选属性的合理默认值
 * - 方法链式调用，代码清晰易读
 * - build() 时进行 Zod 校验
 * - 返回不可变对象（Object.freeze）
 */
export class WorkspaceBuilder {
	private data: Partial<MutableWorkspace> = {};

	constructor() {
		// 设置合理的默认值
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			title: "New Workspace",
			author: "",
			description: "",
			publisher: "",
			language: "zh",
			lastOpen: now,
			createDate: now,
		};
	}

	/**
	 * 设置工作区 ID（可选，默认自动生成）
	 * @param id - 工作区的 UUID
	 * @returns this builder 用于链式调用
	 */
	id(id: string): this {
		this.data.id = id;
		return this;
	}

	/**
	 * 设置工作区标题
	 * @param title - 工作区的显示标题
	 * @returns this builder 用于链式调用
	 */
	title(title: string): this {
		this.data.title = title;
		return this;
	}

	/**
	 * 设置作者名称
	 * @param author - 作者名称
	 * @returns this builder 用于链式调用
	 */
	author(author: string): this {
		this.data.author = author;
		return this;
	}

	/**
	 * 设置描述
	 * @param description - 项目描述
	 * @returns this builder 用于链式调用
	 */
	description(description: string): this {
		this.data.description = description;
		return this;
	}

	/**
	 * 设置出版商
	 * @param publisher - 出版商信息
	 * @returns this builder 用于链式调用
	 */
	publisher(publisher: string): this {
		this.data.publisher = publisher;
		return this;
	}

	/**
	 * 设置语言
	 * @param language - 项目语言（如 "zh", "en"）
	 * @returns this builder 用于链式调用
	 */
	language(language: string): this {
		this.data.language = language;
		return this;
	}

	/**
	 * 设置 lastOpen 时间戳
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	lastOpen(timestamp: string): this {
		this.data.lastOpen = timestamp;
		return this;
	}

	/**
	 * 设置 createDate 时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	createDate(timestamp: string): this {
		this.data.createDate = timestamp;
		return this;
	}

	/**
	 * 设置团队成员
	 * @param members - 用户 ID 数组
	 * @returns this builder 用于链式调用
	 */
	members(members: string[]): this {
		this.data.members = members;
		return this;
	}

	/**
	 * 设置所有者
	 * @param ownerId - 所有者用户 ID
	 * @returns this builder 用于链式调用
	 */
	owner(ownerId: string): this {
		this.data.owner = ownerId;
		return this;
	}

	/**
	 * 从现有 Workspace 对象初始化 builder
	 * @param workspace - 现有的 WorkspaceInterface 对象
	 * @returns this builder 用于链式调用
	 */
	from(workspace: WorkspaceInterface): this {
		this.data = { ...workspace };
		return this;
	}

	/**
	 * 构建并校验 Workspace 对象
	 * @returns 经过校验的不可变 WorkspaceInterface 对象
	 * @throws ZodError 如果校验失败
	 */
	build(): WorkspaceInterface {
		// 如果构造后未显式设置，则更新 lastOpen 为当前时间
		const now = dayjs().toISOString();
		if (!this.data.lastOpen) {
			this.data.lastOpen = now;
		}
		if (!this.data.createDate) {
			this.data.createDate = now;
		}

		// 校验并返回不可变对象
		const result = WorkspaceSchema.parse(this.data);
		return Object.freeze(result) as WorkspaceInterface;
	}

	/**
	 * 构建用于更新操作的部分 Workspace 对象
	 * 不需要所有字段，只校验提供的字段
	 * @returns 带有更新的 lastOpen 的部分 WorkspaceInterface 对象
	 */
	buildPartial(): Partial<WorkspaceInterface> {
		// 部分构建时始终更新 lastOpen
		this.data.lastOpen = dayjs().toISOString();
		return Object.freeze({ ...this.data }) as Partial<WorkspaceInterface>;
	}

	/**
	 * 重置 builder 到初始状态
	 * 用于重用同一个 builder 实例
	 * @returns this builder 用于链式调用
	 */
	reset(): this {
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			title: "New Workspace",
			author: "",
			description: "",
			publisher: "",
			language: "zh",
			lastOpen: now,
			createDate: now,
		};
		return this;
	}
}
