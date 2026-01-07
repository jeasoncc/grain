/**
 * Export Dialog 容器组件
 */

import {
	BookOpen,
	File,
	FileArchive,
	FileCode,
	FileJson,
	FileText,
	FileType,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	exportAllAsync as exportAll,
	exportAllAsZipAsync as exportAllAsZip,
	exportAsMarkdownAsync as exportAsMarkdown,
	exportProject,
} from "@/actions";
import type { ExportFormat, ExportOptions } from "@/pipes/export";
import { triggerBlobDownload, triggerDownload } from "@/pipes/export";
import type {
	ExportDialogContainerProps,
	ExtendedExportFormat,
} from "./export-dialog.types";
import { ExportDialogView } from "./export-dialog.view.fn";

export const ExportDialogContainer = memo(
	({
		open,
		onOpenChange,
		workspaceId,
		workspaceTitle,
	}: ExportDialogContainerProps) => {
		const [format, setFormat] = useState<ExtendedExportFormat>("pdf");
		const [isExporting, setIsExporting] = useState(false);
		const [options, setOptions] = useState<ExportOptions>({
			includeTitle: true,
			includeAuthor: true,
			includeChapterTitles: true,
			includeSceneTitles: false,
			pageBreakBetweenChapters: true,
		});

		const formatLabels: Record<ExtendedExportFormat, string> = useMemo(
			() => ({
				pdf: "PDF",
				docx: "Word",
				txt: "Text",
				epub: "EPUB",
				markdown: "Markdown",
				json: "JSON Backup",
				zip: "ZIP Archive",
			}),
			[],
		);

		const formatIcons: Record<ExtendedExportFormat, React.ReactNode> = useMemo(
			() => ({
				pdf: <FileText className="size-5 text-red-500" />,
				docx: <FileType className="size-5 text-blue-500" />,
				txt: <File className="size-5 text-gray-500" />,
				epub: <BookOpen className="size-5 text-green-500" />,
				markdown: <FileCode className="size-5 text-purple-500" />,
				json: <FileJson className="size-5 text-orange-500" />,
				zip: <FileArchive className="size-5 text-cyan-500" />,
			}),
			[],
		);

		const handleExport = useCallback(async () => {
			setIsExporting(true);
			try {
				// Handle Markdown and JSON export
				if (format === "markdown") {
					const md = await exportAsMarkdown(workspaceId);
					triggerDownload(
						`${workspaceTitle || "novel"}.md`,
						md,
						"text/markdown;charset=utf-8",
					);
					toast.success("Markdown export successful");
				} else if (format === "json") {
					const json = await exportAll();
					triggerDownload(
						`grain-backup-${new Date().toISOString().slice(0, 10)}.json`,
						json,
					);
					toast.success("JSON backup export successful");
				} else if (format === "zip") {
					const zipBlob = await exportAllAsZip();
					triggerBlobDownload(
						`grain-backup-${new Date().toISOString().slice(0, 10)}.zip`,
						zipBlob,
					);
					toast.success("ZIP archive export successful");
				} else {
					// Standard format export
					await exportProject(workspaceId, format as ExportFormat, options);
					toast.success(`${formatLabels[format]} export successful`);
				}
				onOpenChange(false);
			} catch (error) {
				console.error("Export error:", error);
				toast.error(
					error instanceof Error
						? error.message
						: "Export failed, please try again",
				);
			} finally {
				setIsExporting(false);
			}
		}, [
			format,
			workspaceId,
			workspaceTitle,
			options,
			formatLabels,
			onOpenChange,
		]);

		return (
			<ExportDialogView
				open={open}
				onOpenChange={onOpenChange}
				format={format}
				onFormatChange={setFormat}
				options={options}
				onOptionsChange={setOptions}
				isExporting={isExporting}
				onExport={handleExport}
				formatLabels={formatLabels}
				formatIcons={formatIcons}
			/>
		);
	},
);

ExportDialogContainer.displayName = "ExportDialogContainer";
