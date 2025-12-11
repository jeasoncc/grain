/**
 * Utility functions to test scrolling behavior in settings pages
 */

export interface ScrollTestResult {
	activityBarFixed: boolean;
	contentScrollable: boolean;
	layoutStable: boolean;
	error?: string;
}

/**
 * Tests if the activity bar remains fixed during scrolling
 */
export function testActivityBarPosition(): boolean {
	try {
		const activityBar = document.querySelector('.activity-bar');
		if (!activityBar) {
			console.warn('Activity bar not found');
			return false;
		}

		const computedStyle = window.getComputedStyle(activityBar);
		const position = computedStyle.position;
		const zIndex = computedStyle.zIndex;

		// Activity bar should be fixed positioned with high z-index
		return position === 'fixed' && parseInt(zIndex) >= 50;
	} catch (error) {
		console.error('Error testing activity bar position:', error);
		return false;
	}
}

/**
 * Tests if only the content area is scrollable
 */
export function testContentScrollability(): boolean {
	try {
		// Find the main content container
		const contentContainer = document.querySelector('[data-testid="settings-content"]') || 
			document.querySelector('main') ||
			document.querySelector('.overflow-auto');

		if (!contentContainer) {
			console.warn('Content container not found');
			return false;
		}

		const computedStyle = window.getComputedStyle(contentContainer);
		const overflow = computedStyle.overflow || computedStyle.overflowY;

		// Content should be scrollable
		return overflow === 'auto' || overflow === 'scroll';
	} catch (error) {
		console.error('Error testing content scrollability:', error);
		return false;
	}
}

/**
 * Tests layout stability during scroll operations
 */
export function testLayoutStability(): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const activityBar = document.querySelector('.activity-bar');
			if (!activityBar) {
				resolve(false);
				return;
			}

			const initialRect = activityBar.getBoundingClientRect();
			
			// Simulate scroll
			window.scrollTo(0, 100);
			
			setTimeout(() => {
				const afterScrollRect = activityBar.getBoundingClientRect();
				
				// Activity bar position should not change
				const stable = initialRect.left === afterScrollRect.left && 
					initialRect.top === afterScrollRect.top;
				
				// Reset scroll
				window.scrollTo(0, 0);
				resolve(stable);
			}, 100);
		} catch (error) {
			console.error('Error testing layout stability:', error);
			resolve(false);
		}
	});
}

/**
 * Runs all scroll tests and returns comprehensive results
 */
export async function runScrollTests(): Promise<ScrollTestResult> {
	try {
		const activityBarFixed = testActivityBarPosition();
		const contentScrollable = testContentScrollability();
		const layoutStable = await testLayoutStability();

		return {
			activityBarFixed,
			contentScrollable,
			layoutStable,
		};
	} catch (error) {
		return {
			activityBarFixed: false,
			contentScrollable: false,
			layoutStable: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Logs test results to console
 */
export function logScrollTestResults(results: ScrollTestResult): void {
	console.group('🔍 Scroll Behavior Test Results');
	console.log('✅ Activity Bar Fixed:', results.activityBarFixed ? '✓' : '✗');
	console.log('✅ Content Scrollable:', results.contentScrollable ? '✓' : '✗');
	console.log('✅ Layout Stable:', results.layoutStable ? '✓' : '✗');
	
	if (results.error) {
		console.error('❌ Error:', results.error);
	}
	
	const allPassed = results.activityBarFixed && results.contentScrollable && results.layoutStable && !results.error;
	console.log(`\n🎯 Overall Result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
	console.groupEnd();
}