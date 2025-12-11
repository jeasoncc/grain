import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { runScrollTests, logScrollTestResults, type ScrollTestResult } from "@/utils/scroll-test";
import { runComprehensiveScrollTest } from "@/test/scroll-behavior.test";

export const Route = createFileRoute("/settings/scroll-test")({
	component: ScrollTestSettings,
});

function ScrollTestSettings() {
	const [testResults, setTestResults] = useState<ScrollTestResult | null>(null);
	const [comprehensiveResults, setComprehensiveResults] = useState<any>(null);
	const [testing, setTesting] = useState(false);

	const handleRunTests = async () => {
		setTesting(true);
		try {
			const results = await runScrollTests();
			setTestResults(results);
			logScrollTestResults(results);
		} catch (error) {
			console.error('Failed to run scroll tests:', error);
		} finally {
			setTesting(false);
		}
	};

	const handleRunComprehensiveTests = async () => {
		setTesting(true);
		try {
			const results = await runComprehensiveScrollTest();
			setComprehensiveResults(results);
			console.log('Comprehensive test results:', results);
		} catch (error) {
			console.error('Failed to run comprehensive tests:', error);
		} finally {
			setTesting(false);
		}
	};

	return (
		<div className="space-y-6" data-testid="settings-content">
			<div>
				<h3 className="text-lg font-medium">滚动测试页面</h3>
				<p className="text-sm text-muted-foreground">
					此页面用于测试设置页面的滚动行为
				</p>
			</div>
			<Separator />

			{/* Test Controls */}
			<Card>
				<CardHeader>
					<CardTitle>滚动行为测试</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Button 
							onClick={handleRunTests} 
							disabled={testing}
							variant="outline"
						>
							{testing ? '测试中...' : '基础滚动测试'}
						</Button>
						<Button 
							onClick={handleRunComprehensiveTests} 
							disabled={testing}
						>
							{testing ? '测试中...' : '完整属性测试'}
						</Button>
					</div>
					
					{testResults && (
						<div className="space-y-2 p-4 bg-muted rounded-lg">
							<h4 className="font-medium">基础测试结果:</h4>
							<div className="space-y-1 text-sm">
								<div className="flex justify-between">
									<span>活动栏固定位置:</span>
									<span className={testResults.activityBarFixed ? 'text-green-600' : 'text-red-600'}>
										{testResults.activityBarFixed ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								<div className="flex justify-between">
									<span>内容区域可滚动:</span>
									<span className={testResults.contentScrollable ? 'text-green-600' : 'text-red-600'}>
										{testResults.contentScrollable ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								<div className="flex justify-between">
									<span>布局稳定性:</span>
									<span className={testResults.layoutStable ? 'text-green-600' : 'text-red-600'}>
										{testResults.layoutStable ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								{testResults.error && (
									<div className="text-red-600 text-xs mt-2">
										错误: {testResults.error}
									</div>
								)}
							</div>
						</div>
					)}

					{comprehensiveResults && (
						<div className="space-y-2 p-4 bg-muted rounded-lg">
							<h4 className="font-medium">完整属性测试结果:</h4>
							<div className="space-y-1 text-sm">
								<div className="flex justify-between">
									<span>属性 25 - 活动栏固定位置:</span>
									<span className={comprehensiveResults.activityBarFixed ? 'text-green-600' : 'text-red-600'}>
										{comprehensiveResults.activityBarFixed ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								<div className="flex justify-between">
									<span>属性 26 - 滚动区域限制:</span>
									<span className={comprehensiveResults.scrollAreaLimited ? 'text-green-600' : 'text-red-600'}>
										{comprehensiveResults.scrollAreaLimited ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								<div className="flex justify-between">
									<span>属性 27 - 布局稳定性:</span>
									<span className={comprehensiveResults.layoutStable ? 'text-green-600' : 'text-red-600'}>
										{comprehensiveResults.layoutStable ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								<div className="flex justify-between">
									<span>属性 28 - 设置选项可访问性:</span>
									<span className={comprehensiveResults.settingsAccessible ? 'text-green-600' : 'text-red-600'}>
										{comprehensiveResults.settingsAccessible ? '✓ 通过' : '✗ 失败'}
									</span>
								</div>
								<div className="flex justify-between font-medium mt-2 pt-2 border-t">
									<span>总体结果:</span>
									<span className={comprehensiveResults.allPassed ? 'text-green-600' : 'text-red-600'}>
										{comprehensiveResults.allPassed ? '🎉 全部通过' : '⚠️ 部分失败'}
									</span>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* 生成大量内容来测试滚动 */}
			{Array.from({ length: 20 }, (_, i) => (
				<Card key={i} className="w-full">
					<CardHeader>
						<CardTitle>测试卡片 {i + 1}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground mb-4">
							这是第 {i + 1} 个测试卡片。当页面内容超出视窗高度时，应该只有内容区域可以滚动，
							而活动栏应该保持固定在左侧。
						</p>
						<div className="space-y-2">
							<div className="h-4 bg-muted rounded w-full" />
							<div className="h-4 bg-muted rounded w-3/4" />
							<div className="h-4 bg-muted rounded w-1/2" />
						</div>
					</CardContent>
				</Card>
			))}

			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">
					滚动测试完成 - 活动栏应该始终保持固定位置
				</p>
			</div>
		</div>
	);
}