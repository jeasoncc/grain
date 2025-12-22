/**
 * @file drawing.builder.ts
 * @description Drawing Builder
 *
 * 实现 Drawing 对象的 Builder 模式。
 * 提供链式方法的流畅 API 来设置属性。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import type { DrawingInterface } from "./drawing.interface";
import {
	DEFAULT_DRAWING_HEIGHT,
	DEFAULT_DRAWING_WIDTH,
	DrawingSchema,
} from "./drawing.schema";

/**
 * 可变版本的 DrawingInterface，用于 Builder 内部构建
 * 移除 readonly 修饰符以允许属性赋值
 */
type MutableDrawing = {
	-readonly [K in keyof DrawingInterface]?: DrawingInterface[K];
};

/**
 * DrawingBuilder 类
 *
 * 提供构建 Drawing 对象的流畅 API：
 * - 可选属性的合理默认值
 * - 方法链式调用，代码清晰易读
 * - build() 时进行 Zod 校验
 */
export class DrawingBuilder {
	private data: MutableDrawing = {};

	constructor() {
		// 设置合理的默认值
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			name: "新绘图",
			content: "",
			width: DEFAULT_DRAWING_WIDTH,
			height: DEFAULT_DRAWING_HEIGHT,
			createDate: now,
			updatedAt: now,
		};
	}

	/**
	 * 设置绘图 ID（可选，默认自动生成）
	 * @param id - 绘图的 UUID
	 * @returns 返回 this 以支持链式调用
	 */
	id(id: string): this {
		this.data.id = id;
		return this;
	}

	/**
	 * 设置项目/工作区 ID
	 * @param projectId - 此绘图所属项目的 UUID
	 * @returns 返回 this 以支持链式调用
	 */
	project(projectId: string): this {
		this.data.project = projectId;
		return this;
	}

	/**
	 * 设置绘图名称
	 * @param name - 绘图的显示名称
	 * @returns 返回 this 以支持链式调用
	 */
	name(name: string): this {
		this.data.name = name;
		return this;
	}

	/**
	 * 设置绘图内容
	 * @param content - Excalidraw JSON 数据字符串
	 * @returns 返回 this 以支持链式调用
	 */
	content(content: string): this {
		this.data.content = content;
		return this;
	}

	/**
	 * 设置绘图宽度
	 * @param width - 画布宽度（像素）
	 * @returns 返回 this 以支持链式调用
	 */
	width(width: number): this {
		this.data.width = width;
		return this;
	}

	/**
	 * 设置绘图高度
	 * @param height - 画布高度（像素）
	 * @returns 返回 this 以支持链式调用
	 */
	height(height: number): this {
		this.data.height = height;
		return this;
	}

	/**
	 * 同时设置宽度和高度
	 * @param width - 画布宽度（像素）
	 * @param height - 画布高度（像素）
	 * @returns 返回 this 以支持链式调用
	 */
	dimensions(width: number, height: number): this {
		this.data.width = width;
		this.data.height = height;
		return this;
	}

	/**
	 * 设置 createDate 时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns 返回 this 以支持链式调用
	 */
	createDate(timestamp: string): this {
		this.data.createDate = timestamp;
		return this;
	}

	/**
	 * 设置 updatedAt 时间戳
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns 返回 this 以支持链式调用
	 */
	updatedAt(timestamp: string): this {
		this.data.updatedAt = timestamp;
		return this;
	}

	/**
	 * 从现有 Drawing 对象初始化
	 * @param drawing - 现有的 Drawing 对象
	 * @returns 返回 this 以支持链式调用
	 */
	from(drawing: DrawingInterface): this {
		this.data = { ...drawing };
		return this;
	}

	/**
	 * 构建并校验 Drawing 对象
	 * @returns 经过校验的不可变 DrawingInterface 对象
	 * @throws 校验失败时抛出 ZodError
	 */
	build(): DrawingInterface {
		// 如果未显式设置则更新时间戳
		const now = dayjs().toISOString();
		if (!this.data.createDate) {
			this.data.createDate = now;
		}
		if (!this.data.updatedAt) {
			this.data.updatedAt = now;
		}

		// 校验并返回不可变对象
		const result = DrawingSchema.parse(this.data);
		return Object.freeze(result) as DrawingInterface;
	}

	/**
	 * 构建用于更新操作的部分 Drawing 对象
	 * 不需要所有字段，只校验提供的字段
	 * @returns 带有更新时间戳的部分 DrawingInterface 对象
	 */
	buildPartial(): Partial<DrawingInterface> {
		// 部分构建时始终更新 updatedAt
		this.data.updatedAt = dayjs().toISOString();
		return Object.freeze({ ...this.data });
	}

	/**
	 * 重置 builder 到初始状态
	 * 用于复用同一个 builder 实例
	 * @returns 返回 this 以支持链式调用
	 */
	reset(): this {
		const now = dayjs().toISOString();
		this.data = {
			id: uuidv4(),
			name: "新绘图",
			content: "",
			width: DEFAULT_DRAWING_WIDTH,
			height: DEFAULT_DRAWING_HEIGHT,
			createDate: now,
			updatedAt: now,
		};
		return this;
	}
}
