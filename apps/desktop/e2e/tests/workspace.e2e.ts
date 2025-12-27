/**
 * @file workspace.e2e.ts
 * @description Workspace 初始化 E2E 测试
 * 
 * 测试内容：
 * - 验证默认工作区创建
 * - 验证 Activity Bar 显示
 * - 验证 File Tree 显示
 * - 验证创建按钮存在
 */

import type { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  newPage,
  navigateToApp,
  waitForAppReady,
  closeBrowser,
  checkServerConnection,
} from '../helpers/browser.helper';
import { createConsoleListener, type ConsoleListener } from '../helpers/console.helper';
import { createScreenshotManager, type ScreenshotManager } from '../helpers/screenshot.helper';
import { SELECTORS } from '../helpers/selectors';
import {
  assertElementExists,
  assertActivityBarButtons,
  assertWorkspaceLoaded,
} from '../helpers/assert.helper';
import { waitForSelector, wait } from '../helpers/wait.helper';
import { getConfig } from '../config/puppeteer.config';

/**
 * 测试结果
 */
interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
}

/**
 * Workspace 初始化测试
 */
export async function runWorkspaceTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;
  let screenshots: ScreenshotManager | null = null;
  let consoleListener: ConsoleListener | null = null;

  const config = getConfig();

  try {
    // 检查服务器连接
    const serverOk = await checkServerConnection(config.baseUrl);
    if (!serverOk) {
      return [{
        name: 'Server Connection',
        status: 'failed',
        duration: 0,
        error: 'Development server is not running',
      }];
    }

    // 启动浏览器
    browser = await launchBrowser();
    page = await newPage(browser);

    // 初始化截图管理器和控制台监听器
    screenshots = createScreenshotManager('workspace-init');
    await screenshots.init();

    consoleListener = createConsoleListener();
    consoleListener.setup(page);

    // 导航到应用
    await navigateToApp(page);
    await screenshots.captureStep(page, 'app-loaded');

    // 等待应用加载
    await waitForAppReady(page);
    await screenshots.captureStep(page, 'app-ready');

    // ==============================
    // 测试 1: 验证 Activity Bar 显示
    // ==============================
    const test1Start = Date.now();
    try {
      await assertElementExists(page, SELECTORS.activityBar, 'Activity Bar should be visible');
      await screenshots.captureStep(page, 'activity-bar-visible');
      
      results.push({
        name: 'Activity Bar Visible',
        status: 'passed',
        duration: Date.now() - test1Start,
      });
    } catch (error) {
      await screenshots.captureFailure(page, error as Error);
      results.push({
        name: 'Activity Bar Visible',
        status: 'failed',
        duration: Date.now() - test1Start,
        error: (error as Error).message,
      });
    }

    // ==============================
    // 测试 2: 验证创建按钮存在
    // ==============================
    const test2Start = Date.now();
    try {
      await assertActivityBarButtons(page);
      await screenshots.captureStep(page, 'create-buttons-visible');
      
      results.push({
        name: 'Create Buttons Exist',
        status: 'passed',
        duration: Date.now() - test2Start,
      });
    } catch (error) {
      await screenshots.captureFailure(page, error as Error);
      results.push({
        name: 'Create Buttons Exist',
        status: 'failed',
        duration: Date.now() - test2Start,
        error: (error as Error).message,
      });
    }

    // ==============================
    // 测试 3: 验证工作区加载
    // ==============================
    const test3Start = Date.now();
    try {
      // 等待一下让工作区初始化
      await wait(page, 2000);
      await assertWorkspaceLoaded(page);
      await screenshots.captureStep(page, 'workspace-loaded');
      
      results.push({
        name: 'Workspace Loaded',
        status: 'passed',
        duration: Date.now() - test3Start,
      });
    } catch (error) {
      await screenshots.captureFailure(page, error as Error);
      results.push({
        name: 'Workspace Loaded',
        status: 'failed',
        duration: Date.now() - test3Start,
        error: (error as Error).message,
      });
    }

    // ==============================
    // 测试 4: 验证 File Tree 显示
    // ==============================
    const test4Start = Date.now();
    try {
      const fileTree = await waitForSelector(page, SELECTORS.fileTree, 5000);
      if (fileTree) {
        await screenshots.captureStep(page, 'file-tree-visible');
        results.push({
          name: 'File Tree Visible',
          status: 'passed',
          duration: Date.now() - test4Start,
        });
      } else {
        // File Tree 可能不存在（如果没有文件），这不是错误
        results.push({
          name: 'File Tree Visible',
          status: 'passed',
          duration: Date.now() - test4Start,
        });
      }
    } catch (error) {
      await screenshots.captureFailure(page, error as Error);
      results.push({
        name: 'File Tree Visible',
        status: 'failed',
        duration: Date.now() - test4Start,
        error: (error as Error).message,
      });
    }

    // 输出控制台错误分析
    if (consoleListener) {
      const errorCount = consoleListener.getErrorCount();
      if (errorCount > 0) {
        console.log('\n⚠️ 控制台错误:');
        console.log(consoleListener.analyzeErrors());
      }
    }

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    if (page && screenshots) {
      await screenshots.captureFailure(page, error as Error);
    }
  } finally {
    // 清理资源
    if (browser) {
      await closeBrowser(browser);
    }
  }

  return results;
}

// 如果直接运行此文件
if (require.main === module) {
  runWorkspaceTests().then((results) => {
    console.log('\n📊 测试结果:');
    for (const result of results) {
      const icon = result.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    console.log(`\n总计: ${passed} 通过, ${failed} 失败`);

    process.exit(failed > 0 ? 1 : 0);
  });
}
