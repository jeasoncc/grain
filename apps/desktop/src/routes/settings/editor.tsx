import { FOLD_ICON_OPTIONS, getFoldIconLetters } from "@grain/editor-lexical";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus, Plus, RotateCcw, Sparkles, Type } from "lucide-react";
import { useEditorSettings } from "@/state/editor-settings.state";
import { useFontSettings } from "@/state/font.state";
import { DEFAULT_EDITOR_FONT, POPULAR_FONTS } from "@/types/font";
import { Button } from "@/views/ui/button";
import { DebouncedSlider } from "@/views/ui/debounced-slider";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { Switch } from "@/views/ui/switch";

export const Route = createFileRoute("/settings/editor")({
	component: EditorSettings,
});

function EditorSettings() {
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
	} = useFontSettings();

	const { foldIconStyle, setFoldIconStyle } = useEditorSettings();

	// 获取当前选中风格的字母列表
	const currentLetters = getFoldIconLetters(foldIconStyle);

	// 添加字体到列表
	const addFont = (font: string) => {
		const fonts = fontFamily.split(",").map((f) => f.trim());
		if (!fonts.some((f) => f.replace(/['"]/g, "") === font)) {
			setFontFamily(`'${font}', ${fontFamily}`);
		}
	};

	return (
		<div className="space-y-8 max-w-2xl">
			<div>
				<h3 className="text-lg font-medium">Editor</h3>
				<p className="text-sm text-muted-foreground">
					Customize the writing experience. Changes are saved automatically.
				</p>
			</div>

			{/* Font Settings */}
			<div className="space-y-6">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Type className="size-4" />
					<h4 className="text-sm font-medium uppercase tracking-wider">
						Typography
					</h4>
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
							const isIncluded = fontFamily.includes(font);
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
							);
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
						<span className="w-12 text-center font-mono text-sm">
							{fontSize}px
						</span>
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
							<p className="text-xs text-muted-foreground">
								Space between lines
							</p>
						</div>
						<span className="font-mono text-sm text-muted-foreground">
							{lineHeight.toFixed(1)}
						</span>
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
							<p className="text-xs text-muted-foreground">
								Space between characters
							</p>
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

				{/* Paragraph Spacing */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Paragraph Spacing</Label>
							<p className="text-xs text-muted-foreground">
								Space between paragraphs
							</p>
						</div>
						<span className="font-mono text-sm text-muted-foreground">
							{paragraphSpacing.toFixed(1)}em
						</span>
					</div>
					<DebouncedSlider
						value={[paragraphSpacing]}
						onValueChange={([v]) => setParagraphSpacing(v)}
						min={0}
						max={2.5}
						step={0.1}
					/>
				</div>

				{/* First Line Indent */}
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-sm">First Line Indent</Label>
						<p className="text-xs text-muted-foreground">
							Indent first line of paragraphs
						</p>
					</div>
					<div className="flex items-center gap-3">
						{firstLineIndent > 0 && (
							<span className="text-sm text-muted-foreground">
								{firstLineIndent} chars
							</span>
						)}
						<Switch
							checked={firstLineIndent > 0}
							onCheckedChange={(checked) => setFirstLineIndent(checked ? 2 : 0)}
						/>
					</div>
				</div>
			</div>

			{/* Behavior Settings */}
			<div className="space-y-6">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Sparkles className="size-4" />
					<h4 className="text-sm font-medium uppercase tracking-wider">
						Behavior
					</h4>
				</div>

				{/* Fold Icon Style */}
				<div className="space-y-3">
					<div>
						<Label className="text-sm">Heading Fold Icons</Label>
						<p className="text-xs text-muted-foreground">
							Symbol style for heading fold indicators
						</p>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{FOLD_ICON_OPTIONS.map((option) => {
							const isSelected = foldIconStyle === option.id;
							return (
								<button
									type="button"
									key={option.id}
									onClick={() => setFoldIconStyle(option.id)}
									className={`
										flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all
										${
											isSelected
												? "bg-primary/10 border-primary/50 ring-1 ring-primary/20"
												: "border-border hover:bg-muted hover:border-primary/30"
										}
									`}
								>
									<span className="text-lg font-serif min-w-[3rem] text-center opacity-80">
										{option.preview}
									</span>
									<div className="flex-1 min-w-0">
										<div className="text-xs font-medium truncate">
											{option.name}
										</div>
										{option.era && (
											<div className="text-[10px] text-muted-foreground truncate">
												{option.era}
											</div>
										)}
									</div>
									{isSelected && (
										<Check className="size-4 text-primary shrink-0" />
									)}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Preview */}
			<div className="space-y-3">
				<Label className="text-sm text-muted-foreground">Preview</Label>
				<div
					className="p-4 rounded-lg border bg-card"
					style={{
						fontFamily: fontFamily,
						fontSize: `${fontSize}px`,
						lineHeight: lineHeight,
						letterSpacing: `${letterSpacing}em`,
					}}
				>
					{/* Heading Preview with Fold Icons */}
					<div className="space-y-2 mb-4 pb-4 border-b border-border/50">
						<div className="flex items-center gap-2">
							<span className="text-sm font-serif opacity-60 w-4">
								{currentLetters[0]}
							</span>
							<h1 className="text-xl font-bold">Heading 1</h1>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-serif opacity-60 w-4">
								{currentLetters[1]}
							</span>
							<h2 className="text-lg font-semibold">Heading 2</h2>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-serif opacity-60 w-4">
								{currentLetters[2]}
							</span>
							<h3 className="text-base font-medium">Heading 3</h3>
						</div>
					</div>
					<p
						style={{
							textIndent: `${firstLineIndent}em`,
							marginBottom: `${paragraphSpacing}em`,
						}}
					>
						The old lighthouse stood defiant against the crashing waves, its
						beacon cutting through the thick fog.
					</p>
					<p
						style={{
							textIndent: `${firstLineIndent}em`,
							marginBottom: `${paragraphSpacing}em`,
						}}
					>
						古老的灯塔傲然矗立，抵御着汹涌的海浪，它的光芒穿透浓雾。
					</p>
					<p style={{ textIndent: `${firstLineIndent}em` }}>
						0123456789 ABCDEFG abcdefg 中文测试
					</p>
				</div>
			</div>
		</div>
	);
}
