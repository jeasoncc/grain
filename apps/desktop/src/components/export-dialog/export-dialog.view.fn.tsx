/**
 * Export Dialog 纯展示组件
 */

import { Loader2 } from "lucide-react";
import { memo } from "react";
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
import type { ExportDialogViewProps, ExtendedExportFormat } from "./export-dialog.types";

export const ExportDialogView = memo(({
	open,
	onOpenChange,
	format,
	onFormatChange,
	options,
	onOptionsChange,
	isExporting,
	onExport,
	formatLabels,
	formatIcons,
}: ExportDialogViewProps) => {
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
							onValueChange={(v) => onFormatChange(v as ExtendedExportFormat)}
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
											onOptionsChange({ ...options, includeTitle: !!checked })
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
											onOptionsChange({ ...options, includeAuthor: !!checked })
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
											onOptionsChange({
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
											onOptionsChange({ ...options, includeSceneTitles: !!checked })
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
												onOptionsChange({
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
					<Button onClick={onExport} disabled={isExporting}>
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
});

ExportDialogView.displayName = "ExportDialogView";
