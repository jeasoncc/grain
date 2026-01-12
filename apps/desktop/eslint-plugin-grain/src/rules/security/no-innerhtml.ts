import { ESLintUtils } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'no-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      description: '❌ 禁止使用 innerHTML/outerHTML 和 dangerouslySetInnerHTML',
      recommended: 'error',
    },
    messages: {
      noInnerHTML: buildComprehensiveErrorMessage({
        title: '禁止使用 innerHTML',
        problemCode: `element.innerHTML = userInput;
element.outerHTML = '<div>' + content + '</div>';`,
        reason: `innerHTML 会解析并执行 HTML 中的脚本，存在 XSS 攻击风险：
  - 用户输入可能包含恶意脚本
  - 无法进行内容安全策略（CSP）保护
  - 破坏 React 的虚拟 DOM 管理
  - 可能导致内存泄漏`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 永远不要直接插入 HTML 字符串
  - 使用 React 的声明式渲染
  - 如果必须插入 HTML，使用 DOMPurify 清理`,
        steps: [
          '移除 innerHTML/outerHTML 赋值',
          '使用 React 组件渲染内容',
          '使用 textContent 插入纯文本',
          '如果必须插入 HTML，使用 DOMPurify.sanitize()',
        ],
        correctExample: `// ✅ 正确：使用 textContent 插入纯文本
element.textContent = userInput;

// ✅ 正确：使用 React 渲染
return <div>{content}</div>;

// ✅ 正确：如果必须插入 HTML，先清理
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(htmlContent);`,
        warnings: [
          '永远不要直接插入未清理的 HTML',
          '用户输入必须经过清理或转义',
          '优先使用 React 的声明式渲染',
          '如果必须使用 innerHTML，使用 DOMPurify',
        ],
        docRef: '#security - XSS 防护',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-dangerously-set-inner-html'],
      }),
      noOuterHTML: buildComprehensiveErrorMessage({
        title: '禁止使用 outerHTML',
        problemCode: `element.outerHTML = '<div class="new">' + content + '</div>';`,
        reason: `outerHTML 与 innerHTML 类似，存在 XSS 攻击风险：
  - 会替换整个元素及其内容
  - 可能执行恶意脚本
  - 破坏 React 的 DOM 管理`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 使用 React 管理 DOM
  - 避免直接操作 DOM
  - 使用声明式渲染`,
        steps: [
          '移除 outerHTML 赋值',
          '使用 React 组件替换元素',
          '使用条件渲染控制元素显示',
        ],
        correctExample: `// ✅ 正确：使用 React 条件渲染
{showNew ? <div className="new">{content}</div> : <div>{content}</div>}

// ✅ 正确：使用状态控制
const [className, setClassName] = useState('old');
return <div className={className}>{content}</div>;`,
        warnings: [
          '使用 React 的声明式渲染',
          '避免直接操作 DOM',
        ],
        docRef: '#security - XSS 防护',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-inner-html'],
      }),
      noDangerouslySetInnerHTML: buildComprehensiveErrorMessage({
        title: '禁止使用 dangerouslySetInnerHTML（除非有清理）',
        problemCode: `<div dangerouslySetInnerHTML={{ __html: userContent }} />`,
        reason: `dangerouslySetInnerHTML 会绕过 React 的 XSS 保护：
  - 名字中的 "dangerously" 就是警告
  - 必须确保内容已经过清理
  - 容易被误用导致安全漏洞`,
        architecturePrinciple: `Grain 项目的安全原则：
  - 优先使用 React 的正常渲染
  - 如果必须使用，内容必须经过 DOMPurify 清理
  - 添加注释说明为什么需要使用`,
        steps: [
          '检查是否真的需要 dangerouslySetInnerHTML',
          '如果可以，使用普通的 React 渲染',
          '如果必须使用，先用 DOMPurify.sanitize() 清理',
          '添加注释说明原因和清理方法',
        ],
        correctExample: `// ✅ 正确：使用普通渲染
<div>{content}</div>

// ✅ 正确：如果必须使用，先清理并添加注释
import DOMPurify from 'dompurify';

// 注意：此处使用 dangerouslySetInnerHTML 是因为需要渲染富文本编辑器内容
// 内容已通过 DOMPurify 清理，移除了所有潜在的恶意脚本
const sanitizedHTML = DOMPurify.sanitize(richTextContent, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
  ALLOWED_ATTR: [],
});
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />`,
        warnings: [
          '优先使用普通的 React 渲染',
          '如果必须使用，内容必须经过 DOMPurify.sanitize()',
          '添加注释说明为什么需要使用',
          '限制允许的 HTML 标签和属性',
        ],
        docRef: '#security - XSS 防护',
        steeringFile: '#code-standards - 安全规范',
        relatedRules: ['no-inner-html'],
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // 检测 innerHTML 和 outerHTML 赋值
      AssignmentExpression(node) {
        if (node.left.type === 'MemberExpression' && node.left.property.type === 'Identifier') {
          const propertyName = node.left.property.name;
          
          if (propertyName === 'innerHTML') {
            context.report({
              node,
              messageId: 'noInnerHTML',
            });
          } else if (propertyName === 'outerHTML') {
            context.report({
              node,
              messageId: 'noOuterHTML',
            });
          }
        }
      },
      // 检测 dangerouslySetInnerHTML
      JSXAttribute(node) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'dangerouslySetInnerHTML'
        ) {
          // 检查是否有 DOMPurify.sanitize 调用
          const sourceCode = context.getSourceCode();
          const text = sourceCode.getText(node.value || node);
          
          // 如果没有 sanitize 调用，报告错误
          if (!text.includes('sanitize') && !text.includes('DOMPurify')) {
            context.report({
              node,
              messageId: 'noDangerouslySetInnerHTML',
            });
          }
        }
      },
    };
  },
});
