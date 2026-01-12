import { ESLintUtils } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'require-switch-default',
  meta: {
    type: 'problem',
    docs: {
      description: '要求 switch 语句包含 default 分支',
      recommended: 'error',
    },
    messages: {
      missingDefault: buildErrorMessage({
        title: 'switch 语句必须包含 default 分支',
        reason: `
  缺少 default 分支会导致：
  - 未处理的情况被静默忽略
  - 难以发现逻辑错误
  - 违反"显式优于隐式"原则
  
  即使你认为已经覆盖了所有情况，也应该添加 default 分支：
  - 防止未来添加新的枚举值时遗漏处理
  - 提供明确的错误处理
  - 使代码意图更清晰`,
        correctExample: `// ✅ 包含 default 分支
switch (status) {
  case 'active':
    return handleActive();
  case 'inactive':
    return handleInactive();
  default:
    // 显式处理未知情况
    logger.error('[Switch] 未知状态', { status });
    return handleUnknown();
}

// 或使用 exhaustive check（TypeScript）
switch (status) {
  case 'active':
    return handleActive();
  case 'inactive':
    return handleInactive();
  default:
    // 编译时检查是否遗漏情况
    const _exhaustive: never = status;
    throw new Error(\`未处理的状态: \${_exhaustive}\`);
}

// 更好的方案：使用查找表
const STATUS_HANDLERS: Record<Status, () => Result> = {
  active: handleActive,
  inactive: handleInactive,
};
const handler = STATUS_HANDLERS[status];
if (!handler) {
  logger.error('[Handler] 未知状态', { status });
  return handleUnknown();
}
return handler();`,
        incorrectExample: `// ❌ 缺少 default 分支
switch (status) {
  case 'active':
    return handleActive();
  case 'inactive':
    return handleInactive();
  // 如果 status 是其他值，会静默失败
}`,
        docRef: '#code-standards - 条件语句规范',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      SwitchStatement(node) {
        // 检查是否有 default case
        const hasDefault = node.cases.some(caseNode => caseNode.test === null);

        if (!hasDefault) {
          context.report({
            node,
            messageId: 'missingDefault',
          });
        }
      },
    };
  },
});
