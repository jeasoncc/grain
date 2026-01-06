/**
 * Backup Manager View Component - Pure Presentation
 *
 * 纯展示组件，所有数据和回调通过 props 传入
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
	Archive,
	BookOpen,
	Clock,
	Cookie,
	Database,
	Download,
	FileText,
	FolderOpen,
	HardDrive,
	Image,
	Loader2,
	Paperclip,
	Settings,
	Tag,
	Trash2,
	Upload,
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { formatBytes } from "@/fn/format";
import type { BackupManagerViewProps } from "./backup-manager.types";

dayjs.extend(relativeTime);

export const BackupManagerView = memo(function BackupManagerView({
	stats,
	storageStats,
	loading,
	autoBackupEnabled,
	localBackups,
	onExportJson,
	onExportZip,
	onRestore,
	onToggleAutoBackup,
	onRestoreLocal,
	onClearAllData,
	onClearDatabase,
	onClearSettings,
}: BackupManagerViewProps) {
	return (
		<div className="space-y-6">
			{/* Data Statistics */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="size-5" />
						Data Statistics
					</CardTitle>
					<CardDescription>Current database statistics</CardDescription>
				</CardHeader>
				<CardContent>
					{stats ? (
						<div className="space-y-6">
							<div>
								<h4 className="text-xs font-medium mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
									<Database className="size-3.5" />
									Database Content
								</h4>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
									<div className="p-2.5 rounded-lg bg-muted/20 border transition-all hover:bg-muted/30 relative overflow-hidden group">
										<div className="absolute right-2 top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-500">
											<BookOpen className="size-6" />
										</div>
										<p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide relative z-10">
											Projects
										</p>
										<div className="flex items-baseline gap-1 relative z-10">
											<p className="text-xl font-bold text-foreground">
												{stats.projectCount}
											</p>
											<BookOpen className="size-3 text-muted-foreground opacity-50" />
										</div>
									</div>
									<div className="p-2.5 rounded-lg bg-muted/20 border transition-all hover:bg-muted/30 relative overflow-hidden group">
										<div className="absolute right-2 top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-500">
											<FileText className="size-6" />
										</div>
										<p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide relative z-10">
											File Nodes
										</p>
										<div className="flex items-baseline gap-1 relative z-10">
											<p className="text-xl font-bold text-foreground">
												{stats.nodeCount}
											</p>
											<FileText className="size-3 text-muted-foreground opacity-50" />
										</div>
									</div>
									<div className="p-2.5 rounded-lg bg-muted/20 border transition-all hover:bg-muted/30 relative overflow-hidden group">
										<div className="absolute right-2 top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-500">
											<Database className="size-6" />
										</div>
										<p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide relative z-10">
											Records
										</p>
										<div className="flex items-baseline gap-1 relative z-10">
											<p className="text-xl font-bold text-foreground">
												{stats.contentCount}
											</p>
											<Database className="size-3 text-muted-foreground opacity-50" />
										</div>
									</div>
									<div className="p-2.5 rounded-lg bg-muted/20 border transition-all hover:bg-muted/30 relative overflow-hidden group">
										<div className="absolute right-2 top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-500">
											<Image className="size-6" />
										</div>
										<p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide relative z-10">
											Drawings
										</p>
										<div className="flex items-baseline gap-1 relative z-10">
											<p className="text-xl font-bold text-foreground">
												{stats.drawingCount}
											</p>
											<Image className="size-3 text-muted-foreground opacity-50" />
										</div>
									</div>
									<div className="p-2.5 rounded-lg bg-muted/20 border transition-all hover:bg-muted/30 relative overflow-hidden group">
										<div className="absolute right-2 top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-500">
											<Paperclip className="size-6" />
										</div>
										<p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide relative z-10">
											Attachments
										</p>
										<div className="flex items-baseline gap-1 relative z-10">
											<p className="text-xl font-bold text-foreground">
												{stats.attachmentCount}
											</p>
											<Paperclip className="size-3 text-muted-foreground opacity-50" />
										</div>
									</div>
									<div className="p-2.5 rounded-lg bg-muted/20 border transition-all hover:bg-muted/30 relative overflow-hidden group">
										<div className="absolute right-2 top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-500">
											<Tag className="size-6" />
										</div>
										<p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide relative z-10">
											Tags
										</p>
										<div className="flex items-baseline gap-1 relative z-10">
											<p className="text-xl font-bold text-foreground">
												{stats.tagCount}
											</p>
											<Tag className="size-3 text-muted-foreground opacity-50" />
										</div>
									</div>
								</div>
							</div>

							{storageStats && (
								<>
									<Separator />
									<div>
										<h4 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
											<HardDrive className="size-4" />
											Storage Usage
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											{/* IndexedDB Card */}
											<div className="p-3 rounded-xl border bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:shadow-sm transition-all">
												<div className="flex items-center gap-3 mb-2">
													<div className="p-1.5 rounded-lg bg-blue-500/20">
														<HardDrive className="size-4 text-blue-600" />
													</div>
													<div>
														<p className="text-sm font-medium">IndexedDB</p>
														<p className="text-[10px] text-muted-foreground">
															Main database storage
														</p>
													</div>
												</div>
												<p className="text-xl font-bold mb-1">
													{formatBytes(storageStats.indexedDB.size)}
												</p>
												<p className="text-[10px] text-muted-foreground">
													{(
														Object.values(
															storageStats.indexedDB.tables,
														) as number[]
													).reduce((a, b) => a + b, 0)}{" "}
													total records
												</p>
											</div>

											{/* localStorage Card */}
											<div className="p-3 rounded-xl border bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent hover:shadow-sm transition-all">
												<div className="flex items-center gap-3 mb-2">
													<div className="p-1.5 rounded-lg bg-green-500/20">
														<Settings className="size-4 text-green-600" />
													</div>
													<div>
														<p className="text-sm font-medium">localStorage</p>
														<p className="text-[10px] text-muted-foreground">
															App settings & preferences
														</p>
													</div>
												</div>
												<p className="text-xl font-bold mb-1">
													{formatBytes(storageStats.localStorage.size)}
												</p>
												<p className="text-[10px] text-muted-foreground">
													{storageStats.localStorage.keys} keys stored
												</p>
											</div>

											{/* sessionStorage Card */}
											<div className="p-3 rounded-xl border bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:shadow-sm transition-all">
												<div className="flex items-center gap-3 mb-2">
													<div className="p-1.5 rounded-lg bg-purple-500/20">
														<FolderOpen className="size-4 text-purple-600" />
													</div>
													<div>
														<p className="text-sm font-medium">
															sessionStorage
														</p>
														<p className="text-[10px] text-muted-foreground">
															Temporary session data
														</p>
													</div>
												</div>
												<p className="text-xl font-bold mb-1">
													{formatBytes(storageStats.sessionStorage.size)}
												</p>
												<p className="text-[10px] text-muted-foreground">
													{storageStats.sessionStorage.keys} keys stored
												</p>
											</div>

											{/* Cookies Card */}
											<div className="p-3 rounded-xl border bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent hover:shadow-sm transition-all">
												<div className="flex items-center gap-3 mb-2">
													<div className="p-1.5 rounded-lg bg-orange-500/20">
														<Cookie className="size-4 text-orange-600" />
													</div>
													<div>
														<p className="text-sm font-medium">Cookies</p>
														<p className="text-[10px] text-muted-foreground">
															Browser cookies
														</p>
													</div>
												</div>
												<p className="text-xl font-bold mb-1">
													{storageStats.cookies.count}
												</p>
												<p className="text-[10px] text-muted-foreground">
													cookies stored
												</p>
											</div>
										</div>
									</div>

									<Separator />
									<div>
										<h4 className="text-sm font-medium mb-4">
											IndexedDB Table Breakdown
										</h4>
										<div className="space-y-3">
											{Object.entries(storageStats.indexedDB.tableSizes)
												.sort(([, a], [, b]) => b - a)
												.map(([table, size]) => {
													const percentage =
														storageStats.indexedDB.size > 0
															? (size / storageStats.indexedDB.size) * 100
															: 0;
													const tables = storageStats.indexedDB
														.tables as unknown as Record<string, number>;
													const recordCount = tables[table] || 0;
													return (
														<div key={table} className="space-y-1.5">
															<div className="flex justify-between items-center">
																<div className="flex items-center gap-2">
																	<span className="text-sm font-medium capitalize">
																		{table}
																	</span>
																	<span className="text-xs text-muted-foreground">
																		({recordCount} records)
																	</span>
																</div>
																<span className="text-sm font-semibold">
																	{formatBytes(size)}
																</span>
															</div>
															<Progress value={percentage} className="h-1.5" />
														</div>
													);
												})}
										</div>
									</div>
								</>
							)}
						</div>
					) : (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					)}
				</CardContent>
			</Card>

			{/* Manual Backup */}
			<Card className="overflow-hidden border-primary/20 bg-primary/5">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Archive className="size-4 text-primary" />
						Manual Backup
					</CardTitle>
					<CardDescription>
						Export your data to safeguard against loss.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex flex-wrap gap-3">
						<Button
							onClick={onExportJson}
							disabled={loading}
							className="flex-1 h-9"
							variant="default"
							size="sm"
						>
							<Download className="size-3.5 mr-2" />
							Export JSON
						</Button>
						<Button
							onClick={onExportZip}
							disabled={loading}
							className="flex-1 h-9"
							variant="secondary"
							size="sm"
						>
							<Archive className="size-3.5 mr-2" />
							Export ZIP
						</Button>
						<Button
							onClick={onRestore}
							disabled={loading}
							className="flex-1 h-9"
							variant="outline"
							size="sm"
						>
							<Upload className="size-3.5 mr-2" />
							Restore Backup
						</Button>
					</div>
					<div className="flex items-center gap-2 p-2 rounded bg-background/50 text-[10px] text-muted-foreground border border-border/50">
						<Settings className="size-3" />
						ZIP format includes all project metadata and is recommended for full
						backups.
					</div>
				</CardContent>
			</Card>

			{/* Auto Backup */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<CardTitle className="flex items-center gap-2 text-base">
								<Clock className="size-4" />
								Auto Backup
							</CardTitle>
							<CardDescription>
								Automatically creates local backups every 24 hours
							</CardDescription>
						</div>
						<Switch
							id="auto-backup"
							checked={autoBackupEnabled}
							onCheckedChange={onToggleAutoBackup}
						/>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{localBackups.length > 0 ? (
						<div className="space-y-3">
							<div className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
								<FileText className="size-3.5" />
								Local Backup History
							</div>
							<div className="grid gap-2">
								{localBackups.map((backup) => (
									<div
										key={backup.timestamp}
										className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
									>
										<div className="flex items-center gap-3">
											<div className="p-1.5 rounded-full bg-primary/10 text-primary">
												<Database className="size-3.5" />
											</div>
											<div>
												<p className="font-medium text-xs">
													{dayjs(backup.timestamp).format(
														"MMM D, YYYY · HH:mm:ss",
													)}
												</p>
												<p className="text-[10px] text-muted-foreground">
													{dayjs(backup.timestamp).fromNow()} ·{" "}
													{backup.data.metadata.projectCount} projects
												</p>
											</div>
										</div>
										<Button
											size="sm"
											variant="secondary"
											onClick={() => onRestoreLocal(backup.timestamp)}
											disabled={loading}
											className="h-7 text-xs"
										>
											Restore
										</Button>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
							<Clock className="size-6 mb-2 opacity-50" />
							<p className="text-xs">No local backups yet</p>
							<p className="text-[10px] opacity-70">
								Enable auto backup to start saving automatically
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-destructive text-base">
						<Trash2 className="size-4" />
						Danger Zone
					</CardTitle>
					<CardDescription className="text-destructive/70 text-xs">
						Irreversible actions. Please proceed with caution.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/20 bg-background/50">
						<div className="flex items-center gap-3">
							<div className="p-1.5 rounded-full bg-destructive/10 text-destructive shrink-0">
								<Trash2 className="size-3.5" />
							</div>
							<div>
								<div className="font-medium text-sm text-foreground">
									Clear All Data
								</div>
								<div className="text-[10px] text-muted-foreground">
									Delete content, settings, and cache
								</div>
							</div>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={onClearAllData}
							disabled={loading}
							className="h-7 text-xs whitespace-nowrap"
						>
							Clear All
						</Button>
					</div>

					<div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/50">
						<div className="flex items-center gap-3">
							<div className="p-1.5 rounded-full bg-muted text-foreground shrink-0">
								<Database className="size-3.5" />
							</div>
							<div>
								<div className="font-medium text-sm text-foreground">
									Clear Database
								</div>
								<div className="text-[10px] text-muted-foreground">
									Delete projects only. Keep settings
								</div>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={onClearDatabase}
							disabled={loading}
							className="h-7 text-xs whitespace-nowrap hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
						>
							Clear DB
						</Button>
					</div>

					<div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/50">
						<div className="flex items-center gap-3">
							<div className="p-1.5 rounded-full bg-muted text-foreground shrink-0">
								<Settings className="size-3.5" />
							</div>
							<div>
								<div className="font-medium text-sm text-foreground">
									Clear Settings
								</div>
								<div className="text-[10px] text-muted-foreground">
									Reset preferences. Keep projects
								</div>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={onClearSettings}
							disabled={loading}
							className="h-7 text-xs whitespace-nowrap hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
						>
							Reset Settings
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
});

BackupManagerView.displayName = "BackupManagerView";
