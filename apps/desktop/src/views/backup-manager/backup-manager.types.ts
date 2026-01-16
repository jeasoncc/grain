/**
 * Backup Manager Types
 */

import type { DatabaseStats, LocalBackupRecord } from "@/types/backup"

/**
 * BackupManager View Props
 */
export interface BackupManagerViewProps {
	readonly stats: DatabaseStats | null
	readonly storageStats: { readonly size: number; readonly keys: number } | null
	readonly loading: boolean
	readonly autoBackupEnabled: boolean
	readonly localBackups: readonly LocalBackupRecord[]
	readonly onExportJson: () => void
	readonly onExportZip: () => void
	readonly onRestore: () => void
	readonly onToggleAutoBackup: (enabled: boolean) => void
	readonly onRestoreLocal: (timestamp: string) => void
	readonly onClearAllData: () => void
	readonly onClearDatabase: () => void
	readonly onClearSettings: () => void
}

/**
 * BackupManager Container Props
 */
export type BackupManagerContainerProps = {}
