import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runScrollTests, logScrollTestResults, type ScrollTestResult } from "@/utils/scroll-test";
import { runComprehensiveScrollTest } from "@/test/scroll-behavior.test";
import { DevOnlyPage } from "@/components/dev-only";

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
		<DevOnlyPage redirectTo="/settings">
		<div className="space-y-10 max-w-3xl" data-testid="settings-content">
			<div>
				<h3 className="text-lg font-medium">Scroll Behavior Test</h3>
				<p className="text-sm text-muted-foreground">
					Test page for verifying scroll isolation and layout stability.
				</p>
			</div>

			<div className="space-y-8">
				{/* Controls */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Test Controls</h4>
					<div className="flex gap-4">
						<Button 
							onClick={handleRunTests} 
							disabled={testing}
							variant="outline"
						>
							{testing ? 'Testing...' : 'Basic Scroll Test'}
						</Button>
						<Button 
							onClick={handleRunComprehensiveTests} 
							disabled={testing}
						>
							{testing ? 'Testing...' : 'Comprehensive Test'}
						</Button>
					</div>
				</div>

				{/* Results */}
				{(testResults || comprehensiveResults) && (
					<div className="space-y-6">
						{testResults && (
							<div className="p-4 rounded-lg border bg-muted/30 text-sm space-y-3">
								<h4 className="font-medium">Basic Test Results</h4>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span>Activity Bar Fixed:</span>
										<span className={testResults.activityBarFixed ? 'text-green-600' : 'text-red-600'}>
											{testResults.activityBarFixed ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Content Scrollable:</span>
										<span className={testResults.contentScrollable ? 'text-green-600' : 'text-red-600'}>
											{testResults.contentScrollable ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Layout Stable:</span>
										<span className={testResults.layoutStable ? 'text-green-600' : 'text-red-600'}>
											{testResults.layoutStable ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									{testResults.error && (
										<div className="text-red-600 text-xs pt-2 border-t mt-2">
											Error: {testResults.error}
										</div>
									)}
								</div>
							</div>
						)}

						{comprehensiveResults && (
							<div className="p-4 rounded-lg border bg-muted/30 text-sm space-y-3">
								<h4 className="font-medium">Comprehensive Test Results</h4>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span>Prop 25 - Activity Bar Fixed:</span>
										<span className={comprehensiveResults.activityBarFixed ? 'text-green-600' : 'text-red-600'}>
											{comprehensiveResults.activityBarFixed ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Prop 26 - Scroll Area Limited:</span>
										<span className={comprehensiveResults.scrollAreaLimited ? 'text-green-600' : 'text-red-600'}>
											{comprehensiveResults.scrollAreaLimited ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Prop 27 - Layout Stable:</span>
										<span className={comprehensiveResults.layoutStable ? 'text-green-600' : 'text-red-600'}>
											{comprehensiveResults.layoutStable ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Prop 28 - Settings Accessible:</span>
										<span className={comprehensiveResults.settingsAccessible ? 'text-green-600' : 'text-red-600'}>
											{comprehensiveResults.settingsAccessible ? '✓ Pass' : '✗ Fail'}
										</span>
									</div>
									<div className="flex justify-between font-medium mt-2 pt-2 border-t">
										<span>Overall:</span>
										<span className={comprehensiveResults.allPassed ? 'text-green-600' : 'text-red-600'}>
											{comprehensiveResults.allPassed ? '🎉 All Passed' : '⚠️ Partial Fail'}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Dummy Content */}
				<div className="space-y-4 pt-4 border-t">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Scroll Content</h4>
					<div className="space-y-4">
						{Array.from({ length: 20 }, (_, i) => (
							<div key={i} className="p-4 rounded-lg border border-dashed">
								<h5 className="font-medium mb-2">Test Block {i + 1}</h5>
								<p className="text-sm text-muted-foreground mb-3">
									This is block number {i + 1}. Used to verify that only this content area scrolls
									while the sidebar remains fixed.
								</p>
								<div className="space-y-2 opacity-50">
									<div className="h-2 bg-muted rounded w-full" />
									<div className="h-2 bg-muted rounded w-3/4" />
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="text-center py-8">
					<p className="text-sm text-muted-foreground">
						End of scroll test content
					</p>
				</div>
			</div>
		</div>
		</DevOnlyPage>
	);
}