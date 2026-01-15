/**
 * @fileoverview Rule to prohibit array mutations and suggest immutable operations
 * @author Grain Team
 *
 * Requirements: 1.5, 18.1-18.7
 * - WHEN a developer mutates an array using push/pop/shift/unshift/splice/reverse
 *   THEN the ESLint_Plugin SHALL report an error with immutable alternatives
 * - WHEN array.sort() is used without spread copy THEN the ESLint_Plugin SHALL report an error
 * - WHEN forEach is used THEN the ESLint_Plugin SHALL report an error suggesting map/filter
 * - WHEN array index assignment (arr[i] = x) is used THEN the ESLint_Plugin SHALL report an error
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { ARRAY_MUTATION_METHODS } from "../../types/config.types.js"
import {
	buildComprehensiveErrorMessage,
	getImmutableArrayAlternative,
} from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

/**
 * 数组变异方法的错误消息生成器
 */
const getArrayMutationMessage = (method: string) =>
	buildComprehensiveErrorMessage({
		title: `禁止使用 array.${method}()`,
		problemCode: `const items = [1, 2, 3];
items.${method}(${method === "push" || method === "unshift" ? "4" : ""});`,
		reason: `array.${method}() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数`,
		architecturePrinciple: `Grain 项目遵循不可变数据原则：
  - 数据一旦创建就不可修改
  - 更新操作返回新数组
  - 使用展开运算符或 fp-ts/Array 的函数式方法`,
		steps: [
			`将 ${method}() 替换为不可变操作`,
			"使用展开运算符创建新数组",
			"或使用 fp-ts/Array 的函数式方法",
		],
		correctExample: getImmutableArrayAlternative(method, "array"),
		warnings: ["确保不要在原数组上调用任何变异方法", "如果需要排序，先复制数组：[...array].sort()"],
		docRef: "#code-standards - 不可变性",
		steeringFile: "#fp-patterns - 不可变数据",
		relatedRules: ["no-object-mutation", "prefer-spread"],
	})

/**
 * forEach 的错误消息
 */
const NO_FOREACH_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用 array.forEach()",
	problemCode: `const results: string[] = [];
items.forEach(item => {
  results.push(item.name);  // 副作用！
});`,
	reason: `forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图`,
	architecturePrinciple: `使用声明式数组方法：
  - map: 转换每个元素
  - filter: 筛选元素
  - reduce: 聚合为单个值
  - flatMap: 转换并展平`,
	steps: [
		"分析 forEach 的实际用途",
		"如果是转换，使用 map",
		"如果是筛选，使用 filter",
		"如果是聚合，使用 reduce",
	],
	correctExample: `// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);`,
	docRef: "#fp-patterns - 数组操作",
	steeringFile: "#code-standards - 声明式编程",
	relatedRules: ["no-mutation", "prefer-map"],
})

/**
 * 数组索引赋值的错误消息
 */
const NO_ARRAY_INDEX_ASSIGNMENT_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用数组索引赋值",
	problemCode: `const items = [1, 2, 3];
items[1] = 10;  // 直接修改数组`,
	reason: `数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染`,
	architecturePrinciple: `使用不可变更新模式：
  - 使用 map 更新特定索引
  - 使用展开运算符创建新数组
  - 使用 Immer 进行复杂更新`,
	steps: ["确定要更新的索引", "使用 map 或展开运算符创建新数组", "复杂更新考虑使用 Immer"],
	correctExample: `// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);`,
	docRef: "#fp-patterns - 不可变更新",
	steeringFile: "#code-standards - 数组操作",
	relatedRules: ["no-mutation", "no-object-mutation"],
})

/**
 * sort 不带复制的错误消息
 */
const NO_SORT_IN_PLACE_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用 array.sort() 原地排序",
	problemCode: `const items = [3, 1, 2];
items.sort();  // 修改原数组`,
	reason: `array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化`,
	architecturePrinciple: `排序时先复制数组：
  - 使用 [...array].sort()
  - 或使用 fp-ts/Array 的 sort 函数`,
	steps: ["在调用 sort 前复制数组", "或使用 fp-ts 的排序函数"],
	correctExample: `// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));`,
	docRef: "#fp-patterns - 排序",
	steeringFile: "#code-standards - 不可变操作",
	relatedRules: ["no-mutation"],
})

export default createRule({
	name: "no-mutation",
	meta: {
		type: "problem",
		docs: {
			description: "Prohibit array mutations and suggest immutable operations",
		},
		fixable: undefined,
		schema: [],
		messages: {
			noArrayPush: getArrayMutationMessage("push"),
			noArrayPop: getArrayMutationMessage("pop"),
			noArrayShift: getArrayMutationMessage("shift"),
			noArrayUnshift: getArrayMutationMessage("unshift"),
			noArraySplice: getArrayMutationMessage("splice"),
			noArrayReverse: getArrayMutationMessage("reverse"),
			noArrayFill: getArrayMutationMessage("fill"),
			noArrayCopyWithin: getArrayMutationMessage("copyWithin"),
			noArraySort: NO_SORT_IN_PLACE_MESSAGE,
			noForEach: NO_FOREACH_MESSAGE,
			noArrayIndexAssignment: NO_ARRAY_INDEX_ASSIGNMENT_MESSAGE,
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node: TSESTree.CallExpression) {
				if (node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier") {
					const methodName = node.callee.property.name

					// Check for array mutation methods
					if (
						ARRAY_MUTATION_METHODS.includes(methodName as (typeof ARRAY_MUTATION_METHODS)[number])
					) {
						const messageIdMap: Record<
							string,
							| "noArrayPush"
							| "noArrayPop"
							| "noArrayShift"
							| "noArrayUnshift"
							| "noArraySplice"
							| "noArrayReverse"
							| "noArrayFill"
							| "noArrayCopyWithin"
							| "noArraySort"
						> = {
							push: "noArrayPush",
							pop: "noArrayPop",
							shift: "noArrayShift",
							unshift: "noArrayUnshift",
							splice: "noArraySplice",
							reverse: "noArrayReverse",
							fill: "noArrayFill",
							copyWithin: "noArrayCopyWithin",
							sort: "noArraySort",
						}

						const messageId = messageIdMap[methodName]
						if (messageId) {
							context.report({ node, messageId })
						}
					}

					// Check for forEach
					if (methodName === "forEach") {
						context.report({ node, messageId: "noForEach" })
					}
				}
			},

			AssignmentExpression(node: TSESTree.AssignmentExpression) {
				// Check for array index assignment: arr[i] = value
				if (
					node.operator === "=" &&
					node.left.type === "MemberExpression" &&
					node.left.computed === true // arr[i] syntax
				) {
					// Check if it looks like array index access (numeric or variable index)
					const property = node.left.property
					const isNumericIndex = property.type === "Literal" && typeof property.value === "number"
					const isVariableIndex = property.type === "Identifier"

					if (isNumericIndex || isVariableIndex) {
						context.report({
							node,
							messageId: "noArrayIndexAssignment",
						})
					}
				}
			},
		}
	},
})
