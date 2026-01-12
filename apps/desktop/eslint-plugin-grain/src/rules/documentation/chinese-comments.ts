import { ESLintUtils } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

/**
 * 技术术语白名单（允许的英文词汇）
 */
const TECHNICAL_TERMS = new Set([
  // 编程概念
  'API', 'UI', 'UX', 'ID', 'URL', 'HTTP', 'HTTPS', 'JSON', 'XML', 'HTML', 'CSS',
  'DOM', 'BOM', 'AJAX', 'REST', 'GraphQL', 'WebSocket', 'SSR', 'CSR', 'SPA',
  'SEO', 'CDN', 'DNS', 'IP', 'TCP', 'UDP', 'SSH', 'FTP', 'SMTP',
  
  // 数据结构和算法
  'Array', 'Map', 'Set', 'Object', 'Promise', 'Observable', 'Stream',
  'Queue', 'Stack', 'Tree', 'Graph', 'Hash', 'Cache',
  
  // 设计模式
  'Singleton', 'Factory', 'Observer', 'Proxy', 'Decorator', 'Adapter',
  'Strategy', 'Command', 'State', 'Builder', 'Prototype',
  
  // 函数式编程
  'pipe', 'compose', 'curry', 'fold', 'map', 'filter', 'reduce',
  'Either', 'Option', 'Maybe', 'Task', 'TaskEither', 'IO',
  
  // React 相关
  'React', 'JSX', 'TSX', 'Component', 'Hook', 'Props', 'State',
  'Context', 'Provider', 'Consumer', 'Ref', 'Effect', 'Memo',
  'Callback', 'Reducer', 'Dispatch',
  
  // TypeScript
  'TypeScript', 'Interface', 'Type', 'Enum', 'Generic', 'Union',
  'Intersection', 'Tuple', 'Readonly', 'Partial', 'Required',
  
  // 工具库
  'Lodash', 'Ramda', 'fp-ts', 'Zod', 'Immer', 'Zustand', 'Redux',
  'TanStack', 'Query', 'Router', 'Form', 'Vite', 'Webpack',
  
  // 数据库
  'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
  'IndexedDB', 'LocalStorage', 'SessionStorage',
  
  // 测试
  'Test', 'Mock', 'Stub', 'Spy', 'Fixture', 'Snapshot',
  
  // Git
  'Git', 'Commit', 'Branch', 'Merge', 'Rebase', 'Cherry-pick',
  'Pull', 'Push', 'Clone', 'Fork', 'Tag',
  
  // 其他
  'Markdown', 'YAML', 'TOML', 'Regex', 'RegExp', 'Blob', 'Buffer',
  'Token', 'Auth', 'OAuth', 'JWT', 'CORS', 'CSRF', 'XSS',
]);

/**
 * 检测文本是否主要是英文（排除技术术语）
 */
function isEnglishComment(text: string): boolean {
  // 移除注释标记
  const cleaned = text
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

  // 忽略 TODO/FIXME 等标记（这些可以用英文）
  if (/^(TODO|FIXME|NOTE|HACK|XXX|BUG):/i.test(cleaned)) {
    return false;
  }

  // 移除技术术语
  let textWithoutTerms = cleaned;
  for (const term of TECHNICAL_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    textWithoutTerms = textWithoutTerms.replace(regex, '');
  }

  // 移除代码片段（反引号包裹的内容）
  textWithoutTerms = textWithoutTerms.replace(/`[^`]+`/g, '');

  // 移除标点符号和空格
  textWithoutTerms = textWithoutTerms.replace(/[^\w\u4e00-\u9fa5]/g, '');

  // 如果剩余文本为空，说明只有技术术语，允许
  if (textWithoutTerms.length === 0) {
    return false;
  }

  // 检测是否包含中文
  const hasChinese = /[\u4e00-\u9fa5]/.test(textWithoutTerms);

  // 检测是否包含英文字母
  const hasEnglish = /[a-zA-Z]/.test(textWithoutTerms);

  // 如果有中文，认为是中文注释
  if (hasChinese) {
    return false;
  }

  // 如果只有英文（且不是纯技术术语），认为是英文注释
  if (hasEnglish) {
    // 计算英文字母比例
    const englishCount = (textWithoutTerms.match(/[a-zA-Z]/g) || []).length;
    const totalCount = textWithoutTerms.length;
    
    // 如果英文字母超过 50%，认为是英文注释
    return englishCount / totalCount > 0.5;
  }

  return false;
}

export default createRule({
  name: 'chinese-comments',
  meta: {
    type: 'suggestion',
    docs: {
      description: '⚠️ 建议使用中文编写注释',
    },
    messages: {
      useChineseComments: buildComprehensiveErrorMessage({
        title: '建议使用中文编写注释',
        problemCode: `// This function creates a new node
function createNode(name: string): Node {
  return { name };
}`,
        reason: `Grain 项目使用中文作为主要注释语言：
  - 团队成员主要使用中文
  - 中文注释更容易理解和维护
  - 技术术语可以保留英文
  - 提高代码可读性`,
        architecturePrinciple: `Grain 项目的注释原则：
  - 使用中文编写注释和文档
  - 技术术语保留英文（如 API、React、TaskEither）
  - 代码标识符使用英文（变量名、函数名）
  - JSDoc 使用中文描述`,
        steps: [
          '将英文注释翻译成中文',
          '保留技术术语的英文形式',
          '确保注释清晰易懂',
        ],
        correctExample: `// ✅ 正确：使用中文注释
// 创建新节点
function createNode(name: string): Node {
  return { name };
}

// ✅ 正确：技术术语保留英文
// 使用 TaskEither 处理异步错误
const fetchData = (): TE.TaskEither<AppError, Data> => {
  // 调用 API 获取数据
  return TE.tryCatch(
    () => api.getData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: \`获取数据失败: \${String(error)}\`,
    })
  );
};

// ✅ 正确：JSDoc 使用中文
/**
 * 创建新节点
 * 
 * @param {string} name - 节点名称
 * @returns {Node} 创建的节点对象
 */
function createNode(name: string): Node {
  return { name };
}`,
        warnings: [
          '技术术语（API、React、TaskEither 等）可以保留英文',
          'TODO/FIXME 等标记可以用英文',
          '代码标识符（变量名、函数名）应该用英文',
          '注释的主要内容应该用中文',
        ],
        docRef: '#code-standards - 注释规范',
        steeringFile: '#code-standards - 文档规范',
        relatedRules: ['require-jsdoc'],
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      Program() {
        // 获取所有注释
        const comments = sourceCode.getAllComments();

        for (const comment of comments) {
          const commentText = comment.value;

          if (isEnglishComment(commentText)) {
            context.report({
              loc: comment.loc,
              messageId: 'useChineseComments',
            });
          }
        }
      },
    };
  },
});
