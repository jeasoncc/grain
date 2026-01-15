import type { ExportFormat } from "@/types/export"

/**
 * Export Button View 组件的 Props
 */
export interface ExportButtonViewProps {
	readonly isExporting: boolean
	readonly variant?: "default" | "outline" | "ghost"
	readonly size?: "default" | "sm" | "lg"
	readonly className?: string
	readonly onExport: (format: ExportFormat) => void
}

/**
 * Export Button Container 组件的 Props
 */
export interface ExportButtonContainerProps {
	readonly workspaceId: string
	readonly workspaceTitle?: string
	readonly variant?: "default" | "outline" | "ghost"
	readonly size?: "default" | "sm" | "lg"
	readonly className?: string
}
