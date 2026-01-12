/**
 * @fileoverview Rule to enforce import grouping
 * @author Grain Team
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);

enum ImportGroup {
  External = 0,  // node_modules
  Internal = 1,  // @/ alias
  Relative = 2,  // ./
}

function getImportGroup(source: string): ImportGroup {
  if (source.startsWith('@/')) {
    return ImportGroup.Internal;
  }
  if (source.startsWith('.')) {
    return ImportGroup.Relative;
  }
  return ImportGroup.External;
}

export default createRule({
  name: 'import-grouping',
  meta: {
    type: 'suggestion',
    docs: {
      description: '强制导入分组：外部库 → 内部模块 (@/) → 相对路径 (./)',
    },
    fixable: 'code',
    schema: [],
    messages: {
      wrongOrder: buildErrorMessage({
        title: '导入顺序错误',
        reason: `
  导入应该按照以下顺序分组：
  1. 外部库（node_modules）
  2. 内部模块（@/ 别名）
  3. 相对路径（./ 或 ../）
  
  每组之间应该有空行分隔`,
        correctExample: `// ✅ 正确的导入顺序
// 外部库
import React from 'react';
import { pipe } from 'fp-ts/function';

// 内部模块
import { MyComponent } from '@/views/my-component';
import { useWorkspace } from '@/hooks/use-workspace';

// 相对路径
import { helper } from './helper';
import type { LocalType } from './types';`,
        incorrectExample: `// ❌ 错误的导入顺序
import { helper } from './helper';
import React from 'react';
import { MyComponent } from '@/views/my-component';`,
        docRef: '#code-standards - 导入规范',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program(node: TSESTree.Program) {
        const imports: TSESTree.ImportDeclaration[] = [];
        
        // Collect all import declarations
        for (const statement of node.body) {
          if (statement.type === 'ImportDeclaration') {
            imports.push(statement);
          }
        }
        
        if (imports.length === 0) return;
        
        // Check if imports are in correct order
        let lastGroup = ImportGroup.External;
        let hasError = false;
        
        for (const importNode of imports) {
          const source = importNode.source.value;
          if (typeof source !== 'string') continue;
          
          const currentGroup = getImportGroup(source);
          
          if (currentGroup < lastGroup) {
            hasError = true;
            break;
          }
          
          lastGroup = currentGroup;
        }
        
        if (!hasError) return;
        
        // Report error on the first import
        context.report({
          node: imports[0],
          messageId: 'wrongOrder',
          fix(fixer) {
            // Group imports
            const grouped: Map<ImportGroup, TSESTree.ImportDeclaration[]> = new Map([
              [ImportGroup.External, []],
              [ImportGroup.Internal, []],
              [ImportGroup.Relative, []],
            ]);
            
            for (const importNode of imports) {
              const source = importNode.source.value;
              if (typeof source !== 'string') continue;
              
              const group = getImportGroup(source);
              grouped.get(group)!.push(importNode);
            }
            
            // Sort within each group alphabetically
            for (const group of Array.from(grouped.values())) {
              group.sort((a, b) => {
                const sourceA = a.source.value as string;
                const sourceB = b.source.value as string;
                return sourceA.localeCompare(sourceB);
              });
            }
            
            // Build the new import text
            const sourceCode = context.sourceCode || context.getSourceCode();
            const newImports: string[] = [];
            
            for (const group of [ImportGroup.External, ImportGroup.Internal, ImportGroup.Relative]) {
              const groupImports = grouped.get(group)!;
              if (groupImports.length > 0) {
                const groupText = groupImports
                  .map(imp => sourceCode.getText(imp))
                  .join('\n');
                newImports.push(groupText);
              }
            }
            
            const newText = newImports.join('\n\n');
            
            // Replace all imports with the sorted version
            const firstImport = imports[0];
            const lastImport = imports[imports.length - 1];
            
            return fixer.replaceTextRange(
              [firstImport.range[0], lastImport.range[1]],
              newText
            );
          },
        });
      },
    };
  },
});
