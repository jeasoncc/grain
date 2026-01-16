/**
 * @file use-create-template.ts
 * @description 创建模板文件的 React Hook
 *
 * 职责：绑定 Flow 到 React 生命周期，处理 UI 状态更新
 *
 * 数据流：
 * 1. 调用 Flow 创建文件
 * 2. 更新 UI 状态（选中、展开、导航）
 * 3. 显示 Toast 通知
 */

import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import dayjs from "dayjs"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { useCallback } from "react"
import { toast } from "sonner"
import type { TemplatedFileResult } from "@/flows/templated/create-templated-file.flow"
import { queryKeys } from "@/hooks/queries/query-keys"
import { error as logError } from "@/io/log/logger.api"
import { calculateExpandedFoldersForNode } from "@/pipes/node"
import { useSelectionStore } from "@/state/selection.state"
import { useSidebarStore } from "@/state/sidebar.state"
import type { AppError } from "@/types/error"
import type { NodeInterface } from "@/types/node"

// ==============================
// Types
// ==============================

/**
 * 模板创建函数类型
 */
export type TemplateCreator = (params: {
	readonly workspaceId: string
	readonly templateParams: { readonly date: Date }
}) => TE.TaskEither<AppError, TemplatedFileResult>

/**
 * 创建模板的选项
 */
export interface CreateTemplateOptions {
	readonly creator: TemplateCreator
	readonly successMessage: string
	readonly errorMessage: string
}

// ==============================
// Hook
// ==============================

/**
 * 创建模板文件的 Hook
 *
 * 封装了：
 * - 调用 Flow 创建文件
 * - 更新选中状态
 * - 刷新文件树缓存
 * - 展开文件夹
 * - 导航到主页面
 * - 显示 Toast
 */
export const useCreateTemplate = () => {
	const queryClient = useQueryClient()
	const router = useRouter()
	const location = useLocation()

	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId)
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
	const setExpandedFolders = useSidebarStore((s) => s.setExpandedFolders)

	/**
	 * 同步 UI 状态
	 */
	const syncUIState = useCallback(
		async (node: NodeInterface, workspaceId: string) => {
			// 1. 选中新创建的文件
			setSelectedNodeId(node.id)

			// 2. 刷新文件树缓存
			await queryClient.invalidateQueries({
				queryKey: queryKeys.nodes.byWorkspace(workspaceId),
			})

			// 3. 展开文件夹
			const freshNodes = queryClient.getQueryData<readonly NodeInterface[]>(
				queryKeys.nodes.byWorkspace(workspaceId),
			)
			if (freshNodes) {
				const expandedFolders = calculateExpandedFoldersForNode(freshNodes, node.id)
				setExpandedFolders(expandedFolders)
			}

			// 4. 导航到主页面
			if (location.pathname !== "/") {
				router.history.replace("/")
			}
		},
		[queryClient, setSelectedNodeId, setExpandedFolders, router, location.pathname],
	)

	/**
	 * 执行模板创建
	 */
	const createTemplate = useCallback(
		(options: CreateTemplateOptions) => {
			if (!selectedWorkspaceId) {
				toast.error("请先选择工作区")
				return
			}

			const { creator, successMessage, errorMessage } = options

			pipe(
				// 1. 创建文件
				creator({
					templateParams: { date: dayjs().toDate() },
					workspaceId: selectedWorkspaceId,
				}),

				// 2. 成功后同步 UI
				TE.tap((result) => {
					void syncUIState(result.node, selectedWorkspaceId)
					return TE.right(result)
				}),

				// 3. 处理结果
				TE.match(
					(error) => {
						logError("[useCreateTemplate] 创建失败", { error })
						toast.error(errorMessage)
					},
					() => {
						toast.success(successMessage)
					},
				),
			)()
		},
		[selectedWorkspaceId, syncUIState],
	)

	return { createTemplate, selectedWorkspaceId }
}
