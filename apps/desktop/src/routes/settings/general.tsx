import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import { useUIStore, type TabPosition } from "@/stores/ui";
import { Globe, Save, LayoutTemplate, SpellCheck as SpellCheckIcon } from "lucide-react";

export const Route = createFileRoute("/settings/general")({
	component: GeneralSettings,
});

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
	} = useSettings();

	const { tabPosition, setTabPosition } = useUIStore();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">General Settings</h3>
				<p className="text-sm text-muted-foreground">
					Configure general preferences for the application.
				</p>
			</div>
			<Separator />

			<div className="grid gap-6">
				{/* Application Preferences */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<LayoutTemplate className="size-4 text-primary" />
							Application
						</CardTitle>
						<CardDescription>
							Customize how the application looks and behaves.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Language</Label>
								<p className="text-sm text-muted-foreground">
									Select the display language.
								</p>
							</div>
							<div className="w-[200px]">
								<Select
									value={language}
									onValueChange={(v: "zh" | "en") => setLanguage(v)}
								>
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

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Tab Position</Label>
								<p className="text-sm text-muted-foreground">
									Choose where editor tabs are displayed.
								</p>
							</div>
							<div className="w-[200px]">
								<Select
									value={tabPosition}
									onValueChange={(v: TabPosition) => setTabPosition(v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select position" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="top">Top</SelectItem>
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
						<CardTitle className="text-base flex items-center gap-2">
							<Save className="size-4 text-primary" />
							Editor & Saving
						</CardTitle>
						<CardDescription>
							Manage auto-save behavior and writing aids.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Auto Save</Label>
								<p className="text-sm text-muted-foreground">
									Automatically save your work periodically.
								</p>
							</div>
							<Switch
								checked={autoSave}
								onCheckedChange={(c) => setAutoSave(!!c)}
							/>
						</div>

						{autoSave && (
							<div className="flex items-center justify-between bg-muted/50 p-3 rounded-md -mt-2">
								<div className="space-y-0.5">
									<Label className="text-sm">Save Interval</Label>
									<p className="text-xs text-muted-foreground">
										How often to save (in seconds).
									</p>
								</div>
								<div className="w-[120px] flex items-center gap-2">
									<Input
										type="number"
										value={autoSaveInterval}
										onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
										min={10}
										max={3600}
										className="h-8"
									/>
									<span className="text-sm text-muted-foreground">s</span>
								</div>
							</div>
						)}

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Spell Check</Label>
								<p className="text-sm text-muted-foreground">
									Highlight misspelled words in the editor.
								</p>
							</div>
							<Switch
								checked={spellCheck}
								onCheckedChange={(c) => setSpellCheck(!!c)}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
