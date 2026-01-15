/**
 * Export Dialog 组件类型定义
 */

import type { ExportFormat, ExportOptions } from "@/pipes/export"

export type ExtendedExportFormat = ExportFormat | "markdown" | "json" | "zip"

export interface ExportDialogViewProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly format: ExtendedExportFormat
	readonly onFormatChange: (format: ExtendedExportFormat) => void
	readonly options: ExportOptions
	readonly onOptionsChange: (options: ExportOptions) => void
	readonly isExporting: boolean
	readonly onExport: () => void
	readonly formatLabels: Record<ExtendedExportFormat, string>
	readonly formatIcons: Record<ExtendedExportFormat, React.ReactNode>
}

export interface ExportDialogContainerProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly workspaceId: string
	readonly workspaceTitle?: string
}
