/**
 * @file browser.helper.ts
 * @description 浏览器控制辅助函数
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { getConfig } from '../config/puppeteer.config';
import { SELECTORS } from './selectors';

/**
 * 检查开发服务器是否运行
 */
export async function checkServerConnection(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, { method: 'HEAD' });
    return response.ok || response.status === 304;
  } catch {
    console.error(`
❌ 无法连接到开发服务器 ${baseUrl}

请先启动开发服务器:
  cd apps/desktop
  bun run dev

然后重新运行 E2E 测试。
    `);
    return false;
  }
}

/**
 * 启动浏览器
 */
export async function launchBrowser(debug = false): Promise<Browser> {
  const config = getConfig(debug);
  
  const browser = await puppeteer.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    defaultViewport: config.defaultViewport,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  
  console.log('✅ 浏览器启动成功');
  return browser;
}

/**
 * 创建新页面
 */
export async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  const config = getConfig();
  
  // 设置默认超时
  page.setDefaultTimeout(config.timeout);
  page.setDefaultNavigationTimeout(config.timeout);
  
  console.log('✅ 新页面创建成功');
  return page;
}

/**
 * 导航到应用
 */
export async function navigateToApp(page: Page, baseUrl?: string): Promise<void> {
  const config = getConfig();
  const url = baseUrl || config.baseUrl;
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  console.log(`✅ 导航到 ${url}`);
}

/**
 * 等待应用加载完成
 * 
 * 检查以下条件：
 * 1. Activity Bar 可见
 * 2. 工作区已加载（File Tree 可见或工作区选择器可见）
 */
export async function waitForAppReady(page: Page, timeout = 30000): Promise<void> {
  console.log('⏳ 等待应用加载...');
  
  // 等待 Activity Bar 出现
  await page.waitForSelector(SELECTORS.activityBar, { timeout });
  
  // 等待 File Tree 或工作区选择器出现
  await Promise.race([
    page.waitForSelector(SELECTORS.fileTree, { timeout }),
    page.waitForSelector(SELECTORS.workspaceSelector, { timeout }),
  ]).catch(() => {
    // 如果都没出现，可能是首次加载，等待一下
    return new Promise(resolve => setTimeout(resolve, 2000));
  });
  
  console.log('✅ 应用加载完成');
}

/**
 * 关闭浏览器
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close();
  console.log('✅ 浏览器已关闭');
}

/**
 * 获取页面标题
 */
export async function getPageTitle(page: Page): Promise<string> {
  return page.title();
}

/**
 * 获取页面 URL
 */
export function getPageUrl(page: Page): string {
  return page.url();
}
