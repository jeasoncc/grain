/**
 * @file wait.helper.ts
 * @description 等待策略辅助函数
 */

import type { Page, ElementHandle } from 'puppeteer';
import { SELECTORS } from './selectors';

/**
 * 等待指定时间（使用 Promise 实现）
 */
export async function wait(_page: Page, ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待选择器出现
 */
export async function waitForSelector(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<ElementHandle | null> {
  try {
    return await page.waitForSelector(selector, { timeout });
  } catch {
    return null;
  }
}

/**
 * 等待选择器消失
 */
export async function waitForSelectorHidden(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { hidden: true, timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * 等待 Toast 消息出现
 */
export async function waitForToast(
  page: Page,
  type: 'success' | 'error' | 'info' = 'success',
  timeout = 5000
): Promise<string | null> {
  const selector = type === 'success' 
    ? SELECTORS.toastSuccess 
    : type === 'error' 
      ? SELECTORS.toastError 
      : SELECTORS.toastInfo;

  try {
    const toast = await page.waitForSelector(selector, { timeout });
    if (toast) {
      const text = await toast.evaluate(el => el.textContent);
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 等待 Toast 消息消失
 */
export async function waitForToastDismiss(
  page: Page,
  timeout = 10000
): Promise<boolean> {
  return waitForSelectorHidden(page, SELECTORS.toast, timeout);
}

/**
 * 等待文件出现在 File Tree
 */
export async function waitForFileTreeItem(
  page: Page,
  titlePattern: string | RegExp,
  timeout = 10000
): Promise<ElementHandle | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const items = await page.$$(SELECTORS.fileTreeItem);
    
    for (const item of items) {
      const title = await item.evaluate(el => el.getAttribute('data-title') || el.textContent);
      if (title) {
        if (typeof titlePattern === 'string') {
          if (title.includes(titlePattern)) {
            return item;
          }
        } else if (titlePattern.test(title)) {
          return item;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return null;
}

/**
 * 等待 Editor Tab 出现
 */
export async function waitForEditorTab(
  page: Page,
  titlePattern: string | RegExp,
  timeout = 10000
): Promise<ElementHandle | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const tabs = await page.$$(SELECTORS.editorTab);
    
    for (const tab of tabs) {
      const title = await tab.evaluate(el => el.getAttribute('data-title') || el.textContent);
      if (title) {
        if (typeof titlePattern === 'string') {
          if (title.includes(titlePattern)) {
            return tab;
          }
        } else if (titlePattern.test(title)) {
          return tab;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return null;
}

/**
 * 等待对话框出现
 */
export async function waitForDialog(
  page: Page,
  timeout = 5000
): Promise<ElementHandle | null> {
  return waitForSelector(page, SELECTORS.dialog, timeout);
}

/**
 * 等待对话框消失
 */
export async function waitForDialogDismiss(
  page: Page,
  timeout = 5000
): Promise<boolean> {
  return waitForSelectorHidden(page, SELECTORS.dialog, timeout);
}

/**
 * 等待页面导航完成
 */
export async function waitForNavigation(
  page: Page,
  timeout = 30000
): Promise<void> {
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout });
}

/**
 * 等待网络空闲
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout = 5000
): Promise<void> {
  await page.waitForNetworkIdle({ timeout });
}
