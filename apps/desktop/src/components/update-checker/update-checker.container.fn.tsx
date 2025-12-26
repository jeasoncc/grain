/**
 * @file update-checker.container.fn.tsx
 * @description 更新检查容器组件
 */

import { memo } from "react";
import { UpdateCheckerView } from "./update-checker.view.fn";
import { useUpdateChecker } from "@/hooks/use-update-checker";

export const UpdateCheckerContainer = memo(() => {
	const {
		updateInfo,
		isChecking,
		isDownloading,
		downloadProgress,
		showDialog,
		checkStatus,
		errorMessage,
		handleCheckForUpdates,
		handleDownloadAndInstall,
		setShowDialog,
	} = useUpdateChecker();

	return (
		<UpdateCheckerView
			updateInfo={updateInfo}
			isChecking={isChecking}
			isDownloading={isDownloading}
			downloadProgress={downloadProgress}
			showDialog={showDialog}
			checkStatus={checkStatus}
			errorMessage={errorMessage}
			onCheckForUpdates={handleCheckForUpdates}
			onDownloadAndInstall={handleDownloadAndInstall}
			onSetShowDialog={setShowDialog}
		/>
	);
});

UpdateCheckerContainer.displayName = "UpdateCheckerContainer";
