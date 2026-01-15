import { ESLintUtils } from "@typescript-eslint/utils"
import { buildErrorMessage } from "../../utils/message-builder"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain/eslint-plugin-grain/blob/main/docs/rules/${name}.md`,
)

/**
 * 规则：禁止使用非空断言
 * 要求：Requirements 12.4
 */
export default createRule({
	create(context) {
		return {
			TSNonNullExpression(node) {
				context.report({
					messageId: "noNonNullAssertion",
					node,
				})
			},
		}
	},
	defaultOptions: [],
	meta: {
		docs: {
			description: "禁止使用非空断言（!），建议使用 Option 类型进行安全的空值处理",
		},
		messages: {
			noNonNullAssertion: buildErrorMessage({
				correctExample: `// ✅ 使用 Option 类型
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

function getUserName(user: User | null): O.Option<string> {
  return O.fromNullable(user?.name);
}

// 使用
pipe(
  getUserName(user),
  O.fold(
    () => '未知用户',
    (name) => name
  )
);

// ✅ 使用可选链和空值合并
const name = user?.name ?? '默认名称';

// ✅ 使用类型守卫
function processUser(user: User | null) {
  if (user === null) {
    return;
  }
  // 此处 user 类型已收窄为 User
  console.log(user.name);
}`,
				docRef: "#fp-patterns - Option 类型",
				incorrectExample: `// ❌ 使用非空断言
const name = user!.name;

// ❌ 链式非空断言
const value = obj!.prop!.value;

// ❌ 数组非空断言
const first = array![0];`,
				reason: `
  非空断言（!）绕过了 TypeScript 的空值检查：
  - 运行时可能抛出 null/undefined 错误
  - 隐藏了潜在的空值问题
  - 破坏了类型系统的安全性
  - 使代码难以维护和重构`,
				title: "禁止使用非空断言（!）",
			}),
		},
		schema: [],
		type: "problem",
	},
	name: "no-non-null-assertion",
})
