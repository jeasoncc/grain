import { ESLintUtils } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

// 敏感数据关键词
const SENSITIVE_KEYWORDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
  'privatekey',
  'private_key',
  'credential',
  'auth',
  'authorization',
  'session',
  'cookie',
  'jwt',
  'bearer',
  'oauth',
  'ssn',
  'social_security',
  'credit_card',
  'creditcard',
  'cvv',
  'pin',
  'bank_account',
  'account_number',
];

// 硬编码凭证模式
const CREDENTIAL_PATTERNS = [
  /['"](?:password|passwd|pwd)['"]:\s*['"][^'"]+['"]/i,
  /['"](?:token|apikey|api_key)['"]:\s*['"][^'"]+['"]/i,
  /['"](?:secret|privatekey|private_key)['"]:\s*['"][^'"]+['"]/i,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/,
  /Basic\s+[A-Za-z0-9+/]+=*/,
  /sk-[A-Za-z0-9]{32,}/,  // OpenAI API key pattern
  /ghp_[A-Za-z0-9]{36}/,  // GitHub personal access token
  /gho_[A-Za-z0-9]{36}/,  // GitHub OAuth token
];

export default createRule({
  name: 'no-sensitive-logging',
  meta: {
    type: 'problem',
    docs: {
      description: '❌ 禁止记录敏感数据和硬编码凭证',
      recommended: 'error',
    },
    messages: {
      sensitiveLogging: buildComprehensiveErrorMessage({
        title: '禁止记录敏感数据',
        problemCode: `logger.info('User login', { username, password });
console.log('API token:', apiToken);
logger.debug('Auth header:', { authorization: bearerToken });`,
        reason: `记录敏感数据会导致安全风险：
  - 密码、令牌等可能被泄露到日志文件
  - 日志可能被未授权人员访问
  - 违反数据保护法规（GDPR、CCPA）
  - 增加数据泄露的攻击面`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 永远不要记录敏感数据
  - 记录前过滤或脱敏敏感字段
  - 使用结构化日志，便于过滤
  - 定期审计日志内容`,
        steps: [
          '识别日志中的敏感数据',
          '移除或脱敏敏感字段',
          '使用日志过滤器自动脱敏',
          '记录操作而非数据内容',
        ],
        correctExample: `// ✅ 正确：不记录敏感数据
logger.info('User login', { username });
logger.info('API request authenticated');
logger.debug('Auth header present:', { hasAuth: !!bearerToken });

// ✅ 正确：脱敏后记录
logger.info('User login', {
  username,
  passwordHash: password ? '***' : undefined,
});

// ✅ 正确：使用日志过滤器
const sanitizeForLog = (obj: any) => {
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '***';
    }
  }
  
  return sanitized;
};

logger.info('User data', sanitizeForLog(userData));`,
        warnings: [
          '永远不要记录密码、令牌、密钥等敏感数据',
          '记录前检查对象是否包含敏感字段',
          '使用脱敏函数处理日志数据',
          '定期审计日志内容',
        ],
        docRef: '#security - 敏感数据保护',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-hardcoded-credentials'],
      }),
      hardcodedCredentials: buildComprehensiveErrorMessage({
        title: '禁止硬编码凭证',
        problemCode: `const apiKey = 'sk-1234567890abcdef';
const password = 'mySecretPassword123';
const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';`,
        reason: `硬编码凭证会导致严重安全风险：
  - 凭证会被提交到版本控制系统
  - 任何能访问代码的人都能看到凭证
  - 难以轮换和撤销凭证
  - 违反安全最佳实践`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 所有凭证必须从环境变量或配置文件读取
  - 配置文件必须在 .gitignore 中
  - 使用密钥管理服务（如 AWS Secrets Manager）
  - 定期轮换凭证`,
        steps: [
          '移除硬编码的凭证',
          '将凭证移到环境变量',
          '使用 .env 文件（不提交到 git）',
          '使用密钥管理服务',
        ],
        correctExample: `// ✅ 正确：从环境变量读取
const apiKey = process.env.API_KEY;
const password = process.env.DB_PASSWORD;
const token = process.env.AUTH_TOKEN;

// ✅ 正确：使用配置文件（不提交到 git）
import { config } from './config';  // config.ts 在 .gitignore 中
const apiKey = config.apiKey;

// ✅ 正确：使用密钥管理服务
import { getSecret } from '@/io/secrets';
const apiKey = await getSecret('API_KEY');`,
        warnings: [
          '永远不要在代码中硬编码凭证',
          '使用环境变量或密钥管理服务',
          '确保 .env 文件在 .gitignore 中',
          '定期轮换凭证',
          '使用不同的凭证用于开发、测试、生产环境',
        ],
        docRef: '#security - 凭证管理',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-sensitive-logging'],
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * 检查标识符或字符串是否包含敏感关键词
     */
    function containsSensitiveKeyword(text: string): boolean {
      const lowerText = text.toLowerCase();
      return SENSITIVE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
    }

    /**
     * 检查字符串是否包含硬编码凭证
     */
    function containsHardcodedCredential(text: string): boolean {
      return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(text));
    }

    /**
     * 检查节点是否是日志调用
     */
    function isLoggingCall(node: any): boolean {
      if (node.type !== 'CallExpression') return false;

      const callee = node.callee;

      // console.log, console.error, etc.
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'console'
      ) {
        return true;
      }

      // logger.info, logger.error, etc.
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'logger'
      ) {
        return true;
      }

      return false;
    }

    return {
      // 检测日志调用中的敏感数据
      CallExpression(node) {
        if (!isLoggingCall(node)) return;

        // 检查所有参数
        for (const arg of node.arguments) {
          // 检查标识符名称
          if (arg.type === 'Identifier' && containsSensitiveKeyword(arg.name)) {
            context.report({
              node: arg,
              messageId: 'sensitiveLogging',
            });
          }

          // 检查对象属性
          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                containsSensitiveKeyword(prop.key.name)
              ) {
                context.report({
                  node: prop,
                  messageId: 'sensitiveLogging',
                });
              }
            }
          }

          // 检查模板字符串
          if (arg.type === 'TemplateLiteral') {
            for (const expr of arg.expressions) {
              if (expr.type === 'Identifier' && containsSensitiveKeyword(expr.name)) {
                context.report({
                  node: expr,
                  messageId: 'sensitiveLogging',
                });
              }
            }
          }
        }
      },

      // 检测硬编码凭证
      Literal(node) {
        if (typeof node.value !== 'string') return;

        const text = node.value;
        const rawText = node.raw || '';

        // 检查字符串内容
        if (containsHardcodedCredential(text) || containsHardcodedCredential(rawText)) {
          context.report({
            node,
            messageId: 'hardcodedCredentials',
          });
        }
      },

      // 检测变量声明中的硬编码凭证
      VariableDeclarator(node) {
        if (!node.init) return;

        // 检查变量名
        if (node.id.type === 'Identifier' && containsSensitiveKeyword(node.id.name)) {
          // 检查初始值是否是字符串字面量
          if (node.init.type === 'Literal' && typeof node.init.value === 'string') {
            // 排除空字符串和明显的占位符
            const value = node.init.value;
            if (
              value &&
              value !== '' &&
              !value.includes('YOUR_') &&
              !value.includes('REPLACE_') &&
              !value.includes('TODO')
            ) {
              context.report({
                node: node.init,
                messageId: 'hardcodedCredentials',
              });
            }
          }
        }
      },

      // 检测对象属性中的硬编码凭证
      Property(node) {
        if (node.key.type === 'Identifier' && containsSensitiveKeyword(node.key.name)) {
          if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
            const value = node.value.value;
            if (
              value &&
              value !== '' &&
              !value.includes('YOUR_') &&
              !value.includes('REPLACE_') &&
              !value.includes('TODO')
            ) {
              context.report({
                node: node.value,
                messageId: 'hardcodedCredentials',
              });
            }
          }
        }
      },
    };
  },
});
