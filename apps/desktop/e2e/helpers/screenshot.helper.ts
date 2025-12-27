/**
 * @file screenshot.helper.ts
 * @description 截图辅助函数
 * 
 * 每个测试步骤都会截图，截图保存在 e2e/reports/screenshots/{timestamp}/{test-name}/ 目录下。
 * 使用时间戳作为中间目录，避免覆盖历史截图。
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Page } from 'puppeteer';
import { getConfig } from '../config/puppeteer.config';

/**
 * 步骤截图信息
 */
export interface StepScreenshot {
  readonly testName: string;
  readonly stepNumber: number;
  readonly stepDescription: string;
  readonly screenshotPath: string;
  readonly timestamp: string;
}

/**
 * 全局时间戳，确保同一次测试运行使用相同的时间戳目录
 */
let globalTimestamp: string | null = null;

/**
 * 获取当前运行的时间戳目录名
 * 格式: YYYY-MM-DDTHH-mm-ss
 */
export function getRunTimestamp(): string {
  if (!globalTimestamp) {
    globalTimestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\.\d{3}Z$/, '');
  }
  return globalTimestamp;
}

/**
 * 重置时间戳（用于新的测试运行）
 */
export function resetRunTimestamp(): void {
  globalTimestamp = null;
}

/**
 * 截图管理器
 */
export class ScreenshotManager {
  private testName: string;
  private stepCounter: number;
  private screenshots: StepScreenshot[];
  private baseDir: string;
  private runTimestamp: string;

  constructor(testName: string) {
    this.testName = testName;
    this.stepCounter = 0;
    this.screenshots = [];
    this.runTimestamp = getRunTimestamp();
    
    const config = getConfig();
    // 使用时间戳作为中间目录: screenshots/{timestamp}/{test-name}/
    this.baseDir = path.join(
      process.cwd(), 
      config.screenshotDir, 
      this.runTimestamp,
      testName
    );
  }

  /**
   * 初始化截图目录
   */
  async init(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    
    // 创建/更新 latest 符号链接
    const config = getConfig();
    const screenshotRoot = path.join(process.cwd(), config.screenshotDir);
    const latestLink = path.join(screenshotRoot, 'latest');
    const timestampDir = path.join(screenshotRoot, this.runTimestamp);
    
    try {
      // 删除旧的符号链接
      await fs.unlink(latestLink).catch(() => {});
      // 创建新的符号链接
      await fs.symlink(timestampDir, latestLink, 'dir');
    } catch {
      // 符号链接创建失败不影响测试
    }
  }

  /**
   * 截取步骤截图
   */
  async captureStep(
    page: Page,
    stepDescription: string
  ): Promise<StepScreenshot> {
    this.stepCounter++;
    
    const filename = `${String(this.stepCounter).padStart(2, '0')}-${this.sanitizeFilename(stepDescription)}.png`;
    const screenshotPath = path.join(this.baseDir, filename);
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false,
    });
    
    const screenshot: StepScreenshot = {
      testName: this.testName,
      stepNumber: this.stepCounter,
      stepDescription,
      screenshotPath,
      timestamp: new Date().toISOString(),
    };
    
    this.screenshots.push(screenshot);
    console.log(`📸 截图: ${filename}`);
    
    return screenshot;
  }

  /**
   * 截取失败截图
   */
  async captureFailure(page: Page, error: Error): Promise<StepScreenshot> {
    const filename = '99-failure.png';
    const screenshotPath = path.join(this.baseDir, filename);
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
    });
    
    const screenshot: StepScreenshot = {
      testName: this.testName,
      stepNumber: 99,
      stepDescription: `failure: ${error.message}`,
      screenshotPath,
      timestamp: new Date().toISOString(),
    };
    
    this.screenshots.push(screenshot);
    console.log(`📸 失败截图: ${filename}`);
    
    return screenshot;
  }

  /**
   * 获取所有截图
   */
  getScreenshots(): StepScreenshot[] {
    return [...this.screenshots];
  }

  /**
   * 获取截图目录路径
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * 获取运行时间戳
   */
  getRunTimestamp(): string {
    return this.runTimestamp;
  }

  /**
   * 清理文件名中的特殊字符
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

/**
 * 创建截图管理器
 */
export function createScreenshotManager(testName: string): ScreenshotManager {
  return new ScreenshotManager(testName);
}
