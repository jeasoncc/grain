/**
 * @file empty-state.view.fn.tsx
 * @description 工作区空状态组件
 */

import { memo } from "react"

export interface EmptyStateProps {
	readonly hasFiles: boolean
}

export const EmptyState = memo(function EmptyState({ hasFiles }: EmptyStateProps) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
			{hasFiles ? (
				<>
					<p className="text-lg">Select a file from the file tree to start editing</p>
					<p className="text-sm opacity-70">Choose a file from the left sidebar or create a new one</p>
				</>
			) : (
				<>
					<p className="text-lg">Welcome to your workspace!</p>
					<p className="text-sm opacity-70">Create your first file to get started</p>
					<p className="text-xs opacity-50 mt-2">
						Click the "Create File" button in the file tree on the left
					</p>
				</>
			)}
		</div>
	)
})
