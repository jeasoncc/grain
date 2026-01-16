import { createFileRoute } from "@tanstack/react-router"
import { AlertCircle, FolderOpen } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
	getDefaultExportPath,
	getDownloadsDirectory,
	isTauriEnvironment,
	selectExportDirectory,
	setDefaultExportPath,
} from "@/flows/export"
import { Button } from "@/views/ui/button"
import { Input } from "@/views/ui/input"
import { Label } from "@/views/ui/label"
import { Switch } from "@/views/ui/switch"

// Org-mode settings (simplified)
interface OrgmodeSettings {
	readonly orgRoamPath: string | null
	readonly diarySubdir: string
	readonly enabled: boolean
}

const ORGMODE_SETTINGS_KEY = "orgmode-settings"

function getOrgmodeSettings(): OrgmodeSettings {
	try {
		const stored = localStorage.getItem(ORGMODE_SETTINGS_KEY)
		if (stored) return JSON.parse(stored)
	} catch {
		// Ignore parsing errors and return default settings
	}
	return { diarySubdir: "diary", enabled: false, orgRoamPath: null }
}

function saveOrgmodeSettings(settings: OrgmodeSettings): void {
	localStorage.setItem(ORGMODE_SETTINGS_KEY, JSON.stringify(settings))
}

export const Route = createFileRoute("/settings/export")({
	component: ExportSettingsPage,
})

function ExportSettingsPage() {
	const [defaultPath, setDefaultPathState] = useState<string | null>(null)
	const [downloadsDir, setDownloadsDir] = useState<string>("")
	const [isLoading, setIsLoading] = useState(false)
	const [isTauri, setIsTauri] = useState(false)

	// Org-mode Settings
	const [orgSettings, setOrgSettings] = useState<OrgmodeSettings>({
		diarySubdir: "diary",
		enabled: false,
		orgRoamPath: null,
	})

	useEffect(() => {
		setIsTauri(isTauriEnvironment())
		setDefaultPathState(getDefaultExportPath())
		setOrgSettings(getOrgmodeSettings())

		getDownloadsDirectory().then((dir) => {
			setDownloadsDir(dir)
		})
	}, [])

	const handleSelectPath = async () => {
		if (!isTauri) {
			toast.error("Available only in desktop app")
			return
		}

		setIsLoading(true)
		try {
			const initialDir = defaultPath || downloadsDir || null
			const selectedPath = await selectExportDirectory(initialDir)
			if (selectedPath) {
				setDefaultExportPath(selectedPath)
				setDefaultPathState(selectedPath)
				toast.success("Default export path set")
			}
		} catch (error) {
			toast.error(`Failed to select path: ${error}`)
		} finally {
			setIsLoading(false)
		}
	}

	const handleClearPath = () => {
		setDefaultExportPath(null)
		setDefaultPathState(null)
		toast.success("Default export path cleared")
	}

	const handleSelectOrgRoamPath = async () => {
		if (!isTauri) {
			toast.error("Available only in desktop app")
			return
		}

		setIsLoading(true)
		try {
			const selectedPath = await selectExportDirectory(orgSettings.orgRoamPath)
			if (selectedPath) {
				const newSettings = { ...orgSettings, orgRoamPath: selectedPath }
				setOrgSettings(newSettings)
				saveOrgmodeSettings(newSettings)
				toast.success("Org-roam path set")
			}
		} catch (error) {
			toast.error(`Failed to select path: ${error}`)
		} finally {
			setIsLoading(false)
		}
	}

	const updateOrgSettings = (updates: Partial<OrgmodeSettings>) => {
		const newSettings = { ...orgSettings, ...updates }
		setOrgSettings(newSettings)
		saveOrgmodeSettings(newSettings)
	}

	return (
		<div className="space-y-10 max-w-3xl">
			<div>
				<h3 className="text-lg font-medium">Export</h3>
				<p className="text-sm text-muted-foreground">Configure default paths and export options.</p>
			</div>

			<div className="space-y-12">
				{/* Browser Environment Warning */}
				{!isTauri && (
					<div className="flex items-start gap-3 p-4 rounded-md bg-muted/50 border border-border/50 text-muted-foreground">
						<AlertCircle className="size-5 mt-0.5 shrink-0" />
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">Browser Environment</p>
							<p className="text-sm">
								Custom export paths are only available in the desktop application. Files will be
								saved to your browser's default download directory.
							</p>
						</div>
					</div>
				)}

				{/* Default Path Section */}
				<div className="space-y-6">
					<div className="space-y-4">
						<div className="space-y-0.5">
							<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
								Default Export Path
							</h4>
							<p className="text-sm text-muted-foreground">Where files are saved by default.</p>
						</div>

						{/* Current Path */}
						<div className="space-y-3">
							<div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-dashed">
								<FolderOpen className="size-4 text-muted-foreground shrink-0" />
								<div className="flex-1 min-w-0">
									{defaultPath ? (
										<p className="text-sm font-mono truncate text-foreground" title={defaultPath}>
											{defaultPath}
										</p>
									) : (
										<p className="text-sm text-muted-foreground">
											{downloadsDir ? (
												<span className="font-mono">{downloadsDir} (System Default)</span>
											) : (
												"System Download Directory"
											)}
										</p>
									)}
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									size="sm"
									onClick={handleSelectPath}
									disabled={isLoading || !isTauri}
								>
									Change Path
								</Button>
								{defaultPath && (
									<Button variant="ghost" size="sm" onClick={handleClearPath} disabled={isLoading}>
										Reset to Default
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Org-mode Integration */}
				<div className="space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
								Org-mode Integration
							</h4>
							<p className="text-xs text-muted-foreground">
								Export journals as Emacs Org-mode files compatible with org-roam.
							</p>
						</div>
						<Switch
							checked={orgSettings.enabled}
							onCheckedChange={(checked) => updateOrgSettings({ enabled: checked })}
							disabled={!isTauri}
						/>
					</div>

					{orgSettings.enabled && (
						<div className="space-y-6 pl-4 border-l-2 border-muted ml-1">
							{/* Org-roam Root */}
							<div className="space-y-3">
								<Label className="text-sm font-normal text-muted-foreground">
									Org-roam Root Directory
								</Label>
								<div className="flex items-center gap-3">
									<div className="flex-1 p-2 rounded-md bg-muted/30 border border-dashed min-h-[36px] flex items-center px-3">
										{orgSettings.orgRoamPath ? (
											<p className="text-sm font-mono truncate" title={orgSettings.orgRoamPath}>
												{orgSettings.orgRoamPath}
											</p>
										) : (
											<p className="text-sm text-muted-foreground italic">
												Not set (e.g., ~/org-roam)
											</p>
										)}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={handleSelectOrgRoamPath}
										disabled={isLoading || !isTauri}
									>
										Select
									</Button>
								</div>
							</div>

							{/* Subdirectory */}
							<div className="space-y-3">
								<Label className="text-sm font-normal text-muted-foreground">
									Journal Subdirectory
								</Label>
								<Input
									value={orgSettings.diarySubdir}
									onChange={(e) => updateOrgSettings({ diarySubdir: e.target.value })}
									placeholder="diary"
									className="max-w-xs font-mono h-9"
								/>
								<p className="text-xs text-muted-foreground">
									Target: {orgSettings.orgRoamPath || "~/org-roam"}/{orgSettings.diarySubdir}/...
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
