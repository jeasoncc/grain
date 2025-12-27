/**
 * @file puppeteer.config.ts
 * @description Puppeteer E2E 测试配置
 */

export interface PuppeteerConfig {
  /** 是否使用无头模式 */
  readonly headless: boolean;
  /** 操作延迟（毫秒），用于调试 */
  readonly slowMo: number;
  /** 默认视口大小 */
  readonly defaultViewport: {
    readonly width: number;
    readonly height: number;
  };
  /** 默认超时时间（毫秒） */
  readonly timeout: number;
  /** 开发服务器地址 */
  readonly baseUrl: string;
  /** 截图保存目录 */
  readonly screenshotDir: string;
  /** 报告保存目录 */
  readonly reportDir: string;
}

/**
 * 默认配置
 */
export const defaultConfig: PuppeteerConfig = {
  headless: true,
  slowMo: 50,
  defaultViewport: { width: 1280, height: 800 },
  timeout: 30000,
  baseUrl: 'http://localhost:5173',
  screenshotDir: 'e2e/reports/screenshots',
  reportDir: 'e2e/reports',
};

/**
 * 调试配置（非无头模式）
 */
export const debugConfig: PuppeteerConfig = {
  ...defaultConfig,
  headless: false,
  slowMo: 100,
};

/**
 * 获取配置
 */
export function getConfig(debug = false): PuppeteerConfig {
  return debug ? debugConfig : defaultConfig;
}
