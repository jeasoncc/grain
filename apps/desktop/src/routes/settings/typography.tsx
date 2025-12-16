import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { AVAILABLE_FONTS, useFontSettings } from "@/stores/font";

export const Route = createFileRoute("/settings/typography")({
	component: TypographySettings,
});

function TypographySettings() {
	const {
		fontFamily,
		fontSize,
		lineHeight,
		letterSpacing,
		paragraphSpacing,
		firstLineIndent,
		setFontFamily,
		setFontSize,
		setLineHeight,
		setLetterSpacing,
		setParagraphSpacing,
		setFirstLineIndent,
		reset,
	} = useFontSettings();

	const currentFont =
		AVAILABLE_FONTS.find((f) => f.value === fontFamily) || AVAILABLE_FONTS[0];

	return (
		<div className="space-y-10 max-w-3xl">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="text-lg font-medium">Typography</h3>
					<p className="text-sm text-muted-foreground">
						Customize font, size, and layout for reading.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={reset}>
					<RotateCcw className="size-3.5 mr-2" />
					Reset
				</Button>
			</div>

			<div className="space-y-12">
				{/* Font Selection */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Font Family</h4>
					<RadioGroup value={fontFamily} onValueChange={setFontFamily}>
						<div className="grid grid-cols-2 gap-3">
							{AVAILABLE_FONTS.map((font) => (
								<label
									key={font.value}
									className={`
                      flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                      ${
												fontFamily === font.value
													? "border-primary ring-1 ring-primary/20 bg-primary/5"
													: "border-border hover:bg-muted/50"
											}
                    `}
								>
									<RadioGroupItem value={font.value} className="sr-only" />
									<div className="flex-1">
										<div className="font-medium text-sm">{font.label}</div>
										<div
											className="text-xs text-muted-foreground mt-1 truncate"
											style={{ fontFamily: font.family }}
										>
											The quick brown fox jumps over the lazy dog
										</div>
									</div>
								</label>
							))}
						</div>
					</RadioGroup>
				</div>

				{/* Metrics */}
				<div className="space-y-8">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Metrics</h4>
					
					{/* Font Size */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="font-normal">Font Size</Label>
							<span className="text-sm font-mono text-muted-foreground">
								{fontSize}px
							</span>
						</div>
						<Slider
							value={[fontSize]}
							onValueChange={([v]: number[]) => setFontSize(v)}
							min={14}
							max={32}
							step={1}
							className="w-full"
						/>
					</div>

					{/* Line Height */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="font-normal">Line Height</Label>
							<span className="text-sm font-mono text-muted-foreground">
								{lineHeight.toFixed(1)}
							</span>
						</div>
						<Slider
							value={[lineHeight]}
							onValueChange={([v]: number[]) => setLineHeight(v)}
							min={1.2}
							max={2.5}
							step={0.1}
							className="w-full"
						/>
					</div>

					{/* Letter Spacing */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="font-normal">Letter Spacing</Label>
							<span className="text-sm font-mono text-muted-foreground">
								{letterSpacing.toFixed(2)}em
							</span>
						</div>
						<Slider
							value={[letterSpacing]}
							onValueChange={([v]: number[]) => setLetterSpacing(v)}
							min={-0.05}
							max={0.2}
							step={0.01}
							className="w-full"
						/>
					</div>

					{/* Paragraph Spacing */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="font-normal">Paragraph Spacing</Label>
							<span className="text-sm font-mono text-muted-foreground">
								{paragraphSpacing.toFixed(1)}em
							</span>
						</div>
						<Slider
							value={[paragraphSpacing]}
							onValueChange={([v]: number[]) => setParagraphSpacing(v)}
							min={0}
							max={2.5}
							step={0.1}
							className="w-full"
						/>
					</div>

					{/* First Line Indent */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="font-normal">First Line Indent</Label>
							<span className="text-sm font-mono text-muted-foreground">
								{firstLineIndent.toFixed(0)} chars
							</span>
						</div>
						<Slider
							value={[firstLineIndent]}
							onValueChange={([v]: number[]) => setFirstLineIndent(v)}
							min={0}
							max={4}
							step={1}
							className="w-full"
						/>
					</div>
				</div>

				{/* Preview */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Preview</h4>
					<div
						className="p-8 rounded-lg border bg-background/50"
						style={{
							fontFamily: currentFont.family,
							fontSize: `${fontSize}px`,
							lineHeight: lineHeight,
							letterSpacing: `${letterSpacing}em`,
						}}
					>
						<p
							style={{
								textIndent: `${firstLineIndent}em`,
								marginBottom: `${paragraphSpacing}em`,
							}}
						>
							The old lighthouse stood defiant against the crashing waves, its
							beacon cutting through the thick fog like a silver blade. For
							generations, it had guided sailors home, but tonight, the light
							seemed to flicker with an eerie, irregular rhythm.
						</p>
						<p
							style={{
								textIndent: `${firstLineIndent}em`,
								marginBottom: `${paragraphSpacing}em`,
							}}
						>
							Elias wiped the salt spray from his glasses and squinted into
							the dark. He had tended this lamp for forty years, knowing every
							gear and lens by heart. But the sound echoing from the lantern
							room wasn't mechanical. It was a whisper.
						</p>
						<p style={{ textIndent: `${firstLineIndent}em` }}>
							"They are coming," it said, carried on the wind that shouldn't
							have been able to breach the thick glass walls.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
