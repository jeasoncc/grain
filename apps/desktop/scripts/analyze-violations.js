#!/usr/bin/env node

/**
 * 分析 ESLint 违规并生成修复计划
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

console.log('🔍 分析 ESLint 违规...');

try {
  // 运行 ESLint 并获取 JSON 格式输出
  const output = execSync('npm run lint:grain -- --format=json', { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
  
  const results = JSON.parse(output);
  
  // 统计违规类型
  const violationStats = {};
  const fileStats = {};
  let totalViolations = 0;
  
  results.forEach(result => {
    const filePath = result.filePath.replace(process.cwd() + '/', '');
    fileStats[filePath] = result.messages.length;
    
    result.messages.forEach(message => {
      const ruleId = message.ruleId || 'unknown';
      violationStats[ruleId] = (violationStats[ruleId] || 0) + 1;
      totalViolations++;
    });
  });
  
  // 按违规数量排序
  const sortedViolations = Object.entries(violationStats)
    .sort(([,a], [,b]) => b - a);
  
  const sortedFiles = Object.entries(fileStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20); // 前20个最严重的文件
  
  console.log('\n📊 违规统计报告');
  console.log('='.repeat(50));
  console.log(`总违规数: ${totalViolations}`);
  console.log(`涉及文件数: ${results.length}`);
  
  console.log('\n🔥 违规类型排行 (前10)');
  console.log('-'.repeat(50));
  sortedViolations.slice(0, 10).forEach(([rule, count], index) => {
    const percentage = ((count / totalViolations) * 100).toFixed(1);
    console.log(`${index + 1}. ${rule}: ${count} (${percentage}%)`);
  });
  
  console.log('\n📁 最严重的文件 (前20)');
  console.log('-'.repeat(50));
  sortedFiles.forEach(([file, count], index) => {
    console.log(`${index + 1}. ${file}: ${count} 个违规`);
  });
  
  // 生成修复计划
  const fixPlan = {
    totalViolations,
    violationsByType: Object.fromEntries(sortedViolations),
    worstFiles: Object.fromEntries(sortedFiles),
    recommendations: generateRecommendations(sortedViolations),
    timestamp: new Date().toISOString()
  };
  
  // 保存分析结果
  writeFileSync('violation-analysis.json', JSON.stringify(fixPlan, null, 2));
  
  console.log('\n💡 修复建议');
  console.log('-'.repeat(50));
  fixPlan.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  console.log('\n✅ 分析完成！结果已保存到 violation-analysis.json');
  
} catch (error) {
  console.error('❌ 分析失败:', error.message);
  process.exit(1);
}

function generateRecommendations(sortedViolations) {
  const recommendations = [];
  const topViolations = sortedViolations.slice(0, 5);
  
  topViolations.forEach(([rule, count]) => {
    switch (rule) {
      case 'functional/prefer-readonly-type':
        recommendations.push(`优先修复 readonly 类型问题 (${count} 个) - 可以批量自动修复`);
        break;
      case 'grain/no-console-log':
        recommendations.push(`批量替换 console.log 为 logger API (${count} 个) - 使用脚本自动化`);
        break;
      case 'grain/no-try-catch':
        recommendations.push(`转换 try-catch 为 TaskEither (${count} 个) - 需要手动重构`);
        break;
      case 'check-file/filename-naming-convention':
        recommendations.push(`重命名文件以符合命名规范 (${count} 个) - 可以批量处理`);
        break;
      case 'grain/layer-dependencies':
        recommendations.push(`修复架构层级违规 (${count} 个) - 高优先级，需要仔细重构`);
        break;
      case 'grain/no-date-constructor':
        recommendations.push(`替换 Date 构造函数为 dayjs (${count} 个) - 可以批量替换`);
        break;
      default:
        recommendations.push(`处理 ${rule} 违规 (${count} 个)`);
    }
  });
  
  return recommendations;
}