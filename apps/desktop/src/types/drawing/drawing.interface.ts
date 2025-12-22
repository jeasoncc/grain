/**
 * @file drawing.interface.ts
 * @description Drawing 接口定义
 *
 * 定义 Excalidraw 绘图的 DrawingInterface。
 * 绘图是项目级资源，可以嵌入文档或在画布编辑器中独立使用。
 *
 * @requirements 2.1
 */

import type { ISODateString, UUID } from "../shared";

/**
 * Drawing 接口 - Excalidraw 绘图
 *
 * 此接口表示可以：
 * - 独立的画布绘图
 * - 通过 Excalidraw 节点嵌入文档
 * - 在项目中的多个文档间共享
 */
export interface DrawingInterface {
	/** 绘图的唯一标识符 */
	readonly id: UUID;

	/** 此绘图所属的项目/工作区 ID */
	readonly project: UUID;

	/** 绘图名称/标题 */
	readonly name: string;

	/** Excalidraw 数据（JSON 字符串） */
	readonly content: string;

	/** 绘图画布宽度（像素） */
	readonly width: number;

	/** 绘图画布高度（像素） */
	readonly height: number;

	/** ISO 8601 格式的创建时间戳 */
	readonly createDate: ISODateString;

	/** ISO 8601 格式的最后更新时间戳 */
	readonly updatedAt: ISODateString;
}

/**
 * Drawing 创建输入类型
 * 用于创建新绘图
 * id、createDate 和 updatedAt 自动生成
 */
export interface DrawingCreateInput {
	project: UUID;
	name: string;
	content?: string;
	width?: number;
	height?: number;
}

/**
 * Drawing 更新输入类型
 * 用于更新现有绘图
 * 只有可变字段可以更新
 */
export interface DrawingUpdateInput {
	name?: string;
	content?: string;
	width?: number;
	height?: number;
	updatedAt?: ISODateString;
}
