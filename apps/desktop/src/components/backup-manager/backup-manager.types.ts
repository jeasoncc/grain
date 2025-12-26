/**
 * Backup Manager Types
 */

import type { DatabaseStats, LocalBackupRecord } from "@/types/backup";
import type { StorageStats } from "@/types/storage";

/**
 * BackupManager View Props
 */
export interface BackupManagerViewProps {
	readonly stats: DatabaseStats | null;
	readonly storageStats: StorageStats | null;
	readonly loading: boolean;
	readonly autoBackupEnabled: boolean;
	readonly localBackups: LocalBackupRecord[];
	readonly onExportJson: () => void;
	readonly onExportZip: () => void;
	readonly onRestore: () => void;
	readonly onToggleAutoBackup: (enabled: boolean) => void;
	readonly onRestoreLocal: (timestamp: string) => void;
	readonly onClearAllData: () => void;
	readonly onClearDatabase: () => void;
	readonly onClearSettings: () => void;
}

/**
 * BackupManager Container Props
 */
export interface BackupManagerContainerProps {
	// Container 通常不需要 props，但如果需要可以定义
}
