/**
 * @file format.bytes.fn.test.ts
 * @description formatBytes 函数测试
 */

import { describe, expect, it } from "vitest"
import { formatBytes } from "./format.bytes.fn"

describe("formatBytes", () => {
	it("should format 0 bytes", () => {
		expect(formatBytes(0)).toBe("0 B")
	})

	it("should format bytes", () => {
		expect(formatBytes(100)).toBe("100 B")
		expect(formatBytes(500)).toBe("500 B")
		expect(formatBytes(1023)).toBe("1023 B")
	})

	it("should format kilobytes", () => {
		expect(formatBytes(1024)).toBe("1 KB")
		expect(formatBytes(1536)).toBe("1.5 KB")
		expect(formatBytes(2048)).toBe("2 KB")
		expect(formatBytes(10240)).toBe("10 KB")
	})

	it("should format megabytes", () => {
		expect(formatBytes(1048576)).toBe("1 MB")
		expect(formatBytes(1572864)).toBe("1.5 MB")
		expect(formatBytes(5242880)).toBe("5 MB")
	})

	it("should format gigabytes", () => {
		expect(formatBytes(1073741824)).toBe("1 GB")
		expect(formatBytes(1610612736)).toBe("1.5 GB")
		expect(formatBytes(5368709120)).toBe("5 GB")
	})

	it("should handle decimal places correctly", () => {
		expect(formatBytes(1536)).toBe("1.5 KB")
		expect(formatBytes(1638)).toBe("1.6 KB")
		expect(formatBytes(1740)).toBe("1.7 KB")
	})

	it("should handle large numbers", () => {
		expect(formatBytes(999999999)).toBe("953.67 MB")
		expect(formatBytes(9999999999)).toBe("9.31 GB")
	})
})
