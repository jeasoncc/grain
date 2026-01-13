#!/usr/bin/env node

/**
 * 将 ESLint 报告按规则类别分类输出
 * 
 * 使用方法：
 * npm run lint:grain -- --format json | node scripts/categorize-lint-report.js
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// 读取 stdin
let inputData = '';

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const results = JSON.parse(inputData);
    categorizeAndSave(results);
  } catch (error) {
    console.error('❌ 解析 JSON 失败:', error.message);
    process.exit(1);
  }
});

/**
 * 规则类别映射
 */
const RULE_CATEGORIES = {
  // Grain 插件规则
  'grain-architecture': ['grain/layer-dependencies', 'grain/file-location', 'grain/no-store-in-views', 'grain/no-side-effects-in-pipes', 'grain/no-react-in-pure-layers'],
  'grain-functional': ['grain/no-mutation', 'grain/no-object-mutation', 'grain/no-try-catch', 'grain/no-throw', 'grain/no-async-outside-io', 'grain/fp-ts-patterns', 'grain/no-promise-methods'],
  'grain-naming': ['grain/file-naming', 'grain/variable-naming', 'grain/function-naming', 'grain/boolean-naming', 'grain/constant-naming'],
  'grain-complexity': ['grain/max-function-lines', 'grain/max-params', 'grain/max-nesting', 'grain/cyclomatic-complexity', 'grain/max-file-lines'],
  'grain-react': ['grain/require-memo', 'grain/no-inline-functions', 'grain/require-callback', 'grain/hooks-patterns', 'grain/component-patterns'],
  'grain-imports': ['grain/no-default-export', 'grain/no-banned-imports', 'grain/require-alias', 'grain/import-grouping', 'grain/no-deprecated-imports'],
  'grain-security': ['grain/no-eval', 'grain/no-innerhtml', 'grain/no-sensitive-logging'],
  'grain-documentation': ['grain/require-jsdoc', 'grain/no-commented-code', 'grain/chinese-comments'],
  'grain-magic-values': ['grain/no-magic-numbers', 'grain/no-hardcoded-values'],
  'grain-conditional': ['grain/no-nested-ternary', 'grain/strict-equality', 'grain/require-switch-default'],
  'grain-type-safety': ['grain/no-any', 'grain/no-non-null-assertion', 'grain/require-return-type'],
  'grain-zustand': ['grain/zustand-patterns'],
  
  // eslint-plugin-functional 规则
  'functional-immutability': ['functional/immutable-data', 'functional/prefer-readonly-type', 'functional/no-let', 'functional/prefer-tacit'],
  'functional-no-exceptions': ['functional/no-throw-statements', 'functional/no-try-statements'],
  'functional-no-statements': ['functional/no-expression-statements', 'functional/no-conditional-statements', 'functional/no-loop-statements'],
  'functional-currying': ['functional/functional-parameters'],
  'functional-no-other-paradigm': ['functional/no-class-inheritance', 'functional/no-classes', 'functional/no-this-expressions', 'functional/no-mixed-types'],
  
  // check-file 插件规则
  'check-file': ['check-file/filename-naming-convention', 'check-file/folder-naming-convention', 'check-file/filename-blocklist', 'check-file/folder-match-with-fex'],
  
  // TypeScript ESLint 规则
  'typescript-types': ['@typescript-eslint/no-explicit-any', '@typescript-eslint/no-unsafe-assignment', '@typescript-eslint/no-unsafe-member-access', '@typescript-eslint/no-unsafe-call', '@typescript-eslint/no-unsafe-return', '@typescript-eslint/no-unsafe-argument'],
  'typescript-best-practices': ['@typescript-eslint/no-unused-vars', '@typescript-eslint/no-floating-promises', '@typescript-eslint/await-thenable', '@typescript-eslint/no-misused-promises', '@typescript-eslint/require-await'],
  'typescript-style': ['@typescript-eslint/consistent-type-imports', '@typescript-eslint/consistent-type-definitions', '@typescript-eslint/array-type', '@typescript-eslint/prefer-nullish-coalescing'],
  
  // ESLint 核心规则
  'eslint-style': ['arrow-body-style', 'prefer-arrow-callback', 'prefer-const', 'no-var', 'object-shorthand'],
  'eslint-best-practices': ['no-console', 'no-debugger', 'no-alert', 'eqeqeq', 'no-eval'],
  'eslint-errors': ['no-unused-vars', 'no-undef', 'no-unreachable', 'no-constant-condition'],
};

/**
 * 获取规则所属类别
 */
function getRuleCategory(ruleId) {
  for (const [category, rules] of Object.entries(RULE_CATEGORIES)) {
    if (rules.includes(ruleId)) {
      return category;
    }
  }
  return 'other';
}

/**
 * 分类并保存报告
 */
function categorizeAndSave(results) {
  const outputDir = join(process.cwd(), 'lint-reports');
  
  // 创建输出目录
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    console.error('❌ 创建目录失败:', error.message);
    process.exit(1);
  }

  // 按类别分组
  const categorized = {};
  const summary = {
    totalFiles: 0,
    totalErrors: 0,
    totalWarnings: 0,
    byCategory: {},
  };

  for (const result of results) {
    if (result.messages.length === 0) continue;

    summary.totalFiles++;

    for (const message of result.messages) {
      const category = getRuleCategory(message.ruleId || 'unknown');
      
      if (!categorized[category]) {
        categorized[category] = [];
        summary.byCategory[category] = { errors: 0, warnings: 0, files: new Set() };
      }

      categorized[category].push({
        file: result.filePath,
        line: message.line,
        column: message.column,
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
        ruleId: message.ruleId,
      });

      if (message.severity === 2) {
        summary.totalErrors++;
        summary.byCategory[category].errors++;
      } else {
        summary.totalWarnings++;
        summary.byCategory[category].warnings++;
      }

      summary.byCategory[category].files.add(result.filePath);
    }
  }

  // 转换 Set 为数组
  for (const category in summary.byCategory) {
    summary.byCategory[category].files = summary.byCategory[category].files.size;
  }

  // 保存分类报告
  for (const [category, issues] of Object.entries(categorized)) {
    const filename = join(outputDir, `${category}.md`);
    const content = generateMarkdownReport(category, issues);
    writeFileSync(filename, content, 'utf-8');
    console.log(`✅ ${category}: ${issues.length} 个问题 → ${filename}`);
  }

  // 保存总结报告
  const summaryFilename = join(outputDir, 'summary.md');
  const summaryContent = generateSummaryReport(summary);
  writeFileSync(summaryFilename, summaryContent, 'utf-8');
  console.log(`\n📊 总结报告 → ${summaryFilename}`);

  // 保存完整 JSON（方便后续处理）
  const jsonFilename = join(outputDir, 'full-report.json');
  writeFileSync(jsonFilename, JSON.stringify(categorized, null, 2), 'utf-8');
  console.log(`📦 完整 JSON → ${jsonFilename}`);

  console.log(`\n✨ 报告生成完成！共 ${summary.totalFiles} 个文件，${summary.totalErrors} 个错误，${summary.totalWarnings} 个警告`);
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport(category, issues) {
  const lines = [
    `# ${category.toUpperCase()} 问题报告`,
    '',
    `共 ${issues.length} 个问题`,
    '',
    '---',
    '',
  ];

  // 按文件分组
  const byFile = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) {
      byFile[issue.file] = [];
    }
    byFile[issue.file].push(issue);
  }

  // 生成报告
  for (const [file, fileIssues] of Object.entries(byFile)) {
    lines.push(`## ${file}`);
    lines.push('');
    lines.push(`共 ${fileIssues.length} 个问题`);
    lines.push('');

    for (const issue of fileIssues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      lines.push(`### ${icon} ${issue.ruleId}`);
      lines.push('');
      lines.push(`**位置**: 第 ${issue.line} 行，第 ${issue.column} 列`);
      lines.push('');
      lines.push(`**消息**: ${issue.message}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * 生成总结报告
 */
function generateSummaryReport(summary) {
  const lines = [
    '# Lint 报告总结',
    '',
    `- **总文件数**: ${summary.totalFiles}`,
    `- **总错误数**: ${summary.totalErrors}`,
    `- **总警告数**: ${summary.totalWarnings}`,
    '',
    '## 按类别统计',
    '',
    '| 类别 | 错误 | 警告 | 文件数 | 总计 |',
    '|------|------|------|--------|------|',
  ];

  // 按总问题数排序
  const sorted = Object.entries(summary.byCategory).sort(
    ([, a], [, b]) => (b.errors + b.warnings) - (a.errors + a.warnings)
  );

  for (const [category, stats] of sorted) {
    const total = stats.errors + stats.warnings;
    lines.push(`| ${category} | ${stats.errors} | ${stats.warnings} | ${stats.files} | ${total} |`);
  }

  lines.push('');
  lines.push('## 详细报告');
  lines.push('');

  for (const [category] of sorted) {
    lines.push(`- [${category}.md](./${category}.md)`);
  }

  return lines.join('\n');
}
