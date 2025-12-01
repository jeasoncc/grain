// 字体排版设置页面
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
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
		<div className="flex min-h-svh flex-col">
			<div className="border-b px-6 py-4 flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">字体与排版</h1>
					<p className="text-sm text-muted-foreground">
						自定义编辑器的字体、大小和排版样式
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={reset}>
					<RotateCcw className="size-4 mr-2" />
					恢复默认
				</Button>
			</div>

			<div className="flex-1 p-6">
				<div className="max-w-4xl mx-auto space-y-8">
					{/* 字体选择 */}
					<div className="space-y-4">
						<Label className="text-base font-medium">字体系列</Label>
						<RadioGroup value={fontFamily} onValueChange={setFontFamily}>
							<div className="grid grid-cols-2 gap-3">
								{AVAILABLE_FONTS.map((font) => (
									<label
										key={font.value}
										className={`
                      flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
												fontFamily === font.value
													? "border-primary bg-primary/5"
													: "border-border hover:border-primary/50"
											}
                    `}
									>
										<RadioGroupItem value={font.value} className="sr-only" />
										<div className="flex-1">
											<div className="font-medium">{font.label}</div>
											<div
												className="text-sm text-muted-foreground mt-1"
												style={{ fontFamily: font.family }}
											>
												春江潮水连海平 AaBbCc 123
											</div>
										</div>
									</label>
								))}
							</div>
						</RadioGroup>
					</div>

					{/* 字体大小 */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>字体大小</Label>
							<span className="text-sm text-muted-foreground">
								{fontSize}px
							</span>
						</div>
						<Slider
							value={[fontSize]}
							onValueChange={([v]: number[]) => setFontSize(v)}
							min={14}
							max={24}
							step={1}
							className="w-full"
						/>
					</div>

					{/* 行高 */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>行高</Label>
							<span className="text-sm text-muted-foreground">
								{lineHeight.toFixed(1)}
							</span>
						</div>
						<Slider
							value={[lineHeight]}
							onValueChange={([v]: number[]) => setLineHeight(v)}
							min={1.5}
							max={2.5}
							step={0.1}
							className="w-full"
						/>
					</div>

					{/* 字间距 */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>字间距</Label>
							<span className="text-sm text-muted-foreground">
								{letterSpacing.toFixed(2)}em
							</span>
						</div>
						<Slider
							value={[letterSpacing]}
							onValueChange={([v]: number[]) => setLetterSpacing(v)}
							min={-0.05}
							max={0.1}
							step={0.01}
							className="w-full"
						/>
					</div>

					{/* 段落间距 */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>段落间距</Label>
							<span className="text-sm text-muted-foreground">
								{paragraphSpacing.toFixed(1)}em
							</span>
						</div>
						<Slider
							value={[paragraphSpacing]}
							onValueChange={([v]: number[]) => setParagraphSpacing(v)}
							min={0}
							max={2}
							step={0.1}
							className="w-full"
						/>
					</div>

					{/* 首行缩进 */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>首行缩进</Label>
							<span className="text-sm text-muted-foreground">
								{firstLineIndent.toFixed(0)}字符
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

					{/* 预览 */}
					<div className="space-y-3">
						<Label className="text-base font-medium">预览效果</Label>
						<div
							className="p-6 rounded-lg border bg-card"
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
								春江潮水连海平，海上明月共潮生。滟滟随波千万里，何处春江无月明！
							</p>
							<p
								style={{
									textIndent: `${firstLineIndent}em`,
									marginBottom: `${paragraphSpacing}em`,
								}}
							>
								江流宛转绕芳甸，月照花林皆似霰。空里流霜不觉飞，汀上白沙看不见。
							</p>
							<p style={{ textIndent: `${firstLineIndent}em` }}>
								江天一色无纤尘，皎皎空中孤月轮。江畔何人初见月？江月何年初照人？
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
