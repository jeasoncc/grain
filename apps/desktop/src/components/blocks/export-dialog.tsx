/**
 * 导出对话框组件
 */

import {
	BookOpen,
	File,
	FileArchive,
	FileCode,
	FileJson,
	FileText,
	FileType,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	type ExportFormat,
	type ExportOptions,
	exportProject,
} from "@/services/export";
import {
	exportAll,
	exportAllAsZip,
	exportAsMarkdown,
	triggerBlobDownload,
	triggerDownload,
} from "@/services/projects";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	projectTitle?: string;
}

type ExtendedExportFormat = ExportFormat | "markdown" | "json" | "zip";

export function ExportDialog({
	open,
	onOpenChange,
	projectId,
	projectTitle,
}: ExportDialogProps) {
	const [format, setFormat] = useState<ExtendedExportFormat>("pdf");
	const [isExporting, setIsExporting] = useState(false);
	const [options, setOptions] = useState<ExportOptions>({
		includeTitle: true,
		includeAuthor: true,
		includeChapterTitles: true,
		includeSceneTitles: false,
		pageBreakBetweenChapters: true,
	});

	const handleExport = async () => {
		setIsExporting(true);
		try {
			// 处理 Markdown 和 JSON 导出
			if (format === "markdown") {
				const md = await exportAsMarkdown(projectId);
				triggerDownload(
					`${projectTitle || "novel"}.md`,
					md,
					"text/markdown;charset=utf-8",
				);
				toast.success("Markdown 导出成功");
			} else if (format === "json") {
				const json = await exportAll();
				triggerDownload(
					`novel-editor-backup-${new Date().toISOString().slice(0, 10)}.json`,
					json,
				);
				toast.success("JSON 备份导出成功");
			} else if (format === "zip") {
				const zipBlob = await exportAllAsZip();
				triggerBlobDownload(
					`novel-editor-backup-${new Date().toISOString().slice(0, 10)}.zip`,
					zipBlob,
				);
				toast.success("ZIP 备份导出成功");
			} else {
				// 标准格式导出
				await exportProject(projectId, format as ExportFormat, options);
				toast.success(`${formatLabels[format]} 导出成功`);
			}
			onOpenChange(false);
		} catch (error) {
			console.error("Export error:", error);
			toast.error(error instanceof Error ? error.message : "导出失败，请重试");
		} finally {
			setIsExporting(false);
		}
	};

	const formatLabels: Record<ExtendedExportFormat, string> = {
		pdf: "PDF",
		docx: "Word",
		txt: "纯文本",
		epub: "EPUB",
		markdown: "Markdown",
		json: "JSON 备份",
		zip: "ZIP 压缩包",
	};

	const formatDescriptions: Record<ExtendedExportFormat, string> = {
		pdf: "适合打印和分享，保持精美排版",
		docx: "可在 Word 中编辑，支持格式调整",
		txt: "纯文本格式，兼容性最好",
		epub: "电子书格式，适合阅读器",
		markdown: "Markdown 格式，适合版本控制",
		json: "完整备份，包含所有数据",
		zip: "结构化备份，包含文件夹和文本",
	};

	const formatIcons: Record<ExtendedExportFormat, React.ReactNode> = {
		pdf: <FileText className="size-5 text-red-500" />,
		docx: <FileType className="size-5 text-blue-500" />,
		txt: <File className="size-5 text-gray-500" />,
		epub: <BookOpen className="size-5 text-green-500" />,
		markdown: <FileCode className="size-5 text-purple-500" />,
		json: <FileJson className="size-5 text-orange-500" />,
		zip: <FileArchive className="size-5 text-cyan-500" />,
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>导出作品</DialogTitle>
					<DialogDescription>
						将《{projectTitle || "作品"}》导出为文件
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* 格式选择 */}
					<div className="space-y-3">
						<Label className="text-sm font-medium">导出格式</Label>
						{format === "json" && (
							<p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
								💡 JSON
								备份包含所有书籍、章节、场景和 Wiki 数据，可用于完整恢复。
							</p>
						)}
						{format === "zip" && (
							<p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
								📦 ZIP
								压缩包将数据按项目、章节组织成文件夹结构，每个场景导出为独立的文本文件，便于查看和管理。
							</p>
						)}
						<RadioGroup
							value={format}
							onValueChange={(v) => setFormat(v as ExtendedExportFormat)}
							className="grid grid-cols-3 gap-3"
						>
							{(
								[
									"pdf",
									"docx",
									"epub",
									"txt",
									"markdown",
									"json",
									"zip",
								] as ExtendedExportFormat[]
							).map((f) => (
								<label
									key={f}
									className={`
										flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
										${
											format === f
												? "border-primary bg-primary/5"
												: "border-border hover:border-primary/50"
										}
									`}
								>
									<RadioGroupItem value={f} className="sr-only" />
									{formatIcons[f]}
									<span className="text-sm font-medium">{formatLabels[f]}</span>
									<span className="text-xs text-muted-foreground text-center leading-tight">
										{formatDescriptions[f]}
									</span>
								</label>
							))}
						</RadioGroup>
					</div>

					{/* 导出选项 - 仅对需要选项的格式显示 */}
					{format !== "json" && format !== "zip" && (
						<div className="space-y-3">
							<Label className="text-sm font-medium">导出选项</Label>
							<div className="space-y-3 rounded-lg border p-4">
								<div className="flex items-center space-x-3">
									<Checkbox
										id="includeTitle"
										checked={options.includeTitle}
										onCheckedChange={(checked) =>
											setOptions({ ...options, includeTitle: !!checked })
										}
									/>
									<Label
										htmlFor="includeTitle"
										className="text-sm cursor-pointer"
									>
										包含书名
									</Label>
								</div>

								<div className="flex items-center space-x-3">
									<Checkbox
										id="includeAuthor"
										checked={options.includeAuthor}
										onCheckedChange={(checked) =>
											setOptions({ ...options, includeAuthor: !!checked })
										}
									/>
									<Label
										htmlFor="includeAuthor"
										className="text-sm cursor-pointer"
									>
										包含作者名
									</Label>
								</div>

								<div className="flex items-center space-x-3">
									<Checkbox
										id="includeChapterTitles"
										checked={options.includeChapterTitles}
										onCheckedChange={(checked) =>
											setOptions({
												...options,
												includeChapterTitles: !!checked,
											})
										}
									/>
									<Label
										htmlFor="includeChapterTitles"
										className="text-sm cursor-pointer"
									>
										包含章节标题
									</Label>
								</div>

								<div className="flex items-center space-x-3">
									<Checkbox
										id="includeSceneTitles"
										checked={options.includeSceneTitles}
										onCheckedChange={(checked) =>
											setOptions({ ...options, includeSceneTitles: !!checked })
										}
									/>
									<Label
										htmlFor="includeSceneTitles"
										className="text-sm cursor-pointer"
									>
										包含场景标题
									</Label>
								</div>

								{format !== "txt" && format !== "markdown" && (
									<div className="flex items-center space-x-3">
										<Checkbox
											id="pageBreakBetweenChapters"
											checked={options.pageBreakBetweenChapters}
											onCheckedChange={(checked) =>
												setOptions({
													...options,
													pageBreakBetweenChapters: !!checked,
												})
											}
										/>
										<Label
											htmlFor="pageBreakBetweenChapters"
											className="text-sm cursor-pointer"
										>
											章节间分页
										</Label>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						取消
					</Button>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								导出中...
							</>
						) : (
							<>导出 {formatLabels[format]}</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
