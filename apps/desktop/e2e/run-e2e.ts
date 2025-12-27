/**
 * @file run-e2e.ts
 * @description E2E 测试入口文件
 * 
 * 功能：
 * - 服务器连接检查
 * - 测试用例执行
 * - 测试报告生成
 * - 时间戳目录管理
 * 
 * Requirements: 1.6, 8.1, 8.5
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { checkServerConnection } from './helpers/browser.helper';
import { getConfig } from './config/puppeteer.config';
import { resetRunTimestamp, getRunTimestamp } from './helpers/screenshot.helper';

// 导入测试模块
import { runWorkspaceTests } from './tests/workspace.e2e';
import { runDiaryTests } from './tests/diary.e2e';
import { runAllWikiTests } from './tests/wiki.e2e';
import { runAllLedgerTests } from './tests/ledger.e2e';
import { runAllExcalidrawTests } from './tests/excalidraw.e2e';

/**
 * 测试结果
 */
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

/**
 * 测试套件结果
 */
interface TestSuiteResult {
  suiteName: string;
  results: TestResult[];
  duration: number;
}

/**
 * 测试报告
 */
interface TestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  suites: TestSuiteResult[];
}

/**
 * 测试套件配置
 */
interface TestSuite {
  name: string;
  run: () => Promise<TestResult[]>;
}

/**
 * 所有测试套件
 */
const ALL_SUITES: TestSuite[] = [
  { name: 'Workspace', run: runWorkspaceTests },
  { name: 'Diary', run: runDiaryTests },
  { name: 'Wiki', run: runAllWikiTests },
  { name: 'Ledger', run: runAllLedgerTests },
  { name: 'Excalidraw', run: runAllExcalidrawTests },
];

/**
 * 解析命令行参数
 */
function parseArgs(): { suites: string[]; debug: boolean } {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug') || args.includes('-d');
  
  // 过滤掉 debug 标志
  const suiteArgs = args.filter(arg => !arg.startsWith('-'));
  
  return {
    suites: suiteArgs.length > 0 ? suiteArgs : [],
    debug,
  };
}

/**
 * 获取要运行的测试套件
 */
function getTestSuites(suiteNames: string[]): TestSuite[] {
  if (suiteNames.length === 0) {
    return ALL_SUITES;
  }
  
  return ALL_SUITES.filter(suite => 
    suiteNames.some(name => 
      suite.name.toLowerCase().includes(name.toLowerCase())
    )
  );
}

/**
 * 运行单个测试套件
 */
async function runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 运行测试套件: ${suite.name}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const results = await suite.run();
    const duration = Date.now() - startTime;
    
    return {
      suiteName: suite.name,
      results,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ 测试套件 ${suite.name} 执行失败:`, error);
    
    return {
      suiteName: suite.name,
      results: [{
        name: 'Suite Execution',
        status: 'failed',
        duration,
        error: (error as Error).message,
      }],
      duration,
    };
  }
}

/**
 * 生成测试报告
 */
function generateReport(suiteResults: TestSuiteResult[]): TestReport {
  const allResults = suiteResults.flatMap(s => s.results);
  const totalDuration = suiteResults.reduce((sum, s) => sum + s.duration, 0);
  
  return {
    timestamp: new Date().toISOString(),
    totalTests: allResults.length,
    passed: allResults.filter(r => r.status === 'passed').length,
    failed: allResults.filter(r => r.status === 'failed').length,
    skipped: allResults.filter(r => r.status === 'skipped').length,
    duration: totalDuration,
    suites: suiteResults,
  };
}

/**
 * 保存测试报告到文件
 */
async function saveReport(report: TestReport): Promise<void> {
  const config = getConfig();
  const reportDir = path.join(process.cwd(), config.reportDir);
  
  // 确保目录存在
  await fs.mkdir(reportDir, { recursive: true });
  
  // 保存 JSON 报告
  const jsonPath = path.join(reportDir, 'test-report.json');
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📄 JSON 报告已保存: ${jsonPath}`);
  
  // 生成 Markdown 报告
  const mdReport = generateMarkdownReport(report);
  const mdPath = path.join(reportDir, 'test-report.md');
  await fs.writeFile(mdPath, mdReport, 'utf-8');
  console.log(`📄 Markdown 报告已保存: ${mdPath}`);
}

/**
 * 生成 Markdown 格式的测试报告
 */
function generateMarkdownReport(report: TestReport): string {
  const lines: string[] = [];
  
  lines.push('# E2E 测试报告');
  lines.push('');
  lines.push(`**生成时间**: ${report.timestamp}`);
  lines.push(`**总耗时**: ${(report.duration / 1000).toFixed(2)}s`);
  lines.push('');
  lines.push('## 测试概览');
  lines.push('');
  lines.push(`| 指标 | 数量 |`);
  lines.push(`|------|------|`);
  lines.push(`| 总测试数 | ${report.totalTests} |`);
  lines.push(`| ✅ 通过 | ${report.passed} |`);
  lines.push(`| ❌ 失败 | ${report.failed} |`);
  lines.push(`| ⏭️ 跳过 | ${report.skipped} |`);
  lines.push('');
  
  // 计算通过率
  const passRate = report.totalTests > 0 
    ? ((report.passed / report.totalTests) * 100).toFixed(1) 
    : '0';
  lines.push(`**通过率**: ${passRate}%`);
  lines.push('');
  
  // 各测试套件详情
  lines.push('## 测试套件详情');
  lines.push('');
  
  for (const suite of report.suites) {
    const suitePassed = suite.results.filter(r => r.status === 'passed').length;
    const suiteFailed = suite.results.filter(r => r.status === 'failed').length;
    const suiteSkipped = suite.results.filter(r => r.status === 'skipped').length;
    
    lines.push(`### ${suite.suiteName}`);
    lines.push('');
    lines.push(`**耗时**: ${(suite.duration / 1000).toFixed(2)}s | ✅ ${suitePassed} | ❌ ${suiteFailed} | ⏭️ ${suiteSkipped}`);
    lines.push('');
    lines.push('| 测试用例 | 状态 | 耗时 | 备注 |');
    lines.push('|----------|------|------|------|');
    
    for (const result of suite.results) {
      const icon = result.status === 'passed' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
      const note = result.error ? result.error.substring(0, 50) + (result.error.length > 50 ? '...' : '') : '-';
      lines.push(`| ${result.name} | ${icon} ${result.status} | ${result.duration}ms | ${note} |`);
    }
    
    lines.push('');
  }
  
  // 失败测试详情
  const failedTests = report.suites.flatMap(s => 
    s.results.filter(r => r.status === 'failed').map(r => ({
      suite: s.suiteName,
      ...r,
    }))
  );
  
  if (failedTests.length > 0) {
    lines.push('## 失败测试详情');
    lines.push('');
    
    for (const test of failedTests) {
      lines.push(`### ${test.suite} > ${test.name}`);
      lines.push('');
      lines.push('**错误信息**:');
      lines.push('```');
      lines.push(test.error || 'Unknown error');
      lines.push('```');
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * 打印测试结果摘要
 */
function printSummary(report: TestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(60));
  
  for (const suite of report.suites) {
    console.log(`\n📦 ${suite.suiteName} (${(suite.duration / 1000).toFixed(2)}s)`);
    
    for (const result of suite.results) {
      const icon = result.status === 'passed' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
      console.log(`   ${icon} ${result.name} (${result.duration}ms)`);
      if (result.error && result.status === 'failed') {
        console.log(`      Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`总计: ${report.passed} 通过, ${report.failed} 失败, ${report.skipped} 跳过`);
  console.log(`总耗时: ${(report.duration / 1000).toFixed(2)}s`);
  console.log('-'.repeat(60));
  
  if (report.failed > 0) {
    console.log('\n❌ 测试失败！请检查上述错误信息。');
  } else {
    console.log('\n✅ 所有测试通过！');
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 Grain E2E 测试运行器');
  console.log('='.repeat(60));
  
  // 重置时间戳，确保每次运行使用新的时间戳目录
  resetRunTimestamp();
  const runTimestamp = getRunTimestamp();
  console.log(`📁 截图目录: screenshots/${runTimestamp}/`);
  
  const { suites: suiteNames, debug } = parseArgs();
  
  if (debug) {
    console.log('🔍 调试模式已启用（非无头模式）');
    process.env.E2E_DEBUG = 'true';
  }
  
  const config = getConfig(debug);
  
  // 检查服务器连接
  console.log(`\n⏳ 检查开发服务器连接 (${config.baseUrl})...`);
  const serverOk = await checkServerConnection(config.baseUrl);
  
  if (!serverOk) {
    console.error('\n❌ 无法连接到开发服务器');
    console.error('\n请先启动开发服务器:');
    console.error('  cd apps/desktop');
    console.error('  bun run dev');
    console.error('\n然后重新运行 E2E 测试。');
    process.exit(1);
  }
  
  console.log('✅ 开发服务器连接成功');
  
  // 获取要运行的测试套件
  const testSuites = getTestSuites(suiteNames);
  
  if (testSuites.length === 0) {
    console.error(`\n❌ 未找到匹配的测试套件: ${suiteNames.join(', ')}`);
    console.error('\n可用的测试套件:');
    for (const suite of ALL_SUITES) {
      console.error(`  - ${suite.name}`);
    }
    process.exit(1);
  }
  
  console.log(`\n📋 将运行 ${testSuites.length} 个测试套件:`);
  for (const suite of testSuites) {
    console.log(`   - ${suite.name}`);
  }
  
  // 运行测试
  const suiteResults: TestSuiteResult[] = [];
  
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    suiteResults.push(result);
  }
  
  // 生成报告
  const report = generateReport(suiteResults);
  
  // 保存报告
  await saveReport(report);
  
  // 打印摘要
  printSummary(report);
  
  // 退出码
  process.exit(report.failed > 0 ? 1 : 0);
}

// 运行主函数
main().catch((error) => {
  console.error('❌ E2E 测试运行器错误:', error);
  process.exit(1);
});
