import { createFileRoute } from "@tanstack/react-router";
import { Check, Monitor, RotateCcw } from "lucide-react";
import { Button } from "@/views/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/views/ui/card";
import { DebouncedSlider } from "@/views/ui/debounced-slider";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { Separator } from "@/views/ui/separator";
import { useFontSettings } from "@/state/font.state";
import {
	CARD_SIZE_OPTIONS,
	DEFAULT_UI_FONT,
	POPULAR_FONTS,
	UI_SCALE_OPTIONS,
} from "@/types/font";

export const Route = createFileRoute("/settings/typography")({
	component: TypographySettings,
});

function TypographySettings() {
	const {
		uiFontFamily,
		uiFontSize,
		uiScale,
		cardSize,
		cardBorderRadius,
		setUiFontFamily,
		setUiFontSize,
		setUiScale,
		setCardSize,
		setCardBorderRadius,
	} = useFontSettings();

	const resetUiSettings = () => {
		setUiFontFamily(DEFAULT_UI_FONT);
		setUiFontSize(14);
		setUiScale("default");
		setCardSize("default");
		setCardBorderRadius(8);
	};

	// 添加字体到列表
	const addFont = (font: string) => {
		const fonts = uiFontFamily.split(",").map((f) => f.trim());
		if (!fonts.some((f) => f.replace(/['"]/g, "") === font)) {
			setUiFontFamily(`'${font}', ${uiFontFamily}`);
		}
	};

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="text-lg font-medium">Interface Settings</h3>
					<p className="text-sm text-muted-foreground">
						Customize fonts and layout for the application interface.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={resetUiSettings}>
					<RotateCcw className="size-3.5 mr-2" />
					Reset
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* UI Typography Card */}
				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="flex items-center gap-2 text-base">
							<Monitor className="size-4" />
							Interface Typography
						</CardTitle>
						<CardDescription>
							Font settings for sidebar, menus, and UI elements
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* UI Font Family - VSCode style input */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									UI Font
								</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 text-xs"
									onClick={() => setUiFontFamily(DEFAULT_UI_FONT)}
								>
									Reset
								</Button>
							</div>
							<Input
								value={uiFontFamily}
								onChange={(e) => setUiFontFamily(e.target.value)}
								placeholder="'Font Name', sans-serif"
								className="font-mono text-xs"
							/>
							<div className="flex flex-wrap gap-1">
								{POPULAR_FONTS.map((font) => {
									const isIncluded = uiFontFamily.includes(font);
									return (
										<button
											type="button"
											key={font}
											onClick={() => addFont(font)}
											disabled={isIncluded}
											className={`
												px-1.5 py-0.5 text-[10px] rounded border transition-all
												${
													isIncluded
														? "bg-primary/10 border-primary/30 text-primary cursor-default"
														: "border-border hover:bg-muted hover:border-primary/50"
												}
											`}
										>
											{isIncluded && (
												<Check className="size-2.5 inline mr-0.5" />
											)}
											{font}
										</button>
									);
								})}
							</div>
						</div>

						<Separator />

						{/* UI Font Size */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									UI Font Size
								</Label>
								<span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
									{uiFontSize}px
								</span>
							</div>
							<DebouncedSlider
								value={[uiFontSize]}
								onValueChange={([v]: number[]) => setUiFontSize(v)}
								min={12}
								max={18}
								step={1}
								className="w-full"
							/>
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Compact</span>
								<span>Large</span>
							</div>
						</div>

						<Separator />

						{/* UI Scale */}
						<div className="space-y-3">
							<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								UI Scale
							</Label>
							<div className="grid grid-cols-2 gap-2">
								{UI_SCALE_OPTIONS.map((option) => (
									<button
										type="button"
										key={option.value}
										onClick={() => setUiScale(option.value)}
										className={`
											p-3 rounded-lg border text-center transition-all
											${
												uiScale === option.value
													? "border-primary ring-1 ring-primary/20 bg-primary/5"
													: "border-border hover:bg-muted/50"
											}
										`}
									>
										<div className="text-sm font-medium">{option.label}</div>
										<div className="text-xs text-muted-foreground">
											{option.description}
										</div>
									</button>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* UI Layout Card */}
				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="flex items-center gap-2 text-base">
							<Monitor className="size-4" />
							UI Layout
						</CardTitle>
						<CardDescription>Card sizes and layout spacing</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Card Size */}
						<div className="space-y-3">
							<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Card Size
							</Label>
							<div className="grid grid-cols-2 gap-2">
								{CARD_SIZE_OPTIONS.map((option) => (
									<button
										type="button"
										key={option.value}
										onClick={() => setCardSize(option.value)}
										className={`
											p-3 rounded-lg border text-center transition-all
											${
												cardSize === option.value
													? "border-primary ring-1 ring-primary/20 bg-primary/5"
													: "border-border hover:bg-muted/50"
											}
										`}
									>
										<div className="text-sm font-medium">{option.label}</div>
										<div className="text-xs text-muted-foreground">
											{option.description}
										</div>
									</button>
								))}
							</div>
						</div>

						<Separator />

						{/* Card Border Radius */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Card Roundness
								</Label>
								<span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
									{cardBorderRadius}px
								</span>
							</div>
							<DebouncedSlider
								value={[cardBorderRadius]}
								onValueChange={([v]: number[]) => setCardBorderRadius(v)}
								min={0}
								max={16}
								step={1}
								className="w-full"
							/>
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Square</span>
								<span>Rounded</span>
							</div>
						</div>

						{/* Preview Card */}
						<div className="space-y-3">
							<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Preview
							</Label>
							<div
								className="p-4 border bg-card text-card-foreground transition-all"
								style={{
									borderRadius: `${cardBorderRadius}px`,
									padding:
										CARD_SIZE_OPTIONS.find((c) => c.value === cardSize)
											?.padding || "1rem",
									fontFamily: uiFontFamily,
								}}
							>
								<div className="font-medium text-sm mb-2">Sample Card</div>
								<div className="text-xs text-muted-foreground">
									This shows how cards will look with your settings
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
