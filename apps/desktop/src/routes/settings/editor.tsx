import { createFileRoute } from "@tanstack/react-router"
import { Check, Minus, Plus, RotateCcw, Type } from "lucide-react"
import { useFontSettings } from "@/state/font.state"
import { DEFAULT_EDITOR_FONT, POPULAR_FONTS } from "@/types/font"
import { Button } from "@/views/ui/button"
import { DebouncedSlider } from "@/views/ui/debounced-slider"
import { Input } from "@/views/ui/input"
import { Label } from "@/views/ui/label"
import { OrgCaptureSettings } from "@/views/app-layout/org-capture-settings.view.fn"
import { OrgKeymapSettings } from "@/views/app-layout/org-keymap-settings.view.fn"
import { OrgBehaviorSettings } from "@/views/app-layout/org-behavior-settings.view.fn"
import { OrgAgendaSettings } from "@/views/app-layout/org-agenda-settings.view.fn"
import { ApplicationPopupSettings } from "@/views/app-layout/application-popup-settings.view.fn"

export const Route = createFileRoute("/settings/editor")({
	component: EditorSettings,
})

function EditorSettings() {
	const {
		fontFamily,
		fontSize,
		lineHeight,
		letterSpacing,
		setFontFamily,
		setFontSize,
		setLineHeight,
		setLetterSpacing,
	} = useFontSettings()


	// 添加字体到列表
	const addFont = (font: string) => {
		const fonts = fontFamily.split(",").map((f) => f.trim())
		if (!fonts.some((f) => f.replace(/['"]/g, "") === font)) {
			setFontFamily(`'${font}', ${fontFamily}`)
		}
	}

	return (
		<div className="space-y-8 max-w-2xl">
			<div>
				<h3 className="text-lg font-medium">Editor</h3>
				<p className="text-sm text-muted-foreground">
					Org source typography. Changes are saved automatically.
				</p>
			</div>

			{/* Font Settings */}
			<div className="space-y-6">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Type className="size-4" />
					<h4 className="text-sm font-medium uppercase tracking-wider">Typography</h4>
				</div>

				{/* Font Family - VSCode style input */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Font Family</Label>
							<p className="text-xs text-muted-foreground">
								Comma-separated list (first available will be used)
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={() => setFontFamily(DEFAULT_EDITOR_FONT)}
						>
							<RotateCcw className="size-3 mr-1" />
							Reset
						</Button>
					</div>
					<Input
						value={fontFamily}
						onChange={(e) => setFontFamily(e.target.value)}
						placeholder="'Font Name', 'Fallback Font', monospace"
						className="font-mono text-sm"
					/>

					{/* Quick add popular fonts */}
					<div className="flex flex-wrap gap-1.5">
						{POPULAR_FONTS.map((font) => {
							const isIncluded = fontFamily.includes(font)
							return (
								<button
									type="button"
									key={font}
									onClick={() => addFont(font)}
									disabled={isIncluded}
									className={`
										px-2 py-1 text-xs rounded border transition-all
										${
											isIncluded
												? "bg-primary/10 border-primary/30 text-primary cursor-default"
												: "border-border hover:bg-muted hover:border-primary/50"
										}
									`}
								>
									{isIncluded && <Check className="size-3 inline mr-1" />}
									{font}
								</button>
							)
						})}
					</div>
				</div>

				{/* Font Size */}
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-sm">Font Size</Label>
						<p className="text-xs text-muted-foreground">Text size in pixels</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							className="size-8"
							onClick={() => setFontSize(Math.max(12, fontSize - 1))}
						>
							<Minus className="size-4" />
						</Button>
						<span className="w-12 text-center font-mono text-sm">{fontSize}px</span>
						<Button
							variant="outline"
							size="icon"
							className="size-8"
							onClick={() => setFontSize(Math.min(32, fontSize + 1))}
						>
							<Plus className="size-4" />
						</Button>
					</div>
				</div>

				{/* Line Height */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Line Height</Label>
							<p className="text-xs text-muted-foreground">Space between lines</p>
						</div>
						<span className="font-mono text-sm text-muted-foreground">{lineHeight.toFixed(1)}</span>
					</div>
					<DebouncedSlider
						value={[lineHeight]}
						onValueChange={([v]) => setLineHeight(v)}
						min={1.2}
						max={2.5}
						step={0.1}
					/>
				</div>

				{/* Letter Spacing */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Letter Spacing</Label>
							<p className="text-xs text-muted-foreground">Space between characters</p>
						</div>
						<span className="font-mono text-sm text-muted-foreground">
							{letterSpacing.toFixed(2)}em
						</span>
					</div>
					<DebouncedSlider
						value={[letterSpacing]}
						onValueChange={([v]) => setLetterSpacing(v)}
						min={-0.05}
						max={0.2}
						step={0.01}
					/>
				</div>

			</div>

			<OrgCaptureSettings />
			<OrgKeymapSettings />
			<OrgBehaviorSettings />
			<OrgAgendaSettings />
			<ApplicationPopupSettings />


			{/* Preview */}
			<div className="space-y-3">
				<Label className="text-sm text-muted-foreground">Org source typography preview</Label>
				<div
					className="p-4 rounded-lg border bg-card"
					style={{
						fontFamily: fontFamily,
						fontSize: `${fontSize}px`,
						letterSpacing: `${letterSpacing}em`,
						lineHeight: lineHeight,
					}}
				>
					<pre className="whitespace-pre-wrap font-[inherit]">
						{"* Heading 1\nThe old lighthouse stood defiant against the crashing waves.\n古老的灯塔傲然矗立，抵御着汹涌的海浪。\n0123456789 ABCDEFG abcdefg"}
					</pre>
				</div>
			</div>
		</div>
	)
}
