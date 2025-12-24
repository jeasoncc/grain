/**
 * Export对话框组件
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
import { Switch } from "@/components/ui/switch";
import { exportProject } from "@/domain/export";
import {
	type ExportFormat,
	type ExportOptions,
	triggerBlobDownload,
	triggerDownload,
} from "@/fn/export";
import {
	exportAllAsync as exportAll,
	exportAllAsZipAsync as exportAllAsZip,
	exportAsMarkdownAsync as exportAsMarkdown,
} from "@/actions";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workspaceId: string;
	workspaceTitle?: string;
}

type ExtendedExportFormat = ExportFormat | "markdown" | "json" | "zip";

export function ExportDialog({
	open,
	onOpenChange,
	workspaceId,
	workspaceTitle,
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
	};

	const formatLabels: Record<ExtendedExportFormat, string> = {
		pdf: "PDF",
		docx: "Word",
		txt: "Text",
		epub: "EPUB",
		markdown: "Markdown",
		json: "JSON Backup",
		zip: "ZIP Archive",
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
			<DialogContent className="sm:max-w-[700px] shadow-2xl border border-border/40 bg-popover/95 backdrop-blur-xl rounded-xl">
				<DialogHeader>
					<DialogTitle className="text-lg font-medium tracking-tight">
						Export Workspace
					</DialogTitle>
					<DialogDescription className="text-muted-foreground/80">
						Select export format and options to save your work locally.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Format Selection */}
					<div className="space-y-3">
						<Label
							htmlFor="export-format"
							className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold pl-1"
						>
							Export Format
						</Label>
						<RadioGroup
							id="export-format"
							value={format}
							onValueChange={(v) => setFormat(v as ExtendedExportFormat)}
							className="grid grid-cols-4 gap-3"
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
										group relative flex flex-col items-center justify-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 min-h-[110px]
										${
											format === f
												? "border-primary/50 bg-primary/10 shadow-sm"
												: "border-border/40 bg-muted/30 hover:bg-muted/60 hover:border-border/80"
										}
									`}
								>
									<RadioGroupItem value={f} className="sr-only" />
									<div
										className={`transition-transform duration-200 ${format === f ? "scale-125" : "group-hover:scale-110"}`}
									>
										{formatIcons[f]}
									</div>
									<div
										className={`text-xs font-medium ${format === f ? "text-primary" : "text-foreground"}`}
									>
										{formatLabels[f]}
									</div>
								</label>
							))}
						</RadioGroup>
					</div>

					{/* Export Options - Only show for formats that need options */}
					{format !== "json" && format !== "zip" && (
						<div className="space-y-3">
							<span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold pl-1">
								Options
							</span>
							<div className="space-y-1 bg-muted/20 p-2 rounded-xl border border-border/40">
								<div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
									<Label
										htmlFor="includeTitle"
										className="text-sm font-normal cursor-pointer text-muted-foreground peer-data-[state=checked]:text-foreground"
									>
										Include Book Title
									</Label>
									<Switch
										id="includeTitle"
										checked={options.includeTitle}
										onCheckedChange={(checked) =>
											setOptions({ ...options, includeTitle: !!checked })
										}
										className="scale-90"
									/>
								</div>

								<div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
									<Label
										htmlFor="includeAuthor"
										className="text-sm font-normal cursor-pointer text-muted-foreground peer-data-[state=checked]:text-foreground"
									>
										Include Author Name
									</Label>
									<Switch
										id="includeAuthor"
										checked={options.includeAuthor}
										onCheckedChange={(checked) =>
											setOptions({ ...options, includeAuthor: !!checked })
										}
										className="scale-90"
									/>
								</div>

								<div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
									<Label
										htmlFor="includeChapterTitles"
										className="text-sm font-normal cursor-pointer text-muted-foreground peer-data-[state=checked]:text-foreground"
									>
										Include Chapter Titles
									</Label>
									<Switch
										id="includeChapterTitles"
										checked={options.includeChapterTitles}
										onCheckedChange={(checked) =>
											setOptions({
												...options,
												includeChapterTitles: !!checked,
											})
										}
										className="scale-90"
									/>
								</div>

								<div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
									<Label
										htmlFor="includeSceneTitles"
										className="text-sm font-normal cursor-pointer text-muted-foreground peer-data-[state=checked]:text-foreground"
									>
										Include Scene Titles
									</Label>
									<Switch
										id="includeSceneTitles"
										checked={options.includeSceneTitles}
										onCheckedChange={(checked) =>
											setOptions({ ...options, includeSceneTitles: !!checked })
										}
										className="scale-90"
									/>
								</div>

								{format !== "txt" && format !== "markdown" && (
									<div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors border-t border-border/30 mt-1 pt-2">
										<Label
											htmlFor="pageBreakBetweenChapters"
											className="text-sm font-normal cursor-pointer text-muted-foreground peer-data-[state=checked]:text-foreground"
										>
											Page Break Between Chapters
										</Label>
										<Switch
											id="pageBreakBetweenChapters"
											checked={options.pageBreakBetweenChapters}
											onCheckedChange={(checked) =>
												setOptions({
													...options,
													pageBreakBetweenChapters: !!checked,
												})
											}
											className="scale-90"
										/>
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
						Cancel
					</Button>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Exporting...
							</>
						) : (
							<>Export {formatLabels[format]}</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
