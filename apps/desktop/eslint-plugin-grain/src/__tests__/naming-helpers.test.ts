/**
 * Naming Helpers 单元测试
 * Tests for naming-helpers utility functions
 */

import { describe, expect, it } from "vitest"
import {
	camelToKebab,
	camelToScreamingSnake,
	getBooleanNameIssue,
	getConstantNameIssue,
	getEventHandlerNameIssue,
	getFunctionNameIssue,
	getVariableNameIssue,
	hasValidBooleanPrefix,
	hasValidEventHandlerPrefix,
	isCamelCase,
	isKebabCase,
	isPascalCase,
	isPrivateName,
	isScreamingSnakeCase,
	isSnakeCase,
	isValidComponentName,
	isValidDirectoryName,
	isValidFileName,
	isValidHookName,
	isValidTypeName,
	isValidVariableLength,
	kebabToCamel,
	snakeToCamel,
	startsWithVerb,
	suggestBooleanName,
	suggestConstantName,
	suggestEventHandlerName,
} from "../utils/naming-helpers.js"

describe("isValidVariableLength", () => {
	it("should accept variables with minimum length", () => {
		expect(isValidVariableLength("abc")).toBe(true)
		expect(isValidVariableLength("name")).toBe(true)
		expect(isValidVariableLength("value")).toBe(true)
	})

	it("should reject short variables", () => {
		expect(isValidVariableLength("ab")).toBe(false)
		expect(isValidVariableLength("a")).toBe(false)
	})

	it("should allow whitelisted short names", () => {
		expect(isValidVariableLength("i")).toBe(true)
		expect(isValidVariableLength("j")).toBe(true)
		expect(isValidVariableLength("k")).toBe(true)
		expect(isValidVariableLength("x")).toBe(true)
		expect(isValidVariableLength("y")).toBe(true)
		expect(isValidVariableLength("id")).toBe(true)
	})
})

describe("startsWithVerb", () => {
	it("should detect verb prefixes", () => {
		expect(startsWithVerb("getData")).toBe(true)
		expect(startsWithVerb("setName")).toBe(true)
		expect(startsWithVerb("createUser")).toBe(true)
		expect(startsWithVerb("updateRecord")).toBe(true)
		expect(startsWithVerb("deleteItem")).toBe(true)
		expect(startsWithVerb("handleClick")).toBe(true)
		expect(startsWithVerb("validateInput")).toBe(true)
		expect(startsWithVerb("transformData")).toBe(true)
	})

	it("should reject non-verb prefixes", () => {
		expect(startsWithVerb("data")).toBe(false)
		expect(startsWithVerb("userName")).toBe(false)
		expect(startsWithVerb("itemList")).toBe(false)
	})
})

describe("hasValidBooleanPrefix", () => {
	it("should detect valid boolean prefixes", () => {
		expect(hasValidBooleanPrefix("isActive")).toBe(true)
		expect(hasValidBooleanPrefix("hasPermission")).toBe(true)
		expect(hasValidBooleanPrefix("canEdit")).toBe(true)
		expect(hasValidBooleanPrefix("shouldUpdate")).toBe(true)
		expect(hasValidBooleanPrefix("willChange")).toBe(true)
		expect(hasValidBooleanPrefix("didLoad")).toBe(true)
	})

	it("should reject invalid boolean prefixes", () => {
		expect(hasValidBooleanPrefix("active")).toBe(false)
		expect(hasValidBooleanPrefix("enabled")).toBe(false)
		expect(hasValidBooleanPrefix("visible")).toBe(false)
	})
})

describe("hasValidEventHandlerPrefix", () => {
	it("should detect valid event handler prefixes", () => {
		expect(hasValidEventHandlerPrefix("handleClick")).toBe(true)
		expect(hasValidEventHandlerPrefix("handleSubmit")).toBe(true)
		expect(hasValidEventHandlerPrefix("onClick")).toBe(true)
		expect(hasValidEventHandlerPrefix("onChange")).toBe(true)
	})

	it("should reject invalid event handler prefixes", () => {
		expect(hasValidEventHandlerPrefix("clickHandler")).toBe(false)
		expect(hasValidEventHandlerPrefix("submitForm")).toBe(false)
	})
})

describe("Case Detection", () => {
	describe("isScreamingSnakeCase", () => {
		it("should detect SCREAMING_SNAKE_CASE", () => {
			expect(isScreamingSnakeCase("MAX_VALUE")).toBe(true)
			expect(isScreamingSnakeCase("API_BASE_URL")).toBe(true)
			expect(isScreamingSnakeCase("DEFAULT_TIMEOUT")).toBe(true)
			expect(isScreamingSnakeCase("A")).toBe(true)
		})

		it("should reject non-SCREAMING_SNAKE_CASE", () => {
			expect(isScreamingSnakeCase("maxValue")).toBe(false)
			expect(isScreamingSnakeCase("max_value")).toBe(false)
			expect(isScreamingSnakeCase("MaxValue")).toBe(false)
		})
	})

	describe("isCamelCase", () => {
		it("should detect camelCase", () => {
			expect(isCamelCase("maxValue")).toBe(true)
			expect(isCamelCase("apiBaseUrl")).toBe(true)
			expect(isCamelCase("defaultTimeout")).toBe(true)
			expect(isCamelCase("a")).toBe(true)
		})

		it("should reject non-camelCase", () => {
			expect(isCamelCase("MaxValue")).toBe(false)
			expect(isCamelCase("max_value")).toBe(false)
			expect(isCamelCase("MAX_VALUE")).toBe(false)
		})
	})

	describe("isPascalCase", () => {
		it("should detect PascalCase", () => {
			expect(isPascalCase("MaxValue")).toBe(true)
			expect(isPascalCase("ApiBaseUrl")).toBe(true)
			expect(isPascalCase("DefaultTimeout")).toBe(true)
			expect(isPascalCase("A")).toBe(true)
		})

		it("should reject non-PascalCase", () => {
			expect(isPascalCase("maxValue")).toBe(false)
			expect(isPascalCase("max_value")).toBe(false)
			expect(isPascalCase("MAX_VALUE")).toBe(false)
		})
	})

	describe("isKebabCase", () => {
		it("should detect kebab-case", () => {
			expect(isKebabCase("max-value")).toBe(true)
			expect(isKebabCase("api-base-url")).toBe(true)
			expect(isKebabCase("default-timeout")).toBe(true)
			expect(isKebabCase("a")).toBe(true)
		})

		it("should reject non-kebab-case", () => {
			expect(isKebabCase("maxValue")).toBe(false)
			expect(isKebabCase("max_value")).toBe(false)
			expect(isKebabCase("MAX_VALUE")).toBe(false)
		})
	})

	describe("isSnakeCase", () => {
		it("should detect snake_case", () => {
			expect(isSnakeCase("max_value")).toBe(true)
			expect(isSnakeCase("api_base_url")).toBe(true)
			expect(isSnakeCase("default_timeout")).toBe(true)
			expect(isSnakeCase("a")).toBe(true)
		})

		it("should reject non-snake_case", () => {
			expect(isSnakeCase("maxValue")).toBe(false)
			expect(isSnakeCase("max-value")).toBe(false)
			expect(isSnakeCase("MAX_VALUE")).toBe(false)
		})
	})
})

describe("isPrivateName", () => {
	it("should detect private names", () => {
		expect(isPrivateName("_privateVar")).toBe(true)
		expect(isPrivateName("_helper")).toBe(true)
	})

	it("should reject non-private names", () => {
		expect(isPrivateName("publicVar")).toBe(false)
		expect(isPrivateName("helper")).toBe(false)
	})
})

describe("isValidHookName", () => {
	it("should detect valid hook names", () => {
		expect(isValidHookName("useData")).toBe(true)
		expect(isValidHookName("useState")).toBe(true)
		expect(isValidHookName("useEffect")).toBe(true)
	})

	it("should reject invalid hook names", () => {
		expect(isValidHookName("usedata")).toBe(false)
		expect(isValidHookName("getData")).toBe(false)
		expect(isValidHookName("use")).toBe(false)
	})
})

describe("isValidComponentName", () => {
	it("should detect valid component names", () => {
		expect(isValidComponentName("Button")).toBe(true)
		expect(isValidComponentName("FileTree")).toBe(true)
		expect(isValidComponentName("MyComponent")).toBe(true)
	})

	it("should reject invalid component names", () => {
		expect(isValidComponentName("button")).toBe(false)
		expect(isValidComponentName("fileTree")).toBe(false)
	})
})

describe("isValidTypeName", () => {
	it("should detect valid type names", () => {
		expect(isValidTypeName("User")).toBe(true)
		expect(isValidTypeName("NodeData")).toBe(true)
		expect(isValidTypeName("ApiResponse")).toBe(true)
	})

	it("should reject invalid type names", () => {
		expect(isValidTypeName("user")).toBe(false)
		expect(isValidTypeName("nodeData")).toBe(false)
	})
})

describe("Case Conversion", () => {
	describe("camelToKebab", () => {
		it("should convert camelCase to kebab-case", () => {
			expect(camelToKebab("maxValue")).toBe("max-value")
			expect(camelToKebab("apiBaseUrl")).toBe("api-base-url")
			expect(camelToKebab("XMLParser")).toBe("xml-parser")
		})
	})

	describe("kebabToCamel", () => {
		it("should convert kebab-case to camelCase", () => {
			expect(kebabToCamel("max-value")).toBe("maxValue")
			expect(kebabToCamel("api-base-url")).toBe("apiBaseUrl")
		})
	})

	describe("snakeToCamel", () => {
		it("should convert snake_case to camelCase", () => {
			expect(snakeToCamel("max_value")).toBe("maxValue")
			expect(snakeToCamel("api_base_url")).toBe("apiBaseUrl")
		})
	})

	describe("camelToScreamingSnake", () => {
		it("should convert camelCase to SCREAMING_SNAKE_CASE", () => {
			expect(camelToScreamingSnake("maxValue")).toBe("MAX_VALUE")
			expect(camelToScreamingSnake("apiBaseUrl")).toBe("API_BASE_URL")
		})
	})
})

describe("Name Suggestions", () => {
	describe("suggestBooleanName", () => {
		it("should suggest boolean names with is prefix", () => {
			expect(suggestBooleanName("active")).toBe("isActive")
			expect(suggestBooleanName("visible")).toBe("isVisible")
		})

		it("should keep valid boolean names", () => {
			expect(suggestBooleanName("isActive")).toBe("isActive")
			expect(suggestBooleanName("hasPermission")).toBe("hasPermission")
		})
	})

	describe("suggestEventHandlerName", () => {
		it("should suggest event handler names with handle prefix", () => {
			expect(suggestEventHandlerName("click")).toBe("handleClick")
			expect(suggestEventHandlerName("submit")).toBe("handleSubmit")
		})

		it("should keep valid event handler names", () => {
			expect(suggestEventHandlerName("handleClick")).toBe("handleClick")
			expect(suggestEventHandlerName("onClick")).toBe("onClick")
		})
	})

	describe("suggestConstantName", () => {
		it("should suggest SCREAMING_SNAKE_CASE names", () => {
			expect(suggestConstantName("maxValue")).toBe("MAX_VALUE")
			expect(suggestConstantName("apiBaseUrl")).toBe("API_BASE_URL")
		})

		it("should keep valid constant names", () => {
			expect(suggestConstantName("MAX_VALUE")).toBe("MAX_VALUE")
		})
	})
})

describe("File Name Validation", () => {
	describe("isValidFileName", () => {
		it("should accept valid file names", () => {
			expect(isValidFileName("file-tree.view.fn.tsx")).toBe(true)
			expect(isValidFileName("create-node.flow.ts")).toBe(true)
			expect(isValidFileName("transform.pipe.ts")).toBe(true)
		})

		it("should reject invalid file names", () => {
			expect(isValidFileName("FileTree.view.fn.tsx")).toBe(false)
			expect(isValidFileName("createNode.flow.ts")).toBe(false)
		})
	})

	describe("isValidDirectoryName", () => {
		it("should accept valid directory names", () => {
			expect(isValidDirectoryName("file-tree")).toBe(true)
			expect(isValidDirectoryName("node")).toBe(true)
		})

		it("should reject invalid directory names", () => {
			expect(isValidDirectoryName("FileTree")).toBe(false)
			expect(isValidDirectoryName("file_tree")).toBe(false)
		})
	})
})

describe("Issue Detection", () => {
	describe("getVariableNameIssue", () => {
		it("should return issue for short names", () => {
			const issue = getVariableNameIssue("ab")
			expect(issue).toContain("太短")
		})

		it("should return null for valid names", () => {
			expect(getVariableNameIssue("name")).toBeNull()
			expect(getVariableNameIssue("i")).toBeNull()
		})
	})

	describe("getFunctionNameIssue", () => {
		it("should return issue for non-verb names", () => {
			const issue = getFunctionNameIssue("data")
			expect(issue).toContain("动词")
		})

		it("should return null for valid names", () => {
			expect(getFunctionNameIssue("getData")).toBeNull()
		})
	})

	describe("getBooleanNameIssue", () => {
		it("should return issue for invalid boolean names", () => {
			const issue = getBooleanNameIssue("active")
			expect(issue).toContain("is/has/can/should")
			expect(issue).toContain("isActive")
		})

		it("should return null for valid names", () => {
			expect(getBooleanNameIssue("isActive")).toBeNull()
		})
	})

	describe("getConstantNameIssue", () => {
		it("should return issue for non-SCREAMING_SNAKE_CASE", () => {
			const issue = getConstantNameIssue("maxValue")
			expect(issue).toContain("SCREAMING_SNAKE_CASE")
			expect(issue).toContain("MAX_VALUE")
		})

		it("should return null for valid names", () => {
			expect(getConstantNameIssue("MAX_VALUE")).toBeNull()
		})
	})

	describe("getEventHandlerNameIssue", () => {
		it("should return issue for invalid event handler names", () => {
			const issue = getEventHandlerNameIssue("click")
			expect(issue).toContain("handle/on")
			expect(issue).toContain("handleClick")
		})

		it("should return null for valid names", () => {
			expect(getEventHandlerNameIssue("handleClick")).toBeNull()
			expect(getEventHandlerNameIssue("onClick")).toBeNull()
		})
	})
})
