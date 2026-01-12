#!/usr/bin/env node

/**
 * 生成结构化的ESLint错误报告
 * 输出格式：JSON，包含文件、行号、规则、错误信息、修复建议
 */

import { ESLint } from 'eslint';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateReport() {
  console.log('🔍 正在分析代码...\n');

  // 创建ESLint实例
  const eslint = new ESLint({
    overrideConfigFile: path.join(__dirname, '../eslint.config.grain.js'),
  });

  // 运行ESLint
  const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);

  // 统计信息
  let totalErrors = 0;
  let totalWarnings = 0;
  const errorsByRule = {};
  const errorsByFile = {};

  // 处理结果
  const structuredErrors = [];

  for (const result of results) {
    if (result.errorCount === 0 && result.warningCount === 0) continue;

    const filePath = result.filePath.replace(process.cwd() + '/', '');
    
    errorsByFile[filePath] = {
      errors: result.errorCount,
      warnings: result.warningCount,
      messages: []
    };

    for (const message of result.messages) {
      const severity = message.severity === 2 ? 'error' : 'warning';
      
      if (severity === 'error') totalErrors++;
      else totalWarnings++;

      // 统计规则
      const rule = message.ruleId || 'unknown';
      errorsByRule[rule] = (errorsByRule[rule] || 0) + 1;

      // 构建错误对象
      const error = {
        file: filePath,
        line: message.line,
        column: message.column,
        severity,
        rule,
        message: message.message,
        fix: message.fix ? 'auto-fixable' : 'manual',
      };

      structuredErrors.push(error);
      errorsByFile[filePath].messages.push(error);
    }
  }

  // 生成报告
  const report = {
    summary: {
      totalFiles: Object.keys(errorsByFile).length,
      totalErrors,
      totalWarnings,
      totalProblems: totalErrors + totalWarnings,
      timestamp: new Date().toISOString(),
    },
    byRule: Object.entries(errorsByRule)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => ({ rule, count })),
    byFile: Object.entries(errorsByFile)
      .sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings))
      .map(([file, data]) => ({
        file,
        errors: data.errors,
        warnings: data.warnings,
        total: data.errors + data.warnings,
      })),
    allErrors: structuredErrors,
  };

  // 保存JSON报告
  const jsonPath = path.join(__dirname, '../eslint-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`✅ JSON报告已保存: ${jsonPath}\n`);

  // 生成Markdown报告
  const mdReport = generateMarkdownReport(report);
  const mdPath = path.join(__dirname, '../ESLINT_DETAILED_REPORT.md');
  fs.writeFileSync(mdPath, mdReport);
  console.log(`✅ Markdown报告已保存: ${mdPath}\n`);

  // 打印摘要
  console.log('📊 摘要:');
  console.log(`  总文件数: ${report.summary.totalFiles}`);
  console.log(`  总错误数: ${report.summary.totalErrors}`);
  console.log(`  总警告数: ${report.summary.totalWarnings}`);
  console.log(`  总问题数: ${report.summary.totalProblems}\n`);

  console.log('🔝 Top 10 规则:');
  report.byRule.slice(0, 10).forEach(({ rule, count }, i) => {
    console.log(`  ${i + 1}. ${rule}: ${count}`);
  });

  console.log('\n🔝 Top 10 文件:');
  report.byFile.slice(0, 10).forEach(({ file, total }, i) => {
    console.log(`  ${i + 1}. ${file}: ${total} 问题`);
  });
}

function generateMarkdownReport(report) {
  let md = '# ESLint 详细错误报告\n\n';
  md += `**生成时间**: ${new Date(report.summary.timestamp).toLocaleString('zh-CN')}\n\n`;
  
  md += '## 摘要\n\n';
  md += `- **总文件数**: ${report.summary.totalFiles}\n`;
  md += `- **总错误数**: ${report.summary.totalErrors}\n`;
  md += `- **总警告数**: ${report.summary.totalWarnings}\n`;
  md += `- **总问题数**: ${report.summary.totalProblems}\n\n`;

  md += '## 按规则分类\n\n';
  md += '| 排名 | 规则 | 数量 |\n';
  md += '|------|------|------|\n';
  report.byRule.slice(0, 20).forEach(({ rule, count }, i) => {
    md += `| ${i + 1} | \`${rule}\` | ${count} |\n`;
  });
  md += '\n';

  md += '## 按文件分类 (Top 50)\n\n';
  md += '| 排名 | 文件 | 错误 | 警告 | 总计 |\n';
  md += '|------|------|------|------|------|\n';
  report.byFile.slice(0, 50).forEach(({ file, errors, warnings, total }, i) => {
    md += `| ${i + 1} | \`${file}\` | ${errors} | ${warnings} | ${total} |\n`;
  });
  md += '\n';

  md += '## 详细错误列表\n\n';
  md += '### 按文件组织\n\n';
  
  // 按文件分组
  const fileGroups = {};
  for (const error of report.allErrors) {
    if (!fileGroups[error.file]) {
      fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
  }

  // 只显示前20个文件的详细信息
  const topFiles = report.byFile.slice(0, 20).map(f => f.file);
  
  for (const file of topFiles) {
    const errors = fileGroups[file] || [];
    if (errors.length === 0) continue;

    md += `#### ${file}\n\n`;
    md += `**问题数**: ${errors.length}\n\n`;
    md += '| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |\n';
    md += '|----|-----|--------|------|------|--------|\n';
    
    errors.slice(0, 50).forEach(error => {
      md += `| ${error.line} | ${error.column} | ${error.severity} | \`${error.rule}\` | ${error.message.replace(/\|/g, '\\|')} | ${error.fix} |\n`;
    });
    
    if (errors.length > 50) {
      md += `\n*... 还有 ${errors.length - 50} 个问题*\n`;
    }
    md += '\n';
  }

  return md;
}

// 运行
generateReport().catch(error => {
  console.error('❌ 生成报告失败:', error);
  process.exit(1);
});
