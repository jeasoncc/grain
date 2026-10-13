import { createFileRoute } from "@tanstack/react-router"
import {
	AppWindow,
	Clock,
	Languages,
	LayoutTemplate,
	Monitor,
	Save,
	SpellCheck,
} from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { useUIStore } from "@/state/ui.state"
import type { TabPosition } from "@/types/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/views/ui/card"
import { Input } from "@/views/ui/input"
import { Label } from "@/views/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/views/ui/select"
import { Switch } from "@/views/ui/switch"

export const Route = createFileRoute("/settings/general")({
	component: GeneralSettings,
})

function GeneralSettings() {
	const {
		language,
		autoSave,
		autoSaveInterval,
		spellCheck,
		setLanguage,
		setAutoSave,
		setAutoSaveInterval,
		setSpellCheck,
	} = useSettings()

	const { tabPosition, setTabPosition } = useUIStore()
	const invalidAutoSaveInterval = !Number.isFinite(autoSaveInterval) ||
		autoSaveInterval < 1 || autoSaveInterval > 60

	return (
		<div className="space-y-6 max-w-3xl">
			<div>
				<h3 className="text-lg font-medium">General Settings</h3>
				<p className="text-sm text-muted-foreground">
					Configure general preferences for the application.
				</p>
			</div>

			<div className="grid gap-6">
				{/* Application Preferences */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Monitor className="size-5" />
							Application
						</CardTitle>
						<CardDescription>Customize how the application looks and behaves.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Language */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-primary/10 text-primary">
									<Languages className="size-4" />
								</div>
								<div className="space-y-0.5">
									<Label className="text-base font-normal">Language</Label>
									<p className="text-sm text-muted-foreground">Select the display language.</p>
								</div>
							</div>
							<div className="w-[200px]">
								<Select value={language} onValueChange={(v: "zh" | "en") => setLanguage(v)}>
									<SelectTrigger>
										<SelectValue placeholder="Select language" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="zh">简体中文</SelectItem>
										<SelectItem value="en">English</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Tab Position */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-primary/10 text-primary">
									<LayoutTemplate className="size-4" />
								</div>
								<div className="space-y-0.5">
									<Label className="text-base font-normal">Tab Position</Label>
									<p className="text-sm text-muted-foreground">
										Choose where editor tabs are displayed.
									</p>
								</div>
							</div>
							<div className="w-[200px]">
								<Select value={tabPosition} onValueChange={(v: TabPosition) => setTabPosition(v)}>
									<SelectTrigger>
										<SelectValue placeholder="Select position" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="top">Top Bar</SelectItem>
										<SelectItem value="right-sidebar">Right Sidebar</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Editor & Saving */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AppWindow className="size-5" />
							Editor & Saving
						</CardTitle>
						<CardDescription>Manage how your content is saved and checked.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Auto Save */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-green-500/10 text-green-600">
										<Save className="size-4" />
									</div>
									<div className="space-y-0.5">
										<Label htmlFor="auto-save" className="text-base font-normal">Auto Save</Label>
										<p id="auto-save-help" className="text-sm text-muted-foreground">
											Save dirty active and parked buffers after the quiet interval. Turning this off cancels queued saves; already accepted saves still finish.
										</p>
									</div>
								</div>
								<Switch id="auto-save" aria-describedby="auto-save-help" checked={autoSave} onCheckedChange={(c) => setAutoSave(!!c)} />
							</div>

							{invalidAutoSaveInterval && (
								<p id="auto-save-error" role="alert" className="text-sm text-destructive">
									Auto Save is paused: the saved interval must be a finite number from 1 to 60 seconds. Enable Auto Save to enter a valid interval.
								</p>
							)}

							{autoSave && (
								<div className="ml-12 p-4 rounded-lg bg-muted/30 border flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
									<div className="flex items-center gap-3">
										<Clock className="size-4 text-muted-foreground" />
										<div className="space-y-0.5">
											<Label htmlFor="auto-save-interval" className="text-sm font-normal">Save Interval</Label>
											<p id="auto-save-interval-help" className="text-xs text-muted-foreground">
												Seconds without a Source edit before saving each dirty buffer.
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Input
											id="auto-save-interval"
											aria-describedby={invalidAutoSaveInterval ? "auto-save-interval-help auto-save-error" : "auto-save-interval-help"}
											aria-invalid={invalidAutoSaveInterval || undefined}
											type="number"
											value={Number.isFinite(autoSaveInterval) ? autoSaveInterval : ""}
											onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
											min={1}
											max={60}
											className="h-8 w-20 text-center"
										/>
										<span className="text-sm text-muted-foreground">sec</span>
									</div>
								</div>
							)}
						</div>

						{/* Spell Check */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
									<SpellCheck className="size-4" />
								</div>
								<div className="space-y-0.5">
									<Label className="text-base font-normal">Spell Check</Label>
									<p className="text-sm text-muted-foreground">
										Highlight misspelled words in the editor.
									</p>
								</div>
							</div>
							<Switch checked={spellCheck} onCheckedChange={(c) => setSpellCheck(!!c)} />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
