import { createFileRoute } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/use-settings";
import { useUISettingsStore, type TabPosition } from "@/stores/ui-settings";

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

	const { tabPosition, setTabPosition } = useUISettingsStore();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">General Settings</h3>
				<p className="text-sm text-muted-foreground">
					Configure general preferences for the application.
				</p>
			</div>
			<Separator />

			<div className="grid gap-8">
				{/* Language */}
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

				{/* Auto Save */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base">Auto Save</Label>
							<p className="text-sm text-muted-foreground">
								Automatically save your work periodically.
							</p>
						</div>
						<Checkbox
							checked={autoSave}
							onCheckedChange={(c) => setAutoSave(!!c)}
							className="size-5"
						/>
					</div>

					{autoSave && (
						<div className="flex items-center justify-between pl-4 border-l-2 border-border/50 ml-1">
							<div className="space-y-0.5">
								<Label className="text-sm">Save Interval</Label>
								<p className="text-xs text-muted-foreground">
									How often to save (in seconds).
								</p>
							</div>
							<div className="w-[100px] flex items-center gap-2">
								<Input
									type="number"
									value={autoSaveInterval}
									onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
									min={10}
									max={3600}
								/>
								<span className="text-sm text-muted-foreground">s</span>
							</div>
						</div>
					)}
				</div>

				<Separator />

				{/* Spell Check */}
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base">Spell Check</Label>
						<p className="text-sm text-muted-foreground">
							Highlight misspelled words in the editor.
						</p>
					</div>
					<Checkbox
						checked={spellCheck}
						onCheckedChange={(c) => setSpellCheck(!!c)}
						className="size-5"
					/>
				</div>

				<Separator />

				{/* Tab Position */}
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
			</div>
		</div>
	);
}
