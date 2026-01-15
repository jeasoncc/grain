/**
 * AST 辅助函数
 * AST helper functions for ESLint rule development
 */

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils"

/**
 * 检查节点是否为特定方法调用
 */
export function isMethodCall(
	node: TSESTree.CallExpression,
	objectName: string,
	methodName: string,
): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.Identifier &&
		node.callee.object.name === objectName &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === methodName
	)
}

/**
 * 检查节点是否为特定全局标识符
 */
export function isGlobalIdentifier(node: TSESTree.Node, name: string): boolean {
	return node.type === AST_NODE_TYPES.Identifier && node.name === name
}

/**
 * 检查节点是否为成员表达式调用特定方法
 */
export function isMemberMethodCall(node: TSESTree.CallExpression, methodName: string): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === methodName
	)
}

/**
 * 获取成员表达式的方法名
 */
export function getMemberMethodName(node: TSESTree.CallExpression): string | null {
	if (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier
	) {
		return node.callee.property.name
	}
	return null
}

/**
 * 获取成员表达式的对象名
 */
export function getMemberObjectName(node: TSESTree.CallExpression): string | null {
	if (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.Identifier
	) {
		return node.callee.object.name
	}
	return null
}

/**
 * 检查函数是否为异步函数
 */
export function isAsyncFunction(node: TSESTree.Node): boolean {
	return (
		(node.type === AST_NODE_TYPES.FunctionDeclaration ||
			node.type === AST_NODE_TYPES.FunctionExpression ||
			node.type === AST_NODE_TYPES.ArrowFunctionExpression) &&
		node.async === true
	)
}

/**
 * 检查节点是否在异步函数内
 */
export function isInsideAsyncFunction(node: TSESTree.Node): boolean {
	let current: TSESTree.Node | undefined = node.parent
	while (current) {
		if (isAsyncFunction(current)) {
			return true
		}
		current = current.parent
	}
	return false
}

/**
 * 获取函数调用的深度
 */
export function getCallExpressionDepth(node: TSESTree.CallExpression): number {
	let depth = 1
	let current: TSESTree.Node = node.callee

	while (current.type === AST_NODE_TYPES.CallExpression) {
		depth++
		current = (current as TSESTree.CallExpression).callee
	}

	return depth
}

/**
 * 检查节点是否为 try-catch 语句
 */
export function isTryCatchStatement(node: TSESTree.Node): node is TSESTree.TryStatement {
	return node.type === AST_NODE_TYPES.TryStatement
}

/**
 * 检查节点是否为 throw 语句
 */
export function isThrowStatement(node: TSESTree.Node): node is TSESTree.ThrowStatement {
	return node.type === AST_NODE_TYPES.ThrowStatement
}

/**
 * 检查节点是否为 await 表达式
 */
export function isAwaitExpression(node: TSESTree.Node): node is TSESTree.AwaitExpression {
	return node.type === AST_NODE_TYPES.AwaitExpression
}

/**
 * 检查节点是否为 new Promise() 调用
 */
export function isNewPromise(node: TSESTree.NewExpression): boolean {
	return node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === "Promise"
}

/**
 * 检查节点是否为 Promise 方法调用
 */
export function isPromiseMethodCall(node: TSESTree.CallExpression, methodName: string): boolean {
	// Promise.then(), Promise.catch(), etc.
	if (isMethodCall(node, "Promise", methodName)) {
		return true
	}

	// somePromise.then(), somePromise.catch()
	if (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === methodName
	) {
		return true
	}

	return false
}

/**
 * 检查节点是否为赋值表达式
 */
export function isAssignmentExpression(node: TSESTree.Node): node is TSESTree.AssignmentExpression {
	return node.type === AST_NODE_TYPES.AssignmentExpression
}

/**
 * 检查节点是否为对象属性赋值
 */
export function isObjectPropertyAssignment(node: TSESTree.AssignmentExpression): boolean {
	return node.left.type === AST_NODE_TYPES.MemberExpression
}

/**
 * 检查节点是否为数组索引赋值
 */
export function isArrayIndexAssignment(node: TSESTree.AssignmentExpression): boolean {
	return node.left.type === AST_NODE_TYPES.MemberExpression && node.left.computed === true
}

/**
 * 获取函数的参数数量
 */
export function getFunctionParamCount(
	node:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
): number {
	return node.params.length
}

/**
 * 获取函数的行数
 */
export function getFunctionLineCount(node: TSESTree.Node): number {
	if (!node.loc) return 0
	return node.loc.end.line - node.loc.start.line + 1
}

/**
 * 获取节点的嵌套深度
 */
export function getNestingDepth(node: TSESTree.Node): number {
	let depth = 0
	let current: TSESTree.Node | undefined = node.parent

	const nestingTypes = new Set([
		AST_NODE_TYPES.IfStatement,
		AST_NODE_TYPES.ForStatement,
		AST_NODE_TYPES.ForInStatement,
		AST_NODE_TYPES.ForOfStatement,
		AST_NODE_TYPES.WhileStatement,
		AST_NODE_TYPES.DoWhileStatement,
		AST_NODE_TYPES.SwitchStatement,
		AST_NODE_TYPES.TryStatement,
	])

	while (current) {
		if (nestingTypes.has(current.type as AST_NODE_TYPES)) {
			depth++
		}
		current = current.parent
	}

	return depth
}

/**
 * 检查节点是否为 JSX 元素
 */
export function isJSXElement(node: TSESTree.Node): boolean {
	return node.type === AST_NODE_TYPES.JSXElement || node.type === AST_NODE_TYPES.JSXFragment
}

/**
 * 检查节点是否在 JSX 属性中
 */
export function isInsideJSXAttribute(node: TSESTree.Node): boolean {
	let current: TSESTree.Node | undefined = node.parent
	while (current) {
		if (current.type === AST_NODE_TYPES.JSXAttribute) {
			return true
		}
		current = current.parent
	}
	return false
}

/**
 * 获取导入声明的源路径
 */
export function getImportSource(node: TSESTree.ImportDeclaration): string {
	return node.source.value
}

/**
 * 检查是否为默认导入
 */
export function hasDefaultImport(node: TSESTree.ImportDeclaration): boolean {
	return node.specifiers.some((spec) => spec.type === AST_NODE_TYPES.ImportDefaultSpecifier)
}

/**
 * 检查是否为命名导入
 */
export function hasNamedImports(node: TSESTree.ImportDeclaration): boolean {
	return node.specifiers.some((spec) => spec.type === AST_NODE_TYPES.ImportSpecifier)
}

/**
 * 获取所有命名导入的名称
 */
export function getNamedImports(node: TSESTree.ImportDeclaration): string[] {
	return node.specifiers
		.filter(
			(spec): spec is TSESTree.ImportSpecifier => spec.type === AST_NODE_TYPES.ImportSpecifier,
		)
		.map((spec) =>
			spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : spec.imported.value,
		)
}

/**
 * 检查节点是否为 console 方法调用
 */
export function isConsoleCall(node: TSESTree.CallExpression): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.Identifier &&
		node.callee.object.name === "console"
	)
}

/**
 * 获取 console 调用的方法名
 */
export function getConsoleMethodName(node: TSESTree.CallExpression): string | null {
	if (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.Identifier &&
		node.callee.object.name === "console" &&
		node.callee.property.type === AST_NODE_TYPES.Identifier
	) {
		return node.callee.property.name
	}
	return null
}

/**
 * 检查节点是否为 eval 调用
 */
export function isEvalCall(node: TSESTree.CallExpression): boolean {
	return node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === "eval"
}

/**
 * 检查节点是否为 Function 构造函数调用
 */
export function isFunctionConstructor(node: TSESTree.NewExpression): boolean {
	return node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === "Function"
}

/**
 * 检查节点是否为 innerHTML/outerHTML 赋值
 */
export function isInnerHTMLAssignment(node: TSESTree.AssignmentExpression): boolean {
	return (
		node.left.type === AST_NODE_TYPES.MemberExpression &&
		node.left.property.type === AST_NODE_TYPES.Identifier &&
		(node.left.property.name === "innerHTML" || node.left.property.name === "outerHTML")
	)
}

/**
 * 检查节点是否为 dangerouslySetInnerHTML 属性
 */
export function isDangerouslySetInnerHTML(node: TSESTree.JSXAttribute): boolean {
	return (
		node.name.type === AST_NODE_TYPES.JSXIdentifier && node.name.name === "dangerouslySetInnerHTML"
	)
}

/**
 * 获取函数名称
 */
export function getFunctionName(
	node:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
): string | null {
	if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
		return node.id.name
	}

	// 检查父节点是否为变量声明
	if (node.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
		const declarator = node.parent as TSESTree.VariableDeclarator
		if (declarator.id.type === AST_NODE_TYPES.Identifier) {
			return declarator.id.name
		}
	}

	return null
}

/**
 * 检查是否为 React 组件（函数组件）
 */
export function isReactFunctionComponent(
	node:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
): boolean {
	const name = getFunctionName(node)
	if (!name) return false

	// 组件名以大写字母开头
	if (!/^[A-Z]/.test(name)) return false

	// 检查是否返回 JSX
	// 这是一个简化的检查，实际可能需要更复杂的逻辑
	return true
}

/**
 * 检查节点是否在测试文件中
 */
export function isInTestFile(filename: string): boolean {
	return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename)
}
