/**
 * @fileoverview Rule to prohibit object mutations and suggest immutable operations
 * @author Grain Team
 *
 * Requirements: 1.6-1.8, 19.1-19.7
 * - WHEN a developer mutates an object property directly THEN the ESLint_Plugin SHALL
 *   report an error with spread operator alternative
 * - WHEN Object.assign() mutates first argument THEN the ESLint_Plugin SHALL report an error
 * - WHEN delete operator is used THEN the ESLint_Plugin SHALL report an error
 * - WHEN Object.defineProperty is used THEN the ESLint_Plugin SHALL report an error
 */

import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"
import { buildComprehensiveErrorMessage } from "../../utils/message-builder.js"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`,
)

/**
 * 对象属性直接赋值的错误消息
 */
const NO_OBJECT_PROPERTY_ASSIGNMENT_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止直接修改对象属性",
	problemCode: `const user = { name: 'Alice', age: 25 };
user.age = 26;  // 直接修改对象`,
	reason: `直接修改对象属性违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数
  - 可能导致意外的副作用`,
	architecturePrinciple: `Grain 项目遵循不可变数据原则：
  - 对象一旦创建就不可修改
  - 更新操作返回新对象
  - 使用展开运算符或 Immer 进行更新`,
	steps: [
		"使用展开运算符创建新对象",
		"或使用 Immer 的 produce 函数",
		"对于深层嵌套，考虑使用 Immer",
	],
	correctExample: `// ❌ 错误做法
user.age = 26;

// ✅ 正确做法 - 使用展开运算符
const updatedUser = { ...user, age: 26 };

// ✅ 正确做法 - 嵌套对象
const updatedUser = {
  ...user,
  address: {
    ...user.address,
    city: 'New York',
  },
};

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updatedUser = produce(user, draft => {
  draft.age = 26;
  draft.address.city = 'New York';
});`,
	warnings: ["展开运算符只做浅拷贝，嵌套对象需要递归展开", "复杂更新推荐使用 Immer"],
	docRef: "#fp-patterns - 不可变更新",
	steeringFile: "#code-standards - 对象操作",
	relatedRules: ["no-mutation", "prefer-spread"],
})

/**
 * Object.assign 变异的错误消息
 */
const NO_OBJECT_ASSIGN_MUTATION_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用 Object.assign() 变异对象",
	problemCode: `const user = { name: 'Alice' };
Object.assign(user, { age: 25 });  // 修改原对象`,
	reason: `Object.assign() 的第一个参数会被修改：
  - 违反不可变性原则
  - 难以追踪变化来源
  - 可能导致意外的副作用`,
	architecturePrinciple: `使用展开运算符替代 Object.assign：
  - 展开运算符更清晰
  - 不会修改原对象
  - 类型推断更准确`,
	steps: [
		"将 Object.assign(target, source) 替换为 { ...target, ...source }",
		"确保第一个参数是空对象 {} 或使用展开运算符",
	],
	correctExample: `// ❌ 错误做法
Object.assign(user, { age: 25 });

// ✅ 正确做法 - 使用展开运算符
const updatedUser = { ...user, age: 25 };

// ✅ 正确做法 - 如果必须使用 Object.assign
const updatedUser = Object.assign({}, user, { age: 25 });

// ✅ 正确做法 - 合并多个对象
const merged = { ...obj1, ...obj2, ...obj3 };`,
	docRef: "#code-standards - 对象合并",
	steeringFile: "#fp-patterns - 不可变操作",
	relatedRules: ["no-object-mutation", "prefer-spread"],
})

/**
 * delete 操作符的错误消息
 */
const NO_DELETE_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用 delete 操作符",
	problemCode: `const user = { name: 'Alice', age: 25, temp: true };
delete user.temp;  // 修改原对象`,
	reason: `delete 操作符直接修改对象：
  - 违反不可变性原则
  - 改变对象的形状
  - 可能影响 V8 的隐藏类优化`,
	architecturePrinciple: `使用解构赋值移除属性：
  - 创建新对象，不修改原对象
  - 类型安全
  - 更清晰的意图表达`,
	steps: ["使用解构赋值提取要保留的属性", "或使用 omit 工具函数"],
	correctExample: `// ❌ 错误做法
delete user.temp;

// ✅ 正确做法 - 使用解构赋值
const { temp, ...userWithoutTemp } = user;

// ✅ 正确做法 - 移除多个属性
const { temp, internal, ...cleanUser } = user;

// ✅ 正确做法 - 使用 es-toolkit
import { omit } from 'es-toolkit';
const cleanUser = omit(user, ['temp', 'internal']);

// ✅ 正确做法 - 动态属性名
const { [keyToRemove]: _, ...rest } = obj;`,
	docRef: "#code-standards - 对象操作",
	steeringFile: "#fp-patterns - 不可变更新",
	relatedRules: ["no-object-mutation"],
})

/**
 * Object.defineProperty 的错误消息
 */
const NO_DEFINE_PROPERTY_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用 Object.defineProperty()",
	problemCode: `Object.defineProperty(obj, 'prop', {
  value: 42,
  writable: false,
});`,
	reason: `Object.defineProperty() 直接修改对象：
  - 违反不可变性原则
  - 通常用于元编程，在应用代码中不推荐
  - 可能导致难以调试的问题`,
	architecturePrinciple: `在函数式编程中避免元编程：
  - 使用类型系统定义对象形状
  - 使用 readonly 修饰符表示不可变
  - 避免运行时修改对象结构`,
	steps: [
		"考虑是否真的需要 defineProperty",
		"使用 TypeScript 的 readonly 替代",
		"如果需要计算属性，使用 getter 函数",
	],
	correctExample: `// ❌ 错误做法
Object.defineProperty(obj, 'fullName', {
  get() { return this.firstName + ' ' + this.lastName; }
});

// ✅ 正确做法 - 使用函数
const getFullName = (user: User): string =>
  \`\${user.firstName} \${user.lastName}\`;

// ✅ 正确做法 - 使用 TypeScript readonly
interface User {
  readonly id: string;
  readonly name: string;
}

// ✅ 正确做法 - 创建新对象
const userWithFullName = {
  ...user,
  fullName: \`\${user.firstName} \${user.lastName}\`,
};`,
	docRef: "#code-standards - 类型定义",
	steeringFile: "#fp-patterns - 避免元编程",
	relatedRules: ["no-object-mutation"],
})

/**
 * Object.setPrototypeOf 的错误消息
 */
const NO_SET_PROTOTYPE_MESSAGE = buildComprehensiveErrorMessage({
	title: "禁止使用 Object.setPrototypeOf()",
	problemCode: `Object.setPrototypeOf(obj, newProto);`,
	reason: `Object.setPrototypeOf() 修改对象原型链：
  - 严重的性能问题
  - 违反不可变性原则
  - 在函数式编程中不需要原型继承`,
	architecturePrinciple: `Grain 项目使用组合而非继承：
  - 使用函数组合
  - 使用接口定义类型
  - 避免原型链操作`,
	steps: ["重新设计，使用组合替代继承", "使用工厂函数创建对象"],
	correctExample: `// ❌ 错误做法
Object.setPrototypeOf(obj, newProto);

// ✅ 正确做法 - 使用组合
const createEnhancedUser = (user: User, extra: Extra): EnhancedUser => ({
  ...user,
  ...extra,
  getFullName: () => \`\${user.firstName} \${user.lastName}\`,
});

// ✅ 正确做法 - 使用工厂函数
const createUser = (data: UserData): User => ({
  ...data,
  createdAt: new Date(),
});`,
	docRef: "#code-standards - 组合优于继承",
	steeringFile: "#fp-patterns - 函数组合",
	relatedRules: ["no-object-mutation", "no-class"],
})

export default createRule({
	name: "no-object-mutation",
	meta: {
		type: "problem",
		docs: {
			description: "Prohibit object mutations and suggest immutable operations",
		},
		fixable: undefined,
		schema: [],
		messages: {
			noObjectPropertyAssignment: NO_OBJECT_PROPERTY_ASSIGNMENT_MESSAGE,
			noObjectAssignMutation: NO_OBJECT_ASSIGN_MUTATION_MESSAGE,
			noDelete: NO_DELETE_MESSAGE,
			noDefineProperty: NO_DEFINE_PROPERTY_MESSAGE,
			noSetPrototype: NO_SET_PROTOTYPE_MESSAGE,
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			// Detect object property assignment: obj.prop = value
			AssignmentExpression(node: TSESTree.AssignmentExpression) {
				if (
					node.operator === "=" &&
					node.left.type === "MemberExpression" &&
					!node.left.computed // obj.prop syntax (not obj[prop])
				) {
					// Skip if it's a variable declaration pattern
					// e.g., const obj = {}; obj.prop = value; in the same scope
					// This is a simplified check - we report all property assignments
					context.report({
						node,
						messageId: "noObjectPropertyAssignment",
					})
				}
			},

			// Detect Object.assign() with non-empty first argument
			CallExpression(node: TSESTree.CallExpression) {
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "Identifier" &&
					node.callee.object.name === "Object" &&
					node.callee.property.type === "Identifier"
				) {
					const methodName = node.callee.property.name

					switch (methodName) {
						case "assign":
							// Check if first argument is not an empty object literal
							if (node.arguments.length > 0) {
								const firstArg = node.arguments[0]
								const isEmptyObject =
									firstArg.type === "ObjectExpression" && firstArg.properties.length === 0

								if (!isEmptyObject) {
									context.report({
										node,
										messageId: "noObjectAssignMutation",
									})
								}
							}
							break

						case "defineProperty":
						case "defineProperties":
							context.report({
								node,
								messageId: "noDefineProperty",
							})
							break

						case "setPrototypeOf":
							context.report({
								node,
								messageId: "noSetPrototype",
							})
							break
					}
				}
			},

			// Detect delete operator
			UnaryExpression(node: TSESTree.UnaryExpression) {
				if (node.operator === "delete") {
					context.report({
						node,
						messageId: "noDelete",
					})
				}
			},
		}
	},
})
