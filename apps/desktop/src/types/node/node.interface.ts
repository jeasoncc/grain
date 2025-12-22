/**
 * @file node.interface.ts
 * @description Node 接口定义
 *
 * 定义文件树结构中的节点接口。
 * 内容单独存储在 contents 表中，以优化大文档（5000+ 字符）的性能。
 *
 * @requirements 2.1
 */

import type { ISODateString, UUID } from "@/types/shared";

/**
 * 节点类型枚举
 * 定义文件树中不同类型的节点
 * - folder: 容器节点，可以包含子节点
 * - file: 使用 Lexical 编辑器的文本文档
 * - canvas: 使用 Excalidraw 的绘图
 * - diary: 日记条目
 */
export type NodeType = "folder" | "file" | "canvas" | "diary";

/**
 * 文件树结构的节点接口
 *
 * 此接口表示层级文件树中的节点。
 * 内容不存储在这里 - 它在单独的 contents 表中。
 * 这种分离允许：
 * - 快速加载文件树而无需加载重量级内容
 * - 高效的树操作（移动、重排序、折叠）
 * - 大型工作区的更好性能
 */
export interface NodeInterface {
	/** 节点的唯一标识符 */
	readonly id: UUID;

	/** 父工作区/项目的引用 */
	readonly workspace: UUID;

	/** 父节点 ID，根级节点为 null */
	readonly parent: UUID | null;

	/** 节点类型（folder, file, canvas, diary） */
	readonly type: NodeType;

	/** 节点的显示标题 */
	readonly title: string;

	/** 兄弟节点间的排序顺序（从 0 开始） */
	readonly order: number;

	/** 文件夹在树视图中是否折叠 */
	readonly collapsed?: boolean;

	/** ISO 8601 格式的创建时间戳 */
	readonly createDate: ISODateString;

	/** ISO 8601 格式的最后修改时间戳 */
	readonly lastEdit: ISODateString;

	/** 标签数组 - 从内容中的 #+TAGS: 提取 */
	readonly tags?: string[];
}

/**
 * 节点创建输入类型
 * 用于创建新节点
 * id、createDate 和 lastEdit 自动生成
 */
export interface NodeCreateInput {
	readonly workspace: UUID;
	readonly parent?: UUID | null;
	readonly type?: NodeType;
	readonly title: string;
	readonly order?: number;
	readonly collapsed?: boolean;
}

/**
 * 节点更新输入类型
 * 用于更新现有节点
 * 只有可变字段可以更新
 */
export interface NodeUpdateInput {
	readonly parent?: UUID | null;
	readonly type?: NodeType;
	readonly title?: string;
	readonly order?: number;
	readonly collapsed?: boolean;
	readonly tags?: string[];
}
