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
  // 生成日期前缀的目录名 (YYYY-MM-DD-lint-reports)
  const now = new Date();
  const datePrefix = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const outputDir = join(process.cwd(), `${datePrefix}-lint-reports`);
  
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

  // 生成 HTML 可视化报告
  const htmlFilename = join(outputDir, 'index.html');
  const htmlContent = generateHtmlReport(summary, categorized);
  writeFileSync(htmlFilename, htmlContent, 'utf-8');
  console.log(`📈 可视化报告 → ${htmlFilename}`);

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

/**
 * 生成 HTML 可视化报告
 */
function generateHtmlReport(summary, categorized) {
  // 准备图表数据
  const categoryData = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => (b.errors + b.warnings) - (a.errors + a.warnings))
    .map(([category, stats]) => ({
      category,
      errors: stats.errors,
      warnings: stats.warnings,
      total: stats.errors + stats.warnings,
      files: stats.files,
    }));

  const categoryLabels = JSON.stringify(categoryData.map(d => d.category));
  const categoryTotals = JSON.stringify(categoryData.map(d => d.total));
  const categoryErrors = JSON.stringify(categoryData.map(d => d.errors));
  const categoryWarnings = JSON.stringify(categoryData.map(d => d.warnings));

  // 获取问题最多的前 10 个文件
  const fileIssueCount = {};
  for (const [, issues] of Object.entries(categorized)) {
    for (const issue of issues) {
      fileIssueCount[issue.file] = (fileIssueCount[issue.file] || 0) + 1;
    }
  }
  const topFiles = Object.entries(fileIssueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([file, count]) => ({
      file: file.replace(process.cwd(), '').replace(/^\//, ''),
      count,
    }));

  const topFileLabels = JSON.stringify(topFiles.map(f => f.file));
  const topFileCounts = JSON.stringify(topFiles.map(f => f.count));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESLint 报告 - ${new Date().toISOString().split('T')[0]}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 2rem;
      font-size: 2.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #1f2937;
    }
    .stat-card.errors .stat-value { color: #ef4444; }
    .stat-card.warnings .stat-value { color: #f59e0b; }
    .stat-card.files .stat-value { color: #3b82f6; }
    .stat-card.total .stat-value { color: #8b5cf6; }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .chart-card h2 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    .chart-container {
      position: relative;
      height: 400px;
    }
    .table-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      overflow-x: auto;
    }
    .table-card h2 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    tr:hover {
      background: #f9fafb;
    }
    .error-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      background: #fee2e2;
      color: #991b1b;
    }
    .warning-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      background: #fef3c7;
      color: #92400e;
    }
    .category-link {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }
    .category-link:hover {
      text-decoration: underline;
    }
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 ESLint 报告分析</h1>
    
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-label">总问题数</div>
        <div class="stat-value">${summary.totalErrors + summary.totalWarnings}</div>
      </div>
      <div class="stat-card errors">
        <div class="stat-label">错误</div>
        <div class="stat-value">${summary.totalErrors}</div>
      </div>
      <div class="stat-card warnings">
        <div class="stat-label">警告</div>
        <div class="stat-value">${summary.totalWarnings}</div>
      </div>
      <div class="stat-card files">
        <div class="stat-label">受影响文件</div>
        <div class="stat-value">${summary.totalFiles}</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h2>📈 问题分布（按类别）</h2>
        <div class="chart-container">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
      
      <div class="chart-card">
        <h2>🔴 错误 vs ⚠️ 警告</h2>
        <div class="chart-container">
          <canvas id="severityChart"></canvas>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h2>📁 问题最多的文件 (Top 10)</h2>
        <div class="chart-container">
          <canvas id="topFilesChart"></canvas>
        </div>
      </div>
      
      <div class="chart-card">
        <h2>📊 错误与警告对比（按类别）</h2>
        <div class="chart-container">
          <canvas id="stackedChart"></canvas>
        </div>
      </div>
    </div>

    <div class="table-card">
      <h2>📋 详细统计表</h2>
      <table>
        <thead>
          <tr>
            <th>类别</th>
            <th>错误</th>
            <th>警告</th>
            <th>文件数</th>
            <th>总计</th>
            <th>详细报告</th>
          </tr>
        </thead>
        <tbody>
          ${categoryData.map(d => `
            <tr>
              <td><strong>${d.category}</strong></td>
              <td><span class="error-badge">${d.errors}</span></td>
              <td><span class="warning-badge">${d.warnings}</span></td>
              <td>${d.files}</td>
              <td><strong>${d.total}</strong></td>
              <td><a href="${d.category}.md" class="category-link">查看详情 →</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // 图表配置
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif';
    Chart.defaults.color = '#374151';

    // 1. 问题分布饼图
    new Chart(document.getElementById('categoryChart'), {
      type: 'doughnut',
      data: {
        labels: ${categoryLabels},
        datasets: [{
          data: ${categoryTotals},
          backgroundColor: [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
            '#6366f1', '#a855f7', '#f43f5e', '#22c55e', '#eab308'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 15,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return label + ': ' + value + ' (' + percentage + '%)';
              }
            }
          }
        }
      }
    });

    // 2. 错误 vs 警告饼图
    new Chart(document.getElementById('severityChart'), {
      type: 'pie',
      data: {
        labels: ['错误', '警告'],
        datasets: [{
          data: [${summary.totalErrors}, ${summary.totalWarnings}],
          backgroundColor: ['#ef4444', '#f59e0b'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 14 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = ${summary.totalErrors + summary.totalWarnings};
                const percentage = ((value / total) * 100).toFixed(1);
                return label + ': ' + value + ' (' + percentage + '%)';
              }
            }
          }
        }
      }
    });

    // 3. Top 10 文件横向柱状图
    new Chart(document.getElementById('topFilesChart'), {
      type: 'bar',
      data: {
        labels: ${topFileLabels},
        datasets: [{
          label: '问题数',
          data: ${topFileCounts},
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                return context[0].label.split('/').pop();
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0 }
          },
          y: {
            ticks: {
              font: { size: 10 },
              callback: function(value, index) {
                const label = this.getLabelForValue(value);
                return label.length > 40 ? '...' + label.slice(-37) : label;
              }
            }
          }
        }
      }
    });

    // 4. 堆叠柱状图（错误 vs 警告）
    new Chart(document.getElementById('stackedChart'), {
      type: 'bar',
      data: {
        labels: ${categoryLabels},
        datasets: [
          {
            label: '错误',
            data: ${categoryErrors},
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            borderWidth: 1
          },
          {
            label: '警告',
            data: ${categoryWarnings},
            backgroundColor: '#f59e0b',
            borderColor: '#d97706',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { padding: 15 }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
              font: { size: 10 },
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}
