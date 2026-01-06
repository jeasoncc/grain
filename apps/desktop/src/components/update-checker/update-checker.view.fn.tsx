/**
 * @file update-checker.view.fn.tsx
 * @description 更新检查纯展示组件
 */

import {
	AlertCircle,
	CheckCircle,
	Download,
	Info,
	RefreshCw,
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/views/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/views/ui/dialog";
import { Progress } from "@/views/ui/progress";
import type { UpdateCheckerViewProps } from "./update-checker.types";

export const UpdateCheckerView = memo(
	({
		updateInfo,
		isChecking,
		isDownloading,
		downloadProgress,
		showDialog,
		checkStatus,
		errorMessage,
		onCheckForUpdates,
		onDownloadAndInstall,
		onSetShowDialog,
	}: UpdateCheckerViewProps) => {
		const renderStatusMessage = () => {
			switch (checkStatus) {
				case "up-to-date":
					return (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="size-4" />
							<span>You're up to date! (v{updateInfo?.currentVersion})</span>
						</div>
					);
				case "dev-mode":
					return (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Info className="size-4" />
							<span>Update check unavailable in browser mode</span>
						</div>
					);
				case "error":
					return (
						<div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
							<AlertCircle className="size-4" />
							<span>Check failed: {errorMessage || "Unknown error"}</span>
						</div>
					);
				default:
					return null;
			}
		};

		return (
			<>
				<div className="flex flex-col gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onCheckForUpdates}
						disabled={isChecking}
						className="w-fit"
					>
						<RefreshCw
							className={`size-4 mr-2 ${isChecking ? "animate-spin" : ""}`}
						/>
						{isChecking ? "Checking..." : "Check for Updates"}
					</Button>
					{renderStatusMessage()}
				</div>

				<Dialog open={showDialog} onOpenChange={onSetShowDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Update Available</DialogTitle>
							<DialogDescription>
								A new version of Grain is available.
							</DialogDescription>
						</DialogHeader>

						{updateInfo && (
							<div className="space-y-4">
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">
											Current Version:
										</span>
										<span className="font-mono">
											{updateInfo.currentVersion}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">
											Latest Version:
										</span>
										<span className="font-mono font-semibold text-primary">
											{updateInfo.latestVersion}
										</span>
									</div>
								</div>

								{updateInfo.body && (
									<div className="space-y-2">
										<h4 className="text-sm font-medium">Release Notes:</h4>
										<div className="text-sm text-muted-foreground max-h-48 overflow-y-auto p-3 bg-muted rounded-md">
											<pre className="whitespace-pre-wrap font-sans">
												{updateInfo.body}
											</pre>
										</div>
									</div>
								)}

								{isDownloading && (
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span>Downloading...</span>
											<span>{Math.round(downloadProgress)}%</span>
										</div>
										<Progress value={downloadProgress} />
									</div>
								)}
							</div>
						)}

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => onSetShowDialog(false)}
								disabled={isDownloading}
							>
								Later
							</Button>
							<Button onClick={onDownloadAndInstall} disabled={isDownloading}>
								<Download className="size-4 mr-2" />
								{isDownloading ? "Downloading..." : "Update Now"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	},
);

UpdateCheckerView.displayName = "UpdateCheckerView";
