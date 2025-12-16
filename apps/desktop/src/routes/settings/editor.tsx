import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { useFontSettings } from "@/stores/font";

export const Route = createFileRoute("/settings/editor")({
	component: EditorSettings,
});

function EditorSettings() {
	const {
		fontFamily,
		fontSize,
		lineHeight,
		paragraphSpacing,
		setFontFamily,
		setFontSize,
		setLineHeight,
		setParagraphSpacing,
	} = useSettings();

	const { firstLineIndent, setFirstLineIndent } = useFontSettings();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Editor Settings</h3>
				<p className="text-sm text-muted-foreground">
					Customize the writing experience.
				</p>
			</div>
			<Separator />

			<div className="grid gap-6">
				{/* Typography Section */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<Type className="size-4 text-primary" />
							Typography
						</CardTitle>
						<CardDescription>
							Control fonts, sizes, and spacing for optimal readability.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						{/* Font Family */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Font Family</Label>
								<p className="text-sm text-muted-foreground">
									The primary font used for writing.
								</p>
							</div>
							<div className="w-[200px]">
								<Select value={fontFamily} onValueChange={setFontFamily}>
									<SelectTrigger>
										<SelectValue placeholder="Select font" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Merriweather">
											Merriweather (Serif)
										</SelectItem>
										<SelectItem value="Inter">Inter (Sans)</SelectItem>
										<SelectItem value="Georgia">Georgia</SelectItem>
										<SelectItem value="Times New Roman">
											Times New Roman
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<Separator />

						{/* Font Size */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Font Size</Label>
								<p className="text-sm text-muted-foreground">
									Adjust the text size (px).
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									size="icon"
									className="size-8"
									onClick={() => setFontSize(Math.max(12, fontSize - 1))}
									disabled={fontSize <= 12}
								>
									<Minus className="size-4" />
								</Button>
								<div className="w-12 text-center font-mono text-sm">
									{fontSize}px
								</div>
								<Button
									variant="outline"
									size="icon"
									className="size-8"
									onClick={() => setFontSize(Math.min(32, fontSize + 1))}
									disabled={fontSize >= 32}
								>
									<Plus className="size-4" />
								</Button>
							</div>
						</div>

						<Separator />

						{/* Line Height */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Line Height</Label>
								<p className="text-sm text-muted-foreground">
									Vertical spacing between lines.
								</p>
							</div>
							<div className="w-[200px]">
								<Select
									value={lineHeight.toString()}
									onValueChange={(v) => setLineHeight(Number(v))}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select height" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="1.2">Compact (1.2)</SelectItem>
										<SelectItem value="1.5">Standard (1.5)</SelectItem>
										<SelectItem value="1.6">Relaxed (1.6)</SelectItem>
										<SelectItem value="1.8">Loose (1.8)</SelectItem>
										<SelectItem value="2">Double (2.0)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<Separator />

						{/* Paragraph Spacing */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">Paragraph Spacing</Label>
								<p className="text-sm text-muted-foreground">
									Spacing between paragraphs.
								</p>
							</div>
							<div className="w-[200px]">
								<Select
									value={paragraphSpacing.toString()}
									onValueChange={(v) => setParagraphSpacing(Number(v))}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select spacing" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0.5">Compact</SelectItem>
										<SelectItem value="1">Standard</SelectItem>
										<SelectItem value="1.2">Relaxed</SelectItem>
										<SelectItem value="1.5">Wide</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<Separator />

						{/* First Line Indent */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">First Line Indent</Label>
								<p className="text-sm text-muted-foreground">
									Indent the first line of each paragraph.
								</p>
							</div>
							<div className="flex items-center gap-3">
								<span className="text-sm text-muted-foreground w-16 text-right">
									{firstLineIndent > 0 ? `${firstLineIndent} chars` : "Off"}
								</span>
								<Switch
									checked={firstLineIndent > 0}
									onCheckedChange={(checked) => setFirstLineIndent(checked ? 2 : 0)}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Preview */}
				<Card className="bg-muted/30 border-dashed">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium uppercase text-muted-foreground">
							Preview
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 pt-0">
						<div
							className="max-w-2xl mx-auto bg-background p-8 rounded-lg shadow-sm border"
							style={{
								fontFamily,
								fontSize: `${fontSize}px`,
								lineHeight,
							}}
						>
							<p style={{ marginBottom: `${paragraphSpacing}em`, textIndent: `${firstLineIndent}em` }}>
								The old lighthouse stood defiant against the crashing waves, its
								beacon cutting through the thick fog like a silver blade. For
								generations, it had guided sailors home, but tonight, the light
								seemed to flicker with an eerie, irregular rhythm.
							</p>
							<p style={{ marginBottom: `${paragraphSpacing}em`, textIndent: `${firstLineIndent}em` }}>
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
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
