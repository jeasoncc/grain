import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

type MessageIds = 'requireMemo';
type Options = [];

export default createRule<Options, MessageIds>({
  name: 'require-memo',
  meta: {
    type: 'problem',
    docs: {
      description: '要求 React 组件使用 memo 包裹以优化性能',
    },
    messages: {
      requireMemo: buildErrorMessage({
        title: '组件 {{componentName}} 未使用 memo 包裹',
        reason: `未使用 memo 的组件会在父组件重新渲染时无条件重新渲染：
  - 造成不必要的性能开销
  - 违反 Grain 项目的性能优化原则
  - 可能导致子组件的无效渲染`,
        correctExample: `// ✅ 使用 memo 包裹组件
import { memo } from 'react';

interface Props {
  title: string;
  onAction: () => void;
}

export const MyComponent = memo<Props>(({ title, onAction }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
});

MyComponent.displayName = 'MyComponent';`,
        incorrectExample: `// ❌ 未使用 memo
export const MyComponent = ({ title, onAction }: Props) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
};`,
        docRef: '#code-standards - React 组件规范',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename();
    
    // 只检查 .tsx 文件
    if (!filename.endsWith('.tsx')) {
      return {};
    }

    // 跳过测试文件
    if (/\.(test|spec)\.tsx$/.test(filename)) {
      return {};
    }

    function isReactComponent(node: TSESTree.Node): boolean {
      // 检查是否返回 JSX
      if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
        const body = node.body;
        
        // 箭头函数直接返回 JSX
        if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
          return true;
        }
        
        // 函数体中有 return JSX
        if (body.type === 'BlockStatement') {
          return body.body.some(statement => {
            if (statement.type === 'ReturnStatement' && statement.argument) {
              return statement.argument.type === 'JSXElement' || 
                     statement.argument.type === 'JSXFragment';
            }
            return false;
          });
        }
      }
      
      if (node.type === 'FunctionDeclaration' && node.body) {
        return node.body.body.some(statement => {
          if (statement.type === 'ReturnStatement' && statement.argument) {
            return statement.argument.type === 'JSXElement' || 
                   statement.argument.type === 'JSXFragment';
          }
          return false;
        });
      }
      
      return false;
    }

    function isWrappedWithMemo(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      
      // 向上查找，检查是否在 memo() 调用中
      while (current) {
        if (current.type === 'CallExpression') {
          const callee = current.callee;
          if (callee.type === 'Identifier' && callee.name === 'memo') {
            return true;
          }
          // 检查 React.memo
          if (callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' &&
              callee.object.name === 'React' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'memo') {
            return true;
          }
        }
        
        // 如果到达变量声明器，检查其初始化器
        if (current.type === 'VariableDeclarator') {
          const init = current.init;
          if (init && init.type === 'CallExpression') {
            const callee = init.callee;
            if (callee.type === 'Identifier' && callee.name === 'memo') {
              return true;
            }
            if (callee.type === 'MemberExpression' &&
                callee.object.type === 'Identifier' &&
                callee.object.name === 'React' &&
                callee.property.type === 'Identifier' &&
                callee.property.name === 'memo') {
              return true;
            }
          }
          break; // 到达变量声明器就停止
        }
        
        current = current.parent;
      }
      
      return false;
    }

    function getComponentName(node: TSESTree.Node): string {
      // 从变量声明中获取名称
      if (node.parent && node.parent.type === 'VariableDeclarator') {
        if (node.parent.id.type === 'Identifier') {
          return node.parent.id.name;
        }
      }
      
      // 从函数声明中获取名称
      if (node.type === 'FunctionDeclaration' && node.id) {
        return node.id.name;
      }
      
      return '(匿名组件)';
    }

    return {
      // 检查箭头函数组件
      ArrowFunctionExpression(node) {
        if (isReactComponent(node) && !isWrappedWithMemo(node)) {
          const componentName = getComponentName(node);
          // 只报告导出的组件
          if (node.parent && 
              (node.parent.type === 'VariableDeclarator' || 
               node.parent.type === 'ExportDefaultDeclaration')) {
            context.report({
              node,
              messageId: 'requireMemo',
              data: {
                componentName,
              },
            });
          }
        }
      },
      
      // 检查函数表达式组件
      FunctionExpression(node) {
        if (isReactComponent(node) && !isWrappedWithMemo(node)) {
          const componentName = getComponentName(node);
          if (node.parent && node.parent.type === 'VariableDeclarator') {
            context.report({
              node,
              messageId: 'requireMemo',
              data: {
                componentName,
              },
            });
          }
        }
      },
      
      // 检查函数声明组件
      FunctionDeclaration(node) {
        if (isReactComponent(node) && !isWrappedWithMemo(node)) {
          const componentName = getComponentName(node);
          // 检查是否是导出的组件
          const parent = node.parent;
          if (parent && 
              (parent.type === 'ExportNamedDeclaration' || 
               parent.type === 'ExportDefaultDeclaration' ||
               parent.type === 'Program')) {
            context.report({
              node,
              messageId: 'requireMemo',
              data: {
                componentName,
              },
            });
          }
        }
      },
    };
  },
});
