/**
 * @file fn/date/date.folder.fn.test.ts
 * @description 日期目录结构纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 1.1, 3.1
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	buildFilePath,
	buildFolderPath,
	getDateFolderStructure,
	getDateFolderStructureWithFilename,
	getMonthName,
	getWeekdayName,
} from "./date.folder.fn";

// ============================================================================
// Unit Tests - getMonthName
// ============================================================================

describe("getMonthName", () => {
	it("should return January for month 0", () => {
		expect(getMonthName(0)).toBe("January");
	});

	it("should return December for month 11", () => {
		expect(getMonthName(11)).toBe("December");
	});

	it("should handle out of range months", () => {
		expect(getMonthName(12)).toBe("January");
		expect(getMonthName(-1)).toBe("December");
	});
});

// ============================================================================
// Unit Tests - getWeekdayName
// ============================================================================

describe("getWeekdayName", () => {
	it("should return Sunday for weekday 0", () => {
		expect(getWeekdayName(0)).toBe("Sunday");
	});

	it("should return Saturday for weekday 6", () => {
		expect(getWeekdayName(6)).toBe("Saturday");
	});

	it("should handle out of range weekdays", () => {
		expect(getWeekdayName(7)).toBe("Sunday");
		expect(getWeekdayName(-1)).toBe("Saturday");
	});
});

// ============================================================================
// Unit Tests - getDateFolderStructure
// ============================================================================

describe("getDateFolderStructure", () => {
	it("should generate correct folder structure", () => {
		const date = new Date("2024-12-20T14:30:00");
		const result = getDateFolderStructure(date);

		expect(result.yearFolder).toBe("year-2024-Dragon");
		expect(result.monthFolder).toBe("month-12-December");
		expect(result.dayFolder).toBe("day-20-Friday");
	});

	it("should pad month and day with zeros", () => {
		const date = new Date("2024-01-05T09:05:00");
		const result = getDateFolderStructure(date);

		expect(result.monthFolder).toBe("month-01-January");
		expect(result.dayFolder).toMatch(/^day-05-/);
	});
});

// ============================================================================
// Unit Tests - getDateFolderStructureWithFilename
// ============================================================================

describe("getDateFolderStructureWithFilename", () => {
	it("should generate correct folder structure with filename", () => {
		const date = new Date("2024-12-20T14:30:00");
		const result = getDateFolderStructureWithFilename(date, "diary");

		expect(result.yearFolder).toBe("year-2024-Dragon");
		expect(result.monthFolder).toBe("month-12-December");
		expect(result.dayFolder).toBe("day-20-Friday");
		expect(result.filename).toMatch(/^diary-\d+-14-30-00$/);
	});

	it("should use default prefix when not provided", () => {
		const date = new Date("2024-12-20T14:30:00");
		const result = getDateFolderStructureWithFilename(date);

		expect(result.filename).toMatch(/^file-\d+-14-30-00$/);
	});

	it("should use hyphens in filename for cross-platform compatibility", () => {
		const date = new Date("2024-12-20T14:30:45");
		const result = getDateFolderStructureWithFilename(date, "diary");

		expect(result.filename).not.toContain(":");
		expect(result.filename).toMatch(/-\d{2}-\d{2}-\d{2}$/);
	});
});

// ============================================================================
// Unit Tests - buildFolderPath
// ============================================================================

describe("buildFolderPath", () => {
	it("should build correct folder path", () => {
		const structure = {
			yearFolder: "year-2024-Dragon",
			monthFolder: "month-12-December",
			dayFolder: "day-20-Friday",
		};
		const result = buildFolderPath(structure);

		expect(result).toBe("year-2024-Dragon/month-12-December/day-20-Friday");
	});
});

// ============================================================================
// Unit Tests - buildFilePath
// ============================================================================

describe("buildFilePath", () => {
	it("should build correct file path", () => {
		const structure = {
			yearFolder: "year-2024-Dragon",
			monthFolder: "month-12-December",
			dayFolder: "day-20-Friday",
			filename: "diary-1734192000-14-30-00",
		};
		const result = buildFilePath(structure);

		expect(result).toBe(
			"year-2024-Dragon/month-12-December/day-20-Friday/diary-1734192000-14-30-00",
		);
	});
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe("Property-Based Tests", () => {
	/**
	 * **Feature: fp-architecture-refactor, Property 5: getMonthName 总是返回有效月份名**
	 * **Validates: Requirements 3.1**
	 */
	describe("getMonthName - property based", () => {
		it("should always return valid month name", () => {
			const validMonths = [
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			];
			fc.assert(
				fc.property(fc.integer({ min: -100, max: 100 }), (month) => {
					const result = getMonthName(month);
					return validMonths.includes(result);
				}),
				{ numRuns: 100 },
			);
		});

		it("should cycle every 12 months", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 11 }), (month) => {
					return getMonthName(month) === getMonthName(month + 12);
				}),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 6: getWeekdayName 总是返回有效星期名**
	 * **Validates: Requirements 3.1**
	 */
	describe("getWeekdayName - property based", () => {
		it("should always return valid weekday name", () => {
			const validWeekdays = [
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			];
			fc.assert(
				fc.property(fc.integer({ min: -100, max: 100 }), (weekday) => {
					const result = getWeekdayName(weekday);
					return validWeekdays.includes(result);
				}),
				{ numRuns: 100 },
			);
		});

		it("should cycle every 7 days", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 6 }), (weekday) => {
					return getWeekdayName(weekday) === getWeekdayName(weekday + 7);
				}),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 4: getDateFolderStructure 返回有效结构**
	 * **Validates: Requirements 1.1**
	 */
	describe("getDateFolderStructure - property based", () => {
		it("should always return valid folder structure", () => {
			fc.assert(
				fc.property(
					fc.date({ min: new Date("2000-01-01"), max: new Date("2100-12-31") }),
					(date) => {
						const result = getDateFolderStructure(date);
						return (
							result.yearFolder.startsWith("year-") &&
							result.monthFolder.startsWith("month-") &&
							result.dayFolder.startsWith("day-")
						);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 7: getDateFolderStructureWithFilename 返回有效结构**
	 * **Validates: Requirements 1.1**
	 */
	describe("getDateFolderStructureWithFilename - property based", () => {
		it("should always return valid folder structure with filename", () => {
			fc.assert(
				fc.property(
					fc.date({ min: new Date("2000-01-01"), max: new Date("2100-12-31") }),
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z]+$/.test(s)),
					(date, prefix) => {
						const result = getDateFolderStructureWithFilename(date, prefix);
						return (
							result.yearFolder.startsWith("year-") &&
							result.monthFolder.startsWith("month-") &&
							result.dayFolder.startsWith("day-") &&
							result.filename.startsWith(`${prefix}-`)
						);
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should never contain colons in filename", () => {
			fc.assert(
				fc.property(
					fc.date({ min: new Date("2000-01-01"), max: new Date("2100-12-31") }),
					(date) => {
						const result = getDateFolderStructureWithFilename(date, "diary");
						return !result.filename.includes(":");
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 8: buildFolderPath 返回有效路径**
	 * **Validates: Requirements 1.1**
	 */
	describe("buildFolderPath - property based", () => {
		it("should always return path with correct separators", () => {
			fc.assert(
				fc.property(
					fc.date({ min: new Date("2000-01-01"), max: new Date("2100-12-31") }),
					(date) => {
						const structure = getDateFolderStructure(date);
						const path = buildFolderPath(structure);
						const parts = path.split("/");
						return parts.length === 3;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 9: buildFilePath 返回有效文件路径**
	 * **Validates: Requirements 1.1**
	 */
	describe("buildFilePath - property based", () => {
		it("should always return path with correct separators and filename", () => {
			fc.assert(
				fc.property(
					fc.date({ min: new Date("2000-01-01"), max: new Date("2100-12-31") }),
					(date) => {
						const structure = getDateFolderStructureWithFilename(date, "diary");
						const path = buildFilePath(structure);
						const parts = path.split("/");
						return parts.length === 4 && parts[3].startsWith("diary-");
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
