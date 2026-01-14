#!/usr/bin/env node

/**
 * 自动修复 functional/prefer-readonly-type 问题
 * 为接口属性添加 readonly 修饰符
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filesToFix = [
  'apps/desktop/src/io/api/client.api.ts',
  'apps/desktop/src/flows/search/search-engine.flow.ts',
  'apps/desktop/src/pipes/import/import.markdown.fn.ts',
  'apps/desktop/src/types/editor-tab/editor-tab.builder.ts',
  'apps/desktop/src/types/user/user.builder.ts',
  'apps/desktop/src/utils/file-tree-navigation.util.ts',
  'apps/desktop/src/utils/keyboard.util.ts',
];

function fixReadonlyInFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // 修复接口属性（不在函数内部）
    let fixed = content.replace(
      /^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^;]+;)$/gm,
      (match, indent, propName, rest) => {
        // 跳过已经有 readonly 的
        if (match.includes('readonly')) return match;
        // 跳过函数签名
        if (rest.includes('=>') || rest.includes('(')) return match;
        return `${indent}readonly ${propName}: ${rest}`;
      }
    );

    // 修复数组类型为 readonly
    fixed = fixed.replace(
      /:\s*([A-Z][a-zA-Z0-9_]*)\[\]/g,
      ': readonly $1[]'
    );

    // 修复泛型数组
    fixed = fixed.replace(
      /:\s*([A-Z][a-zA-Z0-9_<>|,\s]*)\[\]/g,
      ': readonly $1[]'
    );

    if (content !== fixed) {
      writeFileSync(filePath, fixed, 'utf-8');
      console.log(`✅ 修复: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  跳过: ${filePath} (无需修复)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 错误: ${filePath}`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 开始修复 readonly 问题...\n');
  
  let fixedCount = 0;
  
  for (const file of filesToFix) {
    const fullPath = file; // Use file path directly since it's already relative to workspace root
    if (fixReadonlyInFile(fullPath)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ 完成！修复了 ${fixedCount} 个文件`);
}

main();