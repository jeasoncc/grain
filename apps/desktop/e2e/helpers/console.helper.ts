/**
 * @file console.helper.ts
 * @description 控制台错误捕获辅助函数
 * 
 * 捕获并分析开发服务器的控制台错误。
 */

import type { Page, ConsoleMessage, HTTPRequest } from 'puppeteer';

/**
 * 控制台错误信息
 */
export interface ConsoleError {
  readonly type: 'error' | 'warning' | 'log' | 'pageerror' | 'requestfailed';
  readonly message: string;
  readonly timestamp: string;
  readonly stackTrace?: string;
  readonly url?: string;
}

/**
 * 控制台监听器
 */
export class ConsoleListener {
  private errors: ConsoleError[];

  constructor() {
    this.errors = [];
  }

  /**
   * 设置控制台监听器
   */
  setup(page: Page): void {
    this.errors = [];

    // 监听控制台消息
    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      if (type === 'error' || type === 'warn') {
        this.errors.push({
          type: type === 'warn' ? 'warning' : 'error',
          message: msg.text(),
          timestamp: new Date().toISOString(),
          stackTrace: msg.stackTrace()?.map(s => 
            `${s.url}:${s.lineNumber}:${s.columnNumber}`
          ).join('\n'),
          url: msg.location()?.url,
        });
      }
    });

    // 监听页面错误
    page.on('pageerror', (error: unknown) => {
      const err = error as Error;
      this.errors.push({
        type: 'pageerror',
        message: err.message || String(error),
        timestamp: new Date().toISOString(),
        stackTrace: err.stack,
      });
    });

    // 监听请求失败
    page.on('requestfailed', (request: HTTPRequest) => {
      const failure = request.failure();
      this.errors.push({
        type: 'requestfailed',
        message: `Request failed: ${request.url()} - ${failure?.errorText || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        url: request.url(),
      });
    });

    console.log('✅ 控制台监听器已设置');
  }

  /**
   * 获取所有错误
   */
  getErrors(): ConsoleError[] {
    return [...this.errors];
  }

  /**
   * 获取错误数量
   */
  getErrorCount(): number {
    return this.errors.filter(e => e.type === 'error' || e.type === 'pageerror').length;
  }

  /**
   * 获取警告数量
   */
  getWarningCount(): number {
    return this.errors.filter(e => e.type === 'warning').length;
  }

  /**
   * 清空错误
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * 分析错误并生成报告
   */
  analyzeErrors(): string {
    if (this.errors.length === 0) {
      return '✅ 无控制台错误';
    }

    const errorCount = this.getErrorCount();
    const warningCount = this.getWarningCount();
    const requestFailedCount = this.errors.filter(e => e.type === 'requestfailed').length;

    let report = `## 控制台错误分析\n\n`;
    report += `- 错误数: ${errorCount}\n`;
    report += `- 警告数: ${warningCount}\n`;
    report += `- 请求失败数: ${requestFailedCount}\n\n`;

    for (const error of this.errors) {
      report += `### ${error.type.toUpperCase()} - ${error.timestamp}\n`;
      report += `\`\`\`\n${error.message}\n\`\`\`\n`;
      if (error.url) {
        report += `\n**URL:** ${error.url}\n`;
      }
      if (error.stackTrace) {
        report += `\n**Stack Trace:**\n\`\`\`\n${error.stackTrace}\n\`\`\`\n`;
      }
      report += '\n---\n\n';
    }

    return report;
  }
}

/**
 * 创建控制台监听器
 */
export function createConsoleListener(): ConsoleListener {
  return new ConsoleListener();
}
