// Update checker component

import * as E from "fp-ts/Either";
import {
	AlertCircle,
	CheckCircle,
	Download,
	Info,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
	checkForUpdates,
	downloadAndInstallUpdate,
	type UpdateInfo,
} from "@/fn/updater";

type CheckStatus =
	| "idle"
	| "checking"
	| "up-to-date"
	| "update-available"
	| "error"
	| "dev-mode";

export function UpdateChecker() {
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [showDialog, setShowDialog] = useState(false);
	const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const handleCheckForUpdates = useCallback(async () => {
		setIsChecking(true);
		setCheckStatus("checking");
		setErrorMessage("");
		try {
			const result = await checkForUpdates()();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			const info = result.right;
			setUpdateInfo(info);
			if (info.available) {
				setCheckStatus("update-available");
				setShowDialog(true);
			} else if (info.currentVersion === "dev") {
				// Running in browser, not Tauri
				setCheckStatus("dev-mode");
			} else {
				setCheckStatus("up-to-date");
			}
		} catch (error) {
			console.error("Failed to check for updates:", error);
			setCheckStatus("error");
			setErrorMessage(error instanceof Error ? error.message : "Unknown error");
		} finally {
			setIsChecking(false);
		}
	}, []);

	const handleDownloadAndInstall = async () => {
		setIsDownloading(true);
		setDownloadProgress(0);
		try {
			const result = await downloadAndInstallUpdate((progress) => {
				setDownloadProgress(progress.percentage);
			})();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
		} catch (error) {
			console.error("Failed to download and install update:", error);
			setIsDownloading(false);
		}
	};

	// Check for updates on mount
	useEffect(() => {
		handleCheckForUpdates();
	}, [handleCheckForUpdates]);

	// Auto-clear status message after 5 seconds
	useEffect(() => {
		if (
			checkStatus === "up-to-date" ||
			checkStatus === "dev-mode" ||
			checkStatus === "error"
		) {
			const timer = setTimeout(() => {
				setCheckStatus("idle");
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [checkStatus]);

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
					onClick={handleCheckForUpdates}
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

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
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
									<span className="font-mono">{updateInfo.currentVersion}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Latest Version:</span>
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
							onClick={() => setShowDialog(false)}
							disabled={isDownloading}
						>
							Later
						</Button>
						<Button onClick={handleDownloadAndInstall} disabled={isDownloading}>
							<Download className="size-4 mr-2" />
							{isDownloading ? "Downloading..." : "Update Now"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
