/**
 * @file types/workspace/workspace.interface.ts
 * @description Workspace 接口定义
 *
 * 定义 WorkspaceInterface 用于项目/工作区元数据。
 * 工作区是组织节点、Wiki 条目、绘图和其他项目相关数据的顶级容器。
 *
 * @requirements 2.1
 */

import type { ISODateString, UUID } from "../shared";

/**
 * Workspace 接口 - 项目元数据
 *
 * 此接口表示一个工作区/项目，包含：
 * - 节点（文件树结构）
 * - Wiki 条目（知识库）
 * - 绘图（Excalidraw 画布）
 * - 附件（文件）
 */
export interface WorkspaceInterface {
	/** 工作区唯一标识符 */
	readonly id: UUID;

	/** 工作区显示标题 */
	readonly title: string;

	/** 作者名称 */
	readonly author: string;

	/** 项目描述 */
	readonly description: string;

	/** 出版商信息 */
	readonly publisher: string;

	/** 项目语言（如 "zh", "en"） */
	readonly language: string;

	/** 最后打开时间 */
	readonly lastOpen: ISODateString;

	/** 创建时间（ISO 8601 格式） */
	readonly createDate: ISODateString;

	/** 可选：团队成员（用户 ID 数组），用于协作工作区 */
	readonly members?: readonly string[];

	/** 可选：所有者用户 ID */
	readonly owner?: UUID;
}

/**
 * Workspace 创建输入类型
 * 用于创建新工作区
 * id、createDate 和 lastOpen 会自动生成
 */
export interface WorkspaceCreateInput {
	readonly title: string;
	readonly author?: string;
	readonly description?: string;
	readonly publisher?: string;
	readonly language?: string;
	readonly members?: readonly string[];
	readonly owner?: UUID;
}

/**
 * Workspace 更新输入类型
 * 用于更新现有工作区
 * 只有可变字段可以更新
 */
export interface WorkspaceUpdateInput {
	readonly title?: string;
	readonly author?: string;
	readonly description?: string;
	readonly publisher?: string;
	readonly language?: string;
	readonly lastOpen?: ISODateString;
	readonly members?: readonly string[];
	readonly owner?: UUID;
}
