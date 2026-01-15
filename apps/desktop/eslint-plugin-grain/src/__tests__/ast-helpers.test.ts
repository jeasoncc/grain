/**
 * AST Helpers 单元测试
 * Tests for ast-helpers utility functions
 */

import type { TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES } from "@typescript-eslint/utils"
import { describe, expect, it } from "vitest"
import {
	getConsoleMethodName,
	getFunctionLineCount,
	getFunctionParamCount,
	getImportSource,
	getMemberMethodName,
	getMemberObjectName,
	getNamedImports,
	hasDefaultImport,
	hasNamedImports,
	isArrayIndexAssignment,
	isAssignmentExpression,
	isAsyncFunction,
	isAwaitExpression,
	isConsoleCall,
	isEvalCall,
	isFunctionConstructor,
	isGlobalIdentifier,
	isInnerHTMLAssignment,
	isInTestFile,
	isJSXElement,
	isMemberMethodCall,
	isMethodCall,
	isNewPromise,
	isObjectPropertyAssignment,
	isThrowStatement,
	isTryCatchStatement,
} from "../utils/ast-helpers.js"

// Helper to create mock nodes
function createMockIdentifier(name: string): TSESTree.Identifier {
	return {
		type: AST_NODE_TYPES.Identifier,
		name,
		range: [0, name.length],
		loc: { start: { line: 1, column: 0 }, end: { line: 1, column: name.length } },
	} as TSESTree.Identifier
}

function createMockMemberExpression(
	objectName: string,
	propertyName: string,
): TSESTree.MemberExpression {
	return {
		type: AST_NODE_TYPES.MemberExpression,
		object: createMockIdentifier(objectName),
		property: createMockIdentifier(propertyName),
		computed: false,
		optional: false,
		range: [0, 10],
		loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
	} as TSESTree.MemberExpression
}

function createMockCallExpression(callee: TSESTree.Expression): TSESTree.CallExpression {
	return {
		type: AST_NODE_TYPES.CallExpression,
		callee,
		arguments: [],
		optional: false,
		range: [0, 10],
		loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
	} as TSESTree.CallExpression
}

describe("isMethodCall", () => {
	it("should detect method calls on specific objects", () => {
		const memberExpr = createMockMemberExpression("console", "log")
		const callExpr = createMockCallExpression(memberExpr)

		expect(isMethodCall(callExpr, "console", "log")).toBe(true)
		expect(isMethodCall(callExpr, "console", "error")).toBe(false)
		expect(isMethodCall(callExpr, "window", "log")).toBe(false)
	})

	it("should return false for non-member expression calls", () => {
		const identifier = createMockIdentifier("someFunction")
		const callExpr = createMockCallExpression(identifier)

		expect(isMethodCall(callExpr, "console", "log")).toBe(false)
	})
})

describe("isGlobalIdentifier", () => {
	it("should detect global identifiers", () => {
		const node = createMockIdentifier("window")
		expect(isGlobalIdentifier(node, "window")).toBe(true)
		expect(isGlobalIdentifier(node, "document")).toBe(false)
	})

	it("should return false for non-identifier nodes", () => {
		const memberExpr = createMockMemberExpression("obj", "prop")
		expect(isGlobalIdentifier(memberExpr, "obj")).toBe(false)
	})
})

describe("isMemberMethodCall", () => {
	it("should detect member method calls", () => {
		const memberExpr = createMockMemberExpression("arr", "push")
		const callExpr = createMockCallExpression(memberExpr)

		expect(isMemberMethodCall(callExpr, "push")).toBe(true)
		expect(isMemberMethodCall(callExpr, "pop")).toBe(false)
	})
})

describe("getMemberMethodName", () => {
	it("should get method name from member expression call", () => {
		const memberExpr = createMockMemberExpression("arr", "push")
		const callExpr = createMockCallExpression(memberExpr)

		expect(getMemberMethodName(callExpr)).toBe("push")
	})

	it("should return null for non-member expression calls", () => {
		const identifier = createMockIdentifier("someFunction")
		const callExpr = createMockCallExpression(identifier)

		expect(getMemberMethodName(callExpr)).toBeNull()
	})
})

describe("getMemberObjectName", () => {
	it("should get object name from member expression call", () => {
		const memberExpr = createMockMemberExpression("console", "log")
		const callExpr = createMockCallExpression(memberExpr)

		expect(getMemberObjectName(callExpr)).toBe("console")
	})

	it("should return null for non-member expression calls", () => {
		const identifier = createMockIdentifier("someFunction")
		const callExpr = createMockCallExpression(identifier)

		expect(getMemberObjectName(callExpr)).toBeNull()
	})
})

describe("isAsyncFunction", () => {
	it("should detect async function declarations", () => {
		const asyncFn: Partial<TSESTree.FunctionDeclaration> = {
			type: AST_NODE_TYPES.FunctionDeclaration,
			async: true,
		}
		const syncFn: Partial<TSESTree.FunctionDeclaration> = {
			type: AST_NODE_TYPES.FunctionDeclaration,
			async: false,
		}

		expect(isAsyncFunction(asyncFn as TSESTree.FunctionDeclaration)).toBe(true)
		expect(isAsyncFunction(syncFn as TSESTree.FunctionDeclaration)).toBe(false)
	})

	it("should detect async arrow functions", () => {
		const asyncArrow: Partial<TSESTree.ArrowFunctionExpression> = {
			type: AST_NODE_TYPES.ArrowFunctionExpression,
			async: true,
		}

		expect(isAsyncFunction(asyncArrow as TSESTree.ArrowFunctionExpression)).toBe(true)
	})

	it("should return false for non-function nodes", () => {
		const identifier = createMockIdentifier("test")
		expect(isAsyncFunction(identifier)).toBe(false)
	})
})

describe("isTryCatchStatement", () => {
	it("should detect try-catch statements", () => {
		const tryStmt: Partial<TSESTree.TryStatement> = {
			type: AST_NODE_TYPES.TryStatement,
		}
		const ifStmt: Partial<TSESTree.IfStatement> = {
			type: AST_NODE_TYPES.IfStatement,
		}

		expect(isTryCatchStatement(tryStmt as TSESTree.TryStatement)).toBe(true)
		expect(isTryCatchStatement(ifStmt as TSESTree.IfStatement)).toBe(false)
	})
})

describe("isThrowStatement", () => {
	it("should detect throw statements", () => {
		const throwStmt: Partial<TSESTree.ThrowStatement> = {
			type: AST_NODE_TYPES.ThrowStatement,
		}
		const returnStmt: Partial<TSESTree.ReturnStatement> = {
			type: AST_NODE_TYPES.ReturnStatement,
		}

		expect(isThrowStatement(throwStmt as TSESTree.ThrowStatement)).toBe(true)
		expect(isThrowStatement(returnStmt as TSESTree.ReturnStatement)).toBe(false)
	})
})

describe("isAwaitExpression", () => {
	it("should detect await expressions", () => {
		const awaitExpr: Partial<TSESTree.AwaitExpression> = {
			type: AST_NODE_TYPES.AwaitExpression,
		}
		const callExpr: Partial<TSESTree.CallExpression> = {
			type: AST_NODE_TYPES.CallExpression,
		}

		expect(isAwaitExpression(awaitExpr as TSESTree.AwaitExpression)).toBe(true)
		expect(isAwaitExpression(callExpr as TSESTree.CallExpression)).toBe(false)
	})
})

describe("isNewPromise", () => {
	it("should detect new Promise() calls", () => {
		const promiseNew: TSESTree.NewExpression = {
			type: AST_NODE_TYPES.NewExpression,
			callee: createMockIdentifier("Promise"),
			arguments: [],
			range: [0, 10],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
		} as TSESTree.NewExpression

		const otherNew: TSESTree.NewExpression = {
			type: AST_NODE_TYPES.NewExpression,
			callee: createMockIdentifier("Date"),
			arguments: [],
			range: [0, 10],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
		} as TSESTree.NewExpression

		expect(isNewPromise(promiseNew)).toBe(true)
		expect(isNewPromise(otherNew)).toBe(false)
	})
})

describe("isAssignmentExpression", () => {
	it("should detect assignment expressions", () => {
		const assignExpr: Partial<TSESTree.AssignmentExpression> = {
			type: AST_NODE_TYPES.AssignmentExpression,
		}
		const binaryExpr: Partial<TSESTree.BinaryExpression> = {
			type: AST_NODE_TYPES.BinaryExpression,
		}

		expect(isAssignmentExpression(assignExpr as TSESTree.AssignmentExpression)).toBe(true)
		expect(isAssignmentExpression(binaryExpr as TSESTree.BinaryExpression)).toBe(false)
	})
})

describe("isObjectPropertyAssignment", () => {
	it("should detect object property assignments", () => {
		const memberExpr = createMockMemberExpression("obj", "prop")
		const assignExpr: TSESTree.AssignmentExpression = {
			type: AST_NODE_TYPES.AssignmentExpression,
			operator: "=",
			left: memberExpr,
			right: createMockIdentifier("value"),
			range: [0, 10],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
		} as TSESTree.AssignmentExpression

		expect(isObjectPropertyAssignment(assignExpr)).toBe(true)
	})

	it("should return false for simple variable assignments", () => {
		const assignExpr: TSESTree.AssignmentExpression = {
			type: AST_NODE_TYPES.AssignmentExpression,
			operator: "=",
			left: createMockIdentifier("x"),
			right: createMockIdentifier("value"),
			range: [0, 10],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
		} as TSESTree.AssignmentExpression

		expect(isObjectPropertyAssignment(assignExpr)).toBe(false)
	})
})

describe("isArrayIndexAssignment", () => {
	it("should detect array index assignments", () => {
		const computedMember: TSESTree.MemberExpression = {
			type: AST_NODE_TYPES.MemberExpression,
			object: createMockIdentifier("arr"),
			property: createMockIdentifier("i"),
			computed: true,
			optional: false,
			range: [0, 10],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
		} as TSESTree.MemberExpression

		const assignExpr: TSESTree.AssignmentExpression = {
			type: AST_NODE_TYPES.AssignmentExpression,
			operator: "=",
			left: computedMember,
			right: createMockIdentifier("value"),
			range: [0, 10],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
		} as TSESTree.AssignmentExpression

		expect(isArrayIndexAssignment(assignExpr)).toBe(true)
	})
})

describe("getFunctionParamCount", () => {
	it("should count function parameters", () => {
		const fn: Partial<TSESTree.FunctionDeclaration> = {
			type: AST_NODE_TYPES.FunctionDeclaration,
			params: [createMockIdentifier("a"), createMockIdentifier("b"), createMockIdentifier("c")],
		}

		expect(getFunctionParamCount(fn as TSESTree.FunctionDeclaration)).toBe(3)
	})

	it("should return 0 for functions with no parameters", () => {
		const fn: Partial<TSESTree.FunctionDeclaration> = {
			type: AST_NODE_TYPES.FunctionDeclaration,
			params: [],
		}

		expect(getFunctionParamCount(fn as TSESTree.FunctionDeclaration)).toBe(0)
	})
})

describe("getFunctionLineCount", () => {
	it("should calculate function line count", () => {
		const fn: Partial<TSESTree.FunctionDeclaration> = {
			type: AST_NODE_TYPES.FunctionDeclaration,
			loc: {
				start: { line: 1, column: 0 },
				end: { line: 10, column: 0 },
			},
		}

		expect(getFunctionLineCount(fn as TSESTree.FunctionDeclaration)).toBe(10)
	})

	it("should return 0 for nodes without loc", () => {
		const fn: Partial<TSESTree.FunctionDeclaration> = {
			type: AST_NODE_TYPES.FunctionDeclaration,
		}

		expect(getFunctionLineCount(fn as TSESTree.FunctionDeclaration)).toBe(0)
	})
})

describe("isJSXElement", () => {
	it("should detect JSX elements", () => {
		const jsxElement: Partial<TSESTree.JSXElement> = {
			type: AST_NODE_TYPES.JSXElement,
		}
		const jsxFragment: Partial<TSESTree.JSXFragment> = {
			type: AST_NODE_TYPES.JSXFragment,
		}
		const identifier = createMockIdentifier("div")

		expect(isJSXElement(jsxElement as TSESTree.JSXElement)).toBe(true)
		expect(isJSXElement(jsxFragment as TSESTree.JSXFragment)).toBe(true)
		expect(isJSXElement(identifier)).toBe(false)
	})
})

describe("Import helpers", () => {
	const createMockImportDeclaration = (
		source: string,
		specifiers: TSESTree.ImportClause[],
	): TSESTree.ImportDeclaration =>
		({
			type: AST_NODE_TYPES.ImportDeclaration,
			source: {
				type: AST_NODE_TYPES.Literal,
				value: source,
				raw: `'${source}'`,
				range: [0, source.length + 2],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: source.length + 2 } },
			} as TSESTree.StringLiteral,
			specifiers,
			importKind: "value",
			range: [0, 20],
			loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
		}) as TSESTree.ImportDeclaration

	describe("getImportSource", () => {
		it("should get import source path", () => {
			const importDecl = createMockImportDeclaration("react", [])
			expect(getImportSource(importDecl)).toBe("react")
		})
	})

	describe("hasDefaultImport", () => {
		it("should detect default imports", () => {
			const defaultSpec: TSESTree.ImportDefaultSpecifier = {
				type: AST_NODE_TYPES.ImportDefaultSpecifier,
				local: createMockIdentifier("React"),
				range: [0, 5],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
			} as TSESTree.ImportDefaultSpecifier

			const importDecl = createMockImportDeclaration("react", [defaultSpec])
			expect(hasDefaultImport(importDecl)).toBe(true)
		})

		it("should return false for named imports only", () => {
			const namedSpec: TSESTree.ImportSpecifier = {
				type: AST_NODE_TYPES.ImportSpecifier,
				local: createMockIdentifier("useState"),
				imported: createMockIdentifier("useState"),
				importKind: "value",
				range: [0, 8],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 8 } },
			} as TSESTree.ImportSpecifier

			const importDecl = createMockImportDeclaration("react", [namedSpec])
			expect(hasDefaultImport(importDecl)).toBe(false)
		})
	})

	describe("hasNamedImports", () => {
		it("should detect named imports", () => {
			const namedSpec: TSESTree.ImportSpecifier = {
				type: AST_NODE_TYPES.ImportSpecifier,
				local: createMockIdentifier("useState"),
				imported: createMockIdentifier("useState"),
				importKind: "value",
				range: [0, 8],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 8 } },
			} as TSESTree.ImportSpecifier

			const importDecl = createMockImportDeclaration("react", [namedSpec])
			expect(hasNamedImports(importDecl)).toBe(true)
		})
	})

	describe("getNamedImports", () => {
		it("should get named import names", () => {
			const spec1: TSESTree.ImportSpecifier = {
				type: AST_NODE_TYPES.ImportSpecifier,
				local: createMockIdentifier("useState"),
				imported: createMockIdentifier("useState"),
				importKind: "value",
				range: [0, 8],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 8 } },
			} as TSESTree.ImportSpecifier

			const spec2: TSESTree.ImportSpecifier = {
				type: AST_NODE_TYPES.ImportSpecifier,
				local: createMockIdentifier("useEffect"),
				imported: createMockIdentifier("useEffect"),
				importKind: "value",
				range: [0, 9],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 9 } },
			} as TSESTree.ImportSpecifier

			const importDecl = createMockImportDeclaration("react", [spec1, spec2])
			expect(getNamedImports(importDecl)).toEqual(["useState", "useEffect"])
		})
	})
})

describe("Console helpers", () => {
	describe("isConsoleCall", () => {
		it("should detect console calls", () => {
			const memberExpr = createMockMemberExpression("console", "log")
			const callExpr = createMockCallExpression(memberExpr)

			expect(isConsoleCall(callExpr)).toBe(true)
		})

		it("should return false for non-console calls", () => {
			const memberExpr = createMockMemberExpression("logger", "log")
			const callExpr = createMockCallExpression(memberExpr)

			expect(isConsoleCall(callExpr)).toBe(false)
		})
	})

	describe("getConsoleMethodName", () => {
		it("should get console method name", () => {
			const memberExpr = createMockMemberExpression("console", "error")
			const callExpr = createMockCallExpression(memberExpr)

			expect(getConsoleMethodName(callExpr)).toBe("error")
		})

		it("should return null for non-console calls", () => {
			const identifier = createMockIdentifier("log")
			const callExpr = createMockCallExpression(identifier)

			expect(getConsoleMethodName(callExpr)).toBeNull()
		})
	})
})

describe("Security helpers", () => {
	describe("isEvalCall", () => {
		it("should detect eval calls", () => {
			const evalId = createMockIdentifier("eval")
			const callExpr = createMockCallExpression(evalId)

			expect(isEvalCall(callExpr)).toBe(true)
		})

		it("should return false for non-eval calls", () => {
			const otherId = createMockIdentifier("someFunction")
			const callExpr = createMockCallExpression(otherId)

			expect(isEvalCall(callExpr)).toBe(false)
		})
	})

	describe("isFunctionConstructor", () => {
		it("should detect Function constructor calls", () => {
			const funcNew: TSESTree.NewExpression = {
				type: AST_NODE_TYPES.NewExpression,
				callee: createMockIdentifier("Function"),
				arguments: [],
				range: [0, 10],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
			} as TSESTree.NewExpression

			expect(isFunctionConstructor(funcNew)).toBe(true)
		})

		it("should return false for other constructors", () => {
			const otherNew: TSESTree.NewExpression = {
				type: AST_NODE_TYPES.NewExpression,
				callee: createMockIdentifier("Date"),
				arguments: [],
				range: [0, 10],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
			} as TSESTree.NewExpression

			expect(isFunctionConstructor(otherNew)).toBe(false)
		})
	})

	describe("isInnerHTMLAssignment", () => {
		it("should detect innerHTML assignments", () => {
			const memberExpr: TSESTree.MemberExpression = {
				type: AST_NODE_TYPES.MemberExpression,
				object: createMockIdentifier("element"),
				property: createMockIdentifier("innerHTML"),
				computed: false,
				optional: false,
				range: [0, 10],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
			} as TSESTree.MemberExpression

			const assignExpr: TSESTree.AssignmentExpression = {
				type: AST_NODE_TYPES.AssignmentExpression,
				operator: "=",
				left: memberExpr,
				right: createMockIdentifier("html"),
				range: [0, 20],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
			} as TSESTree.AssignmentExpression

			expect(isInnerHTMLAssignment(assignExpr)).toBe(true)
		})

		it("should detect outerHTML assignments", () => {
			const memberExpr: TSESTree.MemberExpression = {
				type: AST_NODE_TYPES.MemberExpression,
				object: createMockIdentifier("element"),
				property: createMockIdentifier("outerHTML"),
				computed: false,
				optional: false,
				range: [0, 10],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
			} as TSESTree.MemberExpression

			const assignExpr: TSESTree.AssignmentExpression = {
				type: AST_NODE_TYPES.AssignmentExpression,
				operator: "=",
				left: memberExpr,
				right: createMockIdentifier("html"),
				range: [0, 20],
				loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
			} as TSESTree.AssignmentExpression

			expect(isInnerHTMLAssignment(assignExpr)).toBe(true)
		})
	})
})

describe("isInTestFile", () => {
	it("should detect test files", () => {
		expect(isInTestFile("component.test.ts")).toBe(true)
		expect(isInTestFile("component.spec.tsx")).toBe(true)
		expect(isInTestFile("utils.test.js")).toBe(true)
		expect(isInTestFile("helper.spec.jsx")).toBe(true)
	})

	it("should return false for non-test files", () => {
		expect(isInTestFile("component.ts")).toBe(false)
		expect(isInTestFile("test-utils.ts")).toBe(false)
		expect(isInTestFile("testing.ts")).toBe(false)
	})
})
