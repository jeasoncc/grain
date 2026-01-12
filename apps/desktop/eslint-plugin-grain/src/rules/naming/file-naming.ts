import { ESLintUtils } from '@typescript-eslint/utils';
import { getArchitectureLayer } from '../../utils/architecture';
import { FILE_NAMING_PATTERNS } from '../../types/config.types';
import { buildErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'file-naming',
  meta: {
    type: 'problem',
    docs: {
      description: '强制执行各层级的文件命名规范',
      recommended: 'error',
    },
    messages: {
      invalidFileName: '文件命名不符合规范',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename();
    
    // 跳过测试文件
    if (/\.(test|spec)\.(ts|tsx)$/.test(filename)) {
      return {};
    }

    return {
      Program(node) {
        const layer = getArchitectureLayer(filename);
        if (!layer) return;

        const pattern = FILE_NAMING_PATTERNS.find(p => p.layer === layer);
        if (!pattern) return;

        const basename = filename.split('/').pop() || '';
        
        if (!pattern.pattern.test(basename)) {
          context.report({
            node,
            messageId: 'invalidFileName',
            message: buildErrorMessage({
              title: `文件命名不符合 ${layer}/ 层规范`,
              reason: `${layer}/ 层的文件必须遵循特定的命名模式。
当前文件名：${basename}
不符合规范：${pattern.description}`,
              correctExample: `// ${pattern.description}
// 示例：${pattern.example}

// 正确的文件名格式
${pattern.example.split(', ').map(ex => `- ${ex}`).join('\n')}`,
              incorrectExample: `// ❌ 错误的文件名
${basename}`,
              docRef: '#code-standards - 文件命名规范',
            }),
          });
        }
      },
    };
  },
});
