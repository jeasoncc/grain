/**
 * Utility functions tests
 */

import { describe, expect, it } from "vitest"
import {
	BANNED_LIBRARIES,
	FILE_NAMING_PATTERNS,
	getAllowedDependencies,
	getArchitectureLayer,
	getExpectedTestFilePath,
	getImportLayer,
	isContainerComponent,
	isExternalImport,
	isInternalImport,
	isTestFile,
	isViewComponent,
	REACT_IMPORTS,
	SIDE_EFFECT_GLOBALS,
} from "../utils/index.js"

describe("Architecture Layer Detection", () => {
	it("should detect views layer", () => {
		expect(getArchitectureLayer("/project/src/views/sidebar.view.fn.tsx")).toBe("views")
	})

	it("should detect pipes layer", () => {
		expect(getArchitectureLayer("/project/src/pipes/transform.pipe.ts")).toBe("pipes")
	})

	it("should detect flows layer", () => {
		expect(getArchitectureLayer("/project/src/flows/create-node.flow.ts")).toBe("flows")
	})

	it("should return null for unknown paths", () => {
		expect(getArchitectureLayer("/project/other/file.ts")).toBeNull()
	})
})

describe("Component Type Detection", () => {
	it("should detect container components", () => {
		expect(isContainerComponent("sidebar.container.fn.tsx")).toBe(true)
		expect(isContainerComponent("sidebar.view.fn.tsx")).toBe(false)
	})

	it("should detect view components", () => {
		expect(isViewComponent("sidebar.view.fn.tsx")).toBe(true)
		expect(isViewComponent("sidebar.container.fn.tsx")).toBe(false)
	})

	it("should detect test files", () => {
		expect(isTestFile("component.test.ts")).toBe(true)
		expect(isTestFile("component.spec.tsx")).toBe(true)
		expect(isTestFile("component.ts")).toBe(false)
	})
})

describe("Test File Path Generation", () => {
	it("should generate correct test file paths", () => {
		expect(getExpectedTestFilePath("src/pipes/transform.pipe.ts")).toBe(
			"src/pipes/transform.pipe.test.ts",
		)
		expect(getExpectedTestFilePath("src/views/sidebar.view.fn.tsx")).toBe(
			"src/views/sidebar.view.fn.test.tsx",
		)
	})
})

describe("Import Type Detection", () => {
	it("should detect external imports", () => {
		expect(isExternalImport("react")).toBe(true)
		expect(isExternalImport("lodash")).toBe(true)
		expect(isExternalImport("@/utils/helper")).toBe(false)
		expect(isExternalImport("./local")).toBe(false)
	})

	it("should detect internal imports", () => {
		expect(isInternalImport("@/utils/helper")).toBe(true)
		expect(isInternalImport("./local")).toBe(true)
		expect(isInternalImport("../parent")).toBe(true)
		expect(isInternalImport("react")).toBe(false)
	})
})

describe("Layer Dependencies", () => {
	it("should return correct allowed dependencies for views", () => {
		const allowed = getAllowedDependencies("views")
		expect(allowed).toEqual(["hooks", "types"])
	})

	it("should return correct allowed dependencies for pipes", () => {
		const allowed = getAllowedDependencies("pipes")
		expect(allowed).toEqual(["utils", "types"])
	})

	it("should return empty array for unknown layer", () => {
		const allowed = getAllowedDependencies("unknown")
		expect(allowed).toEqual([])
	})
})

describe("Import Layer Extraction", () => {
	it("should extract layer from import path", () => {
		expect(getImportLayer("@/views/sidebar")).toBe("views")
		expect(getImportLayer("@/pipes/transform")).toBe("pipes")
		expect(getImportLayer("@/flows/create-node")).toBe("flows")
		expect(getImportLayer("react")).toBeNull()
		expect(getImportLayer("./local")).toBeNull()
	})
})

describe("Constants", () => {
	it("should have banned libraries mapping", () => {
		expect(BANNED_LIBRARIES.lodash).toBe("es-toolkit")
		expect(BANNED_LIBRARIES.moment).toBe("dayjs")
	})

	it("should have side effect globals list", () => {
		expect(SIDE_EFFECT_GLOBALS).toContain("window")
		expect(SIDE_EFFECT_GLOBALS).toContain("localStorage")
		expect(SIDE_EFFECT_GLOBALS).toContain("fetch")
	})

	it("should have React imports list", () => {
		expect(REACT_IMPORTS).toContain("react")
		expect(REACT_IMPORTS).toContain("react-dom")
	})

	it("should have file naming patterns", () => {
		const pipesPattern = FILE_NAMING_PATTERNS.find((p) => p.layer === "pipes")
		const flowsPattern = FILE_NAMING_PATTERNS.find((p) => p.layer === "flows")
		const viewsPattern = FILE_NAMING_PATTERNS.find((p) => p.layer === "views")

		expect(pipesPattern?.pattern.test("transform.pipe.ts")).toBe(true)
		expect(flowsPattern?.pattern.test("create-node.flow.ts")).toBe(true)
		expect(viewsPattern?.pattern.test("sidebar.view.fn.tsx")).toBe(true)
	})
})
