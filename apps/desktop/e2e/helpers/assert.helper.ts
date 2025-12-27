/**
 * @file assert.helper.ts
 * @description 断言辅助函数
 */

import type { Page, ElementHandle } from 'puppeteer';
import { SELECTORS } from './selectors';
import { waitForSelector, waitForToast, waitForFileTreeItem, waitForEditorTab } from './wait.helper';

/**
 * 断言错误
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * 断言元素存在
 */
export async function assertElementExists(
  page: Page,
  selector: string,
  message?: string
): Promise<ElementHandle> {
  const element = await waitForSelector(page, selector);
  if (!element) {
    throw new AssertionError(message || `Element not found: ${selector}`);
  }
  return element;
}

/**
 * 断言元素不存在
 */
export async function assertElementNotExists(
  page: Page,
  selector: string,
  message?: string
): Promise<void> {
  const element = await page.$(selector);
  if (element) {
    throw new AssertionError(message || `Element should not exist: ${selector}`);
  }
}

/**
 * 断言元素可见
 */
export async function assertElementVisible(
  page: Page,
  selector: string,
  message?: string
): Promise<ElementHandle> {
  const element = await assertElementExists(page, selector, message);
  const isVisible = await element.isVisible();
  if (!isVisible) {
    throw new AssertionError(message || `Element not visible: ${selector}`);
  }
  return element;
}

/**
 * 断言 Toast 消息
 */
export async function assertToastMessage(
  page: Page,
  type: 'success' | 'error' | 'info',
  expectedText?: string | RegExp
): Promise<string> {
  const toastText = await waitForToast(page, type);
  if (!toastText) {
    throw new AssertionError(`Toast message not found (type: ${type})`);
  }
  
  if (expectedText) {
    if (typeof expectedText === 'string') {
      if (!toastText.includes(expectedText)) {
        throw new AssertionError(
          `Toast message mismatch. Expected to contain: "${expectedText}", got: "${toastText}"`
        );
      }
    } else if (!expectedText.test(toastText)) {
      throw new AssertionError(
        `Toast message mismatch. Expected to match: ${expectedText}, got: "${toastText}"`
      );
    }
  }
  
  return toastText;
}

/**
 * 断言文件出现在 File Tree
 */
export async function assertFileInTree(
  page: Page,
  titlePattern: string | RegExp,
  message?: string
): Promise<ElementHandle> {
  const item = await waitForFileTreeItem(page, titlePattern);
  if (!item) {
    throw new AssertionError(
      message || `File not found in tree: ${titlePattern}`
    );
  }
  return item;
}

/**
 * 断言 Editor Tab 打开
 */
export async function assertTabOpened(
  page: Page,
  titlePattern: string | RegExp,
  message?: string
): Promise<ElementHandle> {
  const tab = await waitForEditorTab(page, titlePattern);
  if (!tab) {
    throw new AssertionError(
      message || `Tab not opened: ${titlePattern}`
    );
  }
  return tab;
}

/**
 * 断言文件夹结构存在
 */
export async function assertFolderStructure(
  page: Page,
  folderPath: string[],
  message?: string
): Promise<void> {
  for (const folder of folderPath) {
    const item = await waitForFileTreeItem(page, folder, 5000);
    if (!item) {
      throw new AssertionError(
        message || `Folder not found: ${folder} (path: ${folderPath.join(' > ')})`
      );
    }
  }
}

/**
 * 断言 Activity Bar 按钮存在
 */
export async function assertActivityBarButtons(page: Page): Promise<void> {
  await assertElementExists(page, SELECTORS.activityBar, 'Activity Bar not found');
  await assertElementExists(page, SELECTORS.btnNewDiary, 'New Diary button not found');
  await assertElementExists(page, SELECTORS.btnNewWiki, 'New Wiki button not found');
  await assertElementExists(page, SELECTORS.btnNewLedger, 'New Ledger button not found');
}

/**
 * 断言工作区已加载
 */
export async function assertWorkspaceLoaded(page: Page): Promise<void> {
  // 检查 File Tree 或工作区选择器是否存在
  const fileTree = await page.$(SELECTORS.fileTree);
  const workspaceSelector = await page.$(SELECTORS.workspaceSelector);
  
  if (!fileTree && !workspaceSelector) {
    throw new AssertionError('Workspace not loaded: neither File Tree nor Workspace Selector found');
  }
}

/**
 * 断言相等
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

/**
 * 断言为真
 */
export function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new AssertionError(message || 'Expected condition to be true');
  }
}

/**
 * 断言为假
 */
export function assertFalse(condition: boolean, message?: string): void {
  if (condition) {
    throw new AssertionError(message || 'Expected condition to be false');
  }
}
