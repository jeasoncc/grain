/**
 * @file types/workspace/workspace.builder.ts
 * @description Workspace Builder
 *
 * 实现函数式 Builder 模式用于创建 Workspace 对象。
 * 提供链式方法的流畅 API 用于设置属性。
 *
 * @requirements 2.3, 2.4
 */

import dayjs from "dayjs"
import { v4 as uuidv4 } from "uuid"
import type { WorkspaceInterface } from "./workspace.interface"
import { WorkspaceSchema } from "./workspace.schema"

/**
 * 函数式 WorkspaceBuilder 类型
 * 提供用于构建 Workspace 对象的流畅 API
 */
export interface WorkspaceBuilder {
	readonly id: (id: string) => WorkspaceBuilder
	readonly title: (title: string) => WorkspaceBuilder
	readonly author: (author: string) => WorkspaceBuilder
	readonly description: (description: string) => WorkspaceBuilder
	readonly publisher: (publisher: string) => WorkspaceBuilder
	readonly language: (language: string) => WorkspaceBuilder
	readonly lastOpen: (timestamp: string) => WorkspaceBuilder
	readonly createDate: (timestamp: string) => WorkspaceBuilder
	readonly members: (members: readonly string[]) => WorkspaceBuilder
	readonly owner: (ownerId: string) => WorkspaceBuilder
	readonly from: (workspace: WorkspaceInterface) => WorkspaceBuilder
	readonly build: () => WorkspaceInterface
	readonly buildPartial: () => Partial<WorkspaceInterface>
}

/**
 * 创建函数式 WorkspaceBuilder 实例
 * @param initialData - 初始数据（可选）
 * @returns WorkspaceBuilder 实例
 */
const createWorkspaceBuilderInternal = (
	initialData?: Partial<WorkspaceInterface>,
): WorkspaceBuilder => {
	const now = dayjs().toISOString()
	const defaultData: Partial<WorkspaceInterface> = {
		author: "",
		createDate: now,
		description: "",
		id: uuidv4(),
		language: "zh",
		lastOpen: now,
		publisher: "",
		title: "New Workspace",
		...initialData,
	}

	const createBuilder = (data: Partial<WorkspaceInterface>): WorkspaceBuilder => ({
		author: (author: string) => createBuilder({ ...data, author }),

		build: (): WorkspaceInterface => {
			const now = dayjs().toISOString()
			const finalData = {
				...data,
				createDate: data.createDate || now,
				lastOpen: data.lastOpen || now,
			}

			const result = WorkspaceSchema.parse(finalData)
			return Object.freeze(result) as WorkspaceInterface
		},

		buildPartial: (): Partial<WorkspaceInterface> => {
			const finalData = {
				...data,
				lastOpen: dayjs().toISOString(),
			}
			return Object.freeze(finalData) as Partial<WorkspaceInterface>
		},
		createDate: (timestamp: string) => createBuilder({ ...data, createDate: timestamp }),
		description: (description: string) => createBuilder({ ...data, description }),
		from: (workspace: WorkspaceInterface) => createBuilder({ ...data, ...workspace }),
		id: (id: string) => createBuilder({ ...data, id }),
		language: (language: string) => createBuilder({ ...data, language }),
		lastOpen: (timestamp: string) => createBuilder({ ...data, lastOpen: timestamp }),
		members: (members: readonly string[]) => createBuilder({ ...data, members: [...members] }),
		owner: (ownerId: string) => createBuilder({ ...data, owner: ownerId }),
		publisher: (publisher: string) => createBuilder({ ...data, publisher }),
		title: (title: string) => createBuilder({ ...data, title }),
	})

	return createBuilder(defaultData)
}

/**
 * 创建新的 WorkspaceBuilder 实例
 * @returns WorkspaceBuilder 实例
 */
export const WorkspaceBuilder = (): WorkspaceBuilder => createWorkspaceBuilderInternal()

/**
 * 从现有工作区对象创建 WorkspaceBuilder 实例
 * @param workspace - 现有的工作区对象
 * @returns WorkspaceBuilder 实例
 */
export const WorkspaceBuilderFrom = (workspace: WorkspaceInterface): WorkspaceBuilder =>
	createWorkspaceBuilderInternal(workspace)
