/**
 * 文字选中背景色测试组件
 */

import { useTheme } from "@/hooks/use-theme";
import { getDarkThemes, getLightThemes } from "@/lib/themes";

export default function TestSelection() {
	const { currentTheme, setTheme } = useTheme();
	const lightThemes = getLightThemes();
	const darkThemes = getDarkThemes();

	return (
		<div className="p-8 max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-2xl font-bold mb-4">文字选中背景色测试</h1>
				<div
					className="p-4 border rounded-lg mb-4"
					style={{ backgroundColor: "var(--editor-selection)" }}
				>
					<strong>当前主题:</strong> {currentTheme?.name}
					<br />
					<strong>选中背景色:</strong> {currentTheme?.colors.editorSelection}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				{/* 浅色主题 */}
				<div>
					<h2 className="text-xl font-semibold mb-4">浅色主题</h2>
					<div className="space-y-2">
						{lightThemes.slice(0, 5).map((theme) => (
							<button
								type="button"
								key={theme.key}
								onClick={() => setTheme(theme.key)}
								className={`w-full text-left p-3 rounded border ${
									currentTheme?.key === theme.key
										? "border-primary bg-accent"
										: "border-border"
								}`}
							>
								<div className="font-medium">{theme.name}</div>
								<div className="text-sm text-muted-foreground">
									选中色: {theme.colors.editorSelection}
								</div>
							</button>
						))}
					</div>
				</div>

				{/* 深色主题 */}
				<div>
					<h2 className="text-xl font-semibold mb-4">深色主题</h2>
					<div className="space-y-2">
						{darkThemes.slice(0, 5).map((theme) => (
							<button
								type="button"
								key={theme.key}
								onClick={() => setTheme(theme.key)}
								className={`w-full text-left p-3 rounded border ${
									currentTheme?.key === theme.key
										? "border-primary bg-accent"
										: "border-border"
								}`}
							>
								<div className="font-medium">{theme.name}</div>
								<div className="text-sm text-muted-foreground">
									选中色: {theme.colors.editorSelection}
								</div>
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="mt-8">
				<h2 className="text-xl font-semibold mb-4">测试内容</h2>
				<div className="space-y-4">
					<p className="text-base leading-relaxed">
						请选中这段文字来测试选中背景色的效果。这是一段普通的段落文字，
						你可以用鼠标拖拽来选中任意部分，观察选中背景色是否清晰可见。
					</p>

					<blockquote className="border-l-4 border-primary pl-4 italic">
						这是一段引用文字。请选中这段文字来测试引用内容的选中效果。
					</blockquote>

					<div className="bg-muted p-4 rounded">
						<code className="text-sm">
							这是一段代码文字。请选中这段代码来测试代码块内的选中效果。
						</code>
					</div>

					<h3 className="text-lg font-semibold">
						这是一个标题，请选中这个标题来测试标题的选中效果
					</h3>

					<p>
						<strong>这是粗体文字</strong>，<em>这是斜体文字</em>，
						<span className="text-primary underline cursor-pointer">
							这是链接文字
						</span>
						。 请分别选中这些不同样式的文字来测试选中效果。
					</p>
				</div>
			</div>

			<div className="mt-8 p-4 bg-card border rounded-lg">
				<h3 className="font-semibold mb-2">测试说明</h3>
				<ul className="text-sm space-y-1 text-muted-foreground">
					<li>1. 切换不同的主题</li>
					<li>2. 选中上面的文字内容</li>
					<li>3. 观察选中背景色是否清晰可见</li>
					<li>4. 验证每个主题的选中背景色都不同</li>
					<li>5. 特别注意深色主题下的选中效果</li>
				</ul>
			</div>
		</div>
	);
}
