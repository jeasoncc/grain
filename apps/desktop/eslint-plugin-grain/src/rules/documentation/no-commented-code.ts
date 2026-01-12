import { ESLintUtils } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

/**
 * 检测注释是否包含代码
 * 启发式规则：
 * 1. 包含函数调用模式：identifier()
 * 2. 包含赋值模式：= 
 * 3. 包含对象/数组字面量：{} []
 * 4. 包含导入/导出：import/export
 * 5. 包含 const/let/var 声明
 * 6. 包含 if/for/while 等控制流
 * 7. 包含箭头函数：=>
 * 8. 包含分号结尾
 */
function looksLikeCode(comment: string): boolean {
  // 移除注释标记
  const cleaned = comment
    .replace(/^\/\/\s*/, '')
    .replace(/^\/\*+\s*/, '')
    .replace(/\*+\/\s*$/, '')
    .replace(/^\s*\*\s*/gm, '')
    .trim();

  // 忽略空注释
  if (cleaned.length === 0) {
    return false;
  }

  // 忽略 JSDoc 标签
  if (cleaned.startsWith('@')) {
    return false;
  }

  // 忽略 TODO/FIXME/NOTE 等标记
  if (/^(TODO|FIXME|NOTE|HACK|XXX|BUG):/i.test(cleaned)) {
    return false;
  }

  // 忽略纯文本说明（中文或英文句子）
  if (/^[\u4e00-\u9fa5\s]+$/.test(cleaned)) {
    return false;
  }

  // 检测代码特征
  const codePatterns = [
    // 函数调用：identifier()
    /\w+\s*\([^)]*\)/,
    // 赋值：= 
    /\w+\s*=\s*\w+/,
    // 对象字面量：{ key: value }
    /\{\s*\w+\s*:\s*\w+/,
    // 数组字面量：[...]
    /\[\s*\w+/,
    // 导入导出
    /^(import|export)\s+/,
    // 变量声明
    /^(const|let|var)\s+\w+/,
    // 控制流
    /^(if|for|while|switch|return|break|continue)\s*[\(\{]/,
    // 箭头函数
    /=>\s*[\{\(]/,
    // 分号结尾（多行代码的特征）
    /;\s*$/,
    // 点号访问
    /\w+\.\w+/,
    // 类型注解
    /:\s*(string|number|boolean|any|void|never|unknown)/,
    // JSX
    /<\w+[^>]*>/,
    // 模板字符串
    /`[^`]*\$\{/,
  ];

  // 如果匹配多个代码特征，很可能是代码
  const matchCount = codePatterns.filter((pattern) => pattern.test(cleaned)).length;
  return matchCount >= 2;
}

export default createRule({
  name: 'no-commented-code',
  meta: {
    type: 'problem',
    docs: {
      description: '❌ 禁止注释掉的代码',
    },
    messages: {
      commentedCode: buildComprehensiveErrorMessage({
        title: '检测到注释掉的代码',
        problemCode: `// const oldFunction = () => {
//   return 'old implementation';
// };

function newFunction() {
  return 'new implementation';
}`,
        reason: `注释掉的代码应该删除，而不是保留：
  - 增加代码噪音，降低可读性
  - 容易过时，产生误导
  - 版本控制系统（Git）已经保存了历史
  - 如果需要恢复，可以从 Git 历史中找回`,
        architecturePrinciple: `Grain 项目的代码清洁原则：
  - 代码库应该只包含活跃的代码
  - 删除的代码由 Git 管理
  - 不要"以防万一"保留代码
  - 保持代码库整洁`,
        steps: [
          '删除注释掉的代码',
          '如果代码可能需要恢复，提交到 Git',
          '如果是临时调试代码，直接删除',
          '如果是备选方案，写成文档或 TODO',
        ],
        correctExample: `// ✅ 正确：只保留活跃代码
function newFunction() {
  return 'new implementation';
}

// ✅ 正确：如果需要记录旧方案，写成文档
/**
 * 新的实现方式
 * 
 * 注意：旧方案使用了同步 API，新方案改用异步 TaskEither
 * 参考 commit: abc123
 */
function newFunction() {
  return 'new implementation';
}`,
        warnings: [
          '不要"以防万一"保留注释掉的代码',
          '如果担心丢失，先提交到 Git 再删除',
          '如果是调试代码，调试完立即删除',
          '如果是备选方案，写成文档说明',
        ],
        docRef: '#code-standards - 代码清洁',
        steeringFile: '#workflow - Git 工作流',
        relatedRules: ['no-console-log'],
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program() {
        // 获取所有注释
        const comments = sourceCode.getAllComments();

        for (const comment of comments) {
          const commentText = comment.value;

          if (looksLikeCode(commentText)) {
            context.report({
              loc: comment.loc,
              messageId: 'commentedCode',
            });
          }
        }
      },
    };
  },
});
