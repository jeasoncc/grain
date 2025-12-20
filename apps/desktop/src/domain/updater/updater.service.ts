// Auto-updater service

export interface UpdateInfo {
	available: boolean;
	currentVersion: string;
	latestVersion?: string;
	body?: string;
}

/**
 * Check if running in Tauri environment
 */
function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
	if (!isTauri()) {
		return {
			available: false,
			currentVersion: "dev",
		};
	}

	try {
		const { check } = await import("@tauri-apps/plugin-updater");
		const update = await check();

		if (update?.available) {
			return {
				available: true,
				currentVersion: update.currentVersion,
				latestVersion: update.version,
				body: update.body,
			};
		}

		return {
			available: false,
			currentVersion: update?.currentVersion || "unknown",
		};
	} catch (error) {
		console.error("Failed to check for updates:", error);
		// Provide more helpful error messages
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
			throw new Error("No releases published yet");
		}
		if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
			throw new Error("Network error - check your connection");
		}
		throw error;
	}
}

/**
 * Download and install update
 */
export async function downloadAndInstall(
	onProgress?: (progress: number) => void,
): Promise<void> {
	if (!isTauri()) {
		throw new Error("Updates only available in desktop app");
	}

	try {
		const { check } = await import("@tauri-apps/plugin-updater");
		const { relaunch } = await import("@tauri-apps/plugin-process");
		
		const update = await check();

		if (!update) {
			throw new Error("No update available");
		}

		let downloaded = 0;
		let contentLength = 0;

		// Download with progress
		await update.downloadAndInstall((event) => {
			switch (event.event) {
				case "Started":
					contentLength = event.data.contentLength || 0;
					console.log(`Started downloading ${contentLength} bytes`);
					break;
				case "Progress":
					downloaded += event.data.chunkLength;
					const progress = contentLength > 0 ? (downloaded / contentLength) * 100 : 0;
					onProgress?.(progress);
					break;
				case "Finished":
					console.log("Download finished");
					break;
			}
		});

		// Relaunch the app after installation
		await relaunch();
	} catch (error) {
		console.error("Failed to download and install update:", error);
		throw error;
	}
}
