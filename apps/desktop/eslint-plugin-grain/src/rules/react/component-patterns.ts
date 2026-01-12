import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { buildErrorMessage } from '../../utils/message-builder';
import { isViewComponent } from '../../utils/architecture';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`
);

export default createRule({
  name: 'component-patterns',
  meta: {
    type: 'problem',
    docs: {
      description: '检测 React 组件模式',
    },
    messages: {
      businessStateInView: buildErrorMessage({
        title: 'view 组件不应包含业务状态',
        reason: `
  view 组件应该是纯展示组件，只接收 props。
  业务状态应该在 container 组件或 hooks 中管理。
  
  这样做的好处：
  - 组件职责清晰
  - 易于测试
  - 易于复用`,
        correctExample: `// ✅ view 组件只接收 props
export const UserView = memo(({ user, onEdit }: UserViewProps) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={onEdit}>编辑</button>
    </div>
  );
});

// ✅ container 组件管理状态
export const UserContainer = () => {
  const { user } = useUser();
  const handleEdit = useCallback(() => {
    // 业务逻辑
  }, []);
  
  return <UserView user={user} onEdit={handleEdit} />;
};`,
        incorrectExample: `// ❌ view 组件包含业务状态
export const UserView = memo(() => {
  const { user } = useUser(); // 不应该在 view 中
  const [editing, setEditing] = useState(false); // UI 状态可以
  
  return <div>{user.name}</div>;
});`,
        docRef: '#architecture - 组件分层',
      }),
      keyWithIndex: buildErrorMessage({
        title: '禁止使用 key={index}',
        reason: `
  使用数组索引作为 key 会导致：
  - 列表重新排序时出现错误
  - 组件状态混乱
  - 性能问题
  
  应该使用稳定的唯一标识符作为 key。`,
        correctExample: `// ✅ 使用唯一 ID
{items.map((item) => (
  <Item key={item.id} data={item} />
))}

// ✅ 使用组合键
{items.map((item) => (
  <Item key={\`\${item.type}-\${item.id}\`} data={item} />
))}`,
        incorrectExample: `// ❌ 使用索引
{items.map((item, index) => (
  <Item key={index} data={item} />
))}`,
        docRef: 'https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key',
      }),
      conditionalRenderingWithAnd: buildErrorMessage({
        title: '条件渲染使用 && 可能导致渲染 0',
        reason: `
  使用 && 进行条件渲染时，如果左侧为 0，会渲染 "0" 而不是什么都不渲染。
  这是一个常见的陷阱。`,
        correctExample: `// ✅ 使用三元表达式
{count > 0 ? <div>{count} items</div> : null}

// ✅ 使用布尔转换
{!!count && <div>{count} items</div>}

// ✅ 显式比较
{count > 0 && <div>{count} items</div>}`,
        incorrectExample: `// ❌ 可能渲染 0
{count && <div>{count} items</div>}

// ❌ 可能渲染 0
{items.length && <List items={items} />}`,
        docRef: '#code-standards - React 条件渲染',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;
    const isView = isViewComponent(filename);

    return {
      // 检测 view 组件中的业务状态
      CallExpression(node) {
        if (!isView) return;
        
        if (node.callee.type !== 'Identifier') return;
        
        const hookName = node.callee.name;
        
        // 检测业务状态相关的 hooks
        const businessHooks = [
          'useStore',
          'useWorkspace',
          'useNode',
          'useContent',
          'useUser',
          'useQuery',
          'useMutation',
        ];
        
        if (businessHooks.some((hook) => hookName.includes(hook))) {
          context.report({
            node,
            messageId: 'businessStateInView',
          });
        }
      },

      // 检测 key={index} 使用
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'key') return;
        if (!node.value) return;
        
        // 检查是否为表达式容器
        if (node.value.type !== 'JSXExpressionContainer') return;
        
        const expression = node.value.expression;
        
        // 检查是否为标识符且名称包含 index
        if (
          expression.type === 'Identifier' &&
          (expression.name === 'index' ||
            expression.name === 'i' ||
            expression.name === 'idx')
        ) {
          context.report({
            node,
            messageId: 'keyWithIndex',
          });
        }
      },

      // 检测条件渲染使用 &&
      'JSXExpressionContainer > LogicalExpression[operator="&&"]'(
        node: TSESTree.LogicalExpression
      ) {
        const left = node.left;
        
        // 检查左侧是否可能为数字
        const isPotentiallyNumeric = (expr: TSESTree.Expression): boolean => {
          // 标识符可能是数字
          if (expr.type === 'Identifier') {
            const name = expr.name;
            // 常见的数字变量名
            return (
              name.includes('count') ||
              name.includes('length') ||
              name.includes('size') ||
              name.includes('total') ||
              name.includes('num')
            );
          }
          
          // 成员表达式 .length
          if (
            expr.type === 'MemberExpression' &&
            expr.property.type === 'Identifier' &&
            expr.property.name === 'length'
          ) {
            return true;
          }
          
          return false;
        };
        
        if (isPotentiallyNumeric(left)) {
          context.report({
            node,
            messageId: 'conditionalRenderingWithAnd',
          });
        }
      },
    };
  },
});
