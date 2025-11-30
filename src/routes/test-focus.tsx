/**
 * 焦点样式测试页面
 * 用于验证焦点样式是否正确工作
 */
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/test-focus")({
	component: TestFocusPage,
});

function TestFocusPage() {
	return (
		<div className="container max-w-4xl py-8 space-y-8">
			<div>
				<h1 className="text-3xl font-bold mb-2">焦点样式测试</h1>
				<p className="text-muted-foreground">
					测试不同元素的焦点样式。使用 Tab 键导航查看键盘焦点，使用鼠标点击查看鼠标焦点。
				</p>
			</div>

			{/* 按钮测试 */}
			<Card>
				<CardHeader>
					<CardTitle>按钮焦点测试</CardTitle>
					<CardDescription>
						鼠标点击：不显示焦点轮廓 | Tab 键导航：显示焦点轮廓
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-3">
						<Button>默认按钮</Button>
						<Button variant="secondary">次要按钮</Button>
						<Button variant="outline">轮廓按钮</Button>
						<Button variant="ghost">幽灵按钮</Button>
						<Button variant="destructive">危险按钮</Button>
					</div>
				</CardContent>
			</Card>

			{/* 输入框测试 */}
			<Card>
				<CardHeader>
					<CardTitle>输入框焦点测试</CardTitle>
					<CardDescription>
						点击或 Tab 键导航：显示边框高亮和阴影效果
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Input placeholder="普通输入框" />
					<Input type="email" placeholder="邮箱输入框" />
					<Input type="password" placeholder="密码输入框" />
					<Textarea placeholder="多行文本框" rows={4} />
				</CardContent>
			</Card>

			{/* 链接测试 */}
			<Card>
				<CardHeader>
					<CardTitle>链接焦点测试</CardTitle>
					<CardDescription>
						鼠标点击：不显示焦点轮廓 | Tab 键导航：显示焦点轮廓
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="space-y-2">
						<a href="#" className="text-primary hover:underline block">
							普通链接
						</a>
						<a href="#" className="text-muted-foreground hover:text-foreground block">
							次要链接
						</a>
						<a href="#" className="underline block">
							下划线链接
						</a>
					</div>
				</CardContent>
			</Card>

			{/* 自定义元素测试 */}
			<Card>
				<CardHeader>
					<CardTitle>自定义元素焦点测试</CardTitle>
					<CardDescription>
						使用 tabIndex 使元素可聚焦
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div
						tabIndex={0}
						className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
					>
						可聚焦的 div（tabIndex=0）
					</div>
					<div
						tabIndex={0}
						className="p-4 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
					>
						另一个可聚焦的 div
					</div>
				</CardContent>
			</Card>

			{/* 测试说明 */}
			<Card>
				<CardHeader>
					<CardTitle>测试说明</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<h3 className="font-semibold">键盘导航测试</h3>
						<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
							<li>按 Tab 键在元素间导航</li>
							<li>确认焦点指示器清晰可见（蓝色轮廓）</li>
							<li>确认焦点顺序符合逻辑（从上到下）</li>
							<li>按 Shift+Tab 反向导航</li>
						</ol>
					</div>

					<div className="space-y-2">
						<h3 className="font-semibold">鼠标点击测试</h3>
						<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
							<li>点击按钮和链接</li>
							<li>确认不显示焦点轮廓（除了输入框）</li>
							<li>确认功能正常</li>
						</ol>
					</div>

					<div className="space-y-2">
						<h3 className="font-semibold">预期行为</h3>
						<ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
							<li>✅ 按钮：鼠标点击无轮廓，Tab 键有轮廓</li>
							<li>✅ 输入框：点击和 Tab 键都有边框高亮</li>
							<li>✅ 链接：鼠标点击无轮廓，Tab 键有轮廓</li>
							<li>✅ 自定义元素：Tab 键有轮廓</li>
						</ul>
					</div>
				</CardContent>
			</Card>

			{/* 返回按钮 */}
			<div className="flex justify-center">
				<Button variant="outline" onClick={() => window.history.back()}>
					返回
				</Button>
			</div>
		</div>
	);
}
