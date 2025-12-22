/**
 * @file fn/date/date.chinese.fn.test.ts
 * @description 中国传统日期纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 3.1, 3.2, 3.3
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	getChineseEra,
	getChineseHour,
	getZodiacAnimal,
} from "./date.chinese.fn";

// ============================================================================
// Unit Tests - getZodiacAnimal
// ============================================================================

describe("getZodiacAnimal", () => {
	it("should return Rat for 1900", () => {
		const result = getZodiacAnimal(1900);
		expect(result.cn).toBe("鼠");
		expect(result.en).toBe("Rat");
	});

	it("should return Dragon for 2024", () => {
		const result = getZodiacAnimal(2024);
		expect(result.cn).toBe("龙");
		expect(result.en).toBe("Dragon");
	});

	it("should return Snake for 2025", () => {
		const result = getZodiacAnimal(2025);
		expect(result.cn).toBe("蛇");
		expect(result.en).toBe("Snake");
	});

	it("should cycle through 12 animals", () => {
		const result1 = getZodiacAnimal(2000);
		const result2 = getZodiacAnimal(2012);
		expect(result1.cn).toBe(result2.cn);
		expect(result1.en).toBe(result2.en);
	});

	it("should handle negative years", () => {
		const result = getZodiacAnimal(-100);
		expect(result.cn).toBeDefined();
		expect(result.en).toBeDefined();
	});
});

// ============================================================================
// Unit Tests - getChineseEra
// ============================================================================

describe("getChineseEra", () => {
	it("should return 甲子 for year 4", () => {
		expect(getChineseEra(4)).toBe("甲子");
	});

	it("should return 甲辰 for 2024", () => {
		expect(getChineseEra(2024)).toBe("甲辰");
	});

	it("should return 乙巳 for 2025", () => {
		expect(getChineseEra(2025)).toBe("乙巳");
	});

	it("should cycle every 60 years", () => {
		expect(getChineseEra(1984)).toBe(getChineseEra(2044));
	});

	it("should handle negative years", () => {
		const result = getChineseEra(-100);
		expect(result).toHaveLength(2);
	});
});

// ============================================================================
// Unit Tests - getChineseHour
// ============================================================================

describe("getChineseHour", () => {
	it("should return 子时 for hour 23", () => {
		expect(getChineseHour(23)).toBe("子时");
	});

	it("should return 子时 for hour 0", () => {
		expect(getChineseHour(0)).toBe("子时");
	});

	it("should return 午时 for hour 11", () => {
		expect(getChineseHour(11)).toBe("午时");
	});

	it("should return 午时 for hour 12", () => {
		expect(getChineseHour(12)).toBe("午时");
	});

	it("should handle out of range hours", () => {
		expect(getChineseHour(24)).toBe(getChineseHour(0));
		expect(getChineseHour(-1)).toBe(getChineseHour(23));
	});
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe("Property-Based Tests", () => {
	/**
	 * **Feature: fp-architecture-refactor, Property 1: getZodiacAnimal 总是返回有效的生肖**
	 * **Validates: Requirements 3.1**
	 */
	describe("getZodiacAnimal - property based", () => {
		it("should always return valid zodiac animal", () => {
			fc.assert(
				fc.property(fc.integer({ min: -5000, max: 5000 }), (year) => {
					const result = getZodiacAnimal(year);
					return (
						typeof result.cn === "string" &&
						result.cn.length > 0 &&
						typeof result.en === "string" &&
						result.en.length > 0
					);
				}),
				{ numRuns: 100 },
			);
		});

		it("should cycle every 12 years", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 3000 }), (year) => {
					const result1 = getZodiacAnimal(year);
					const result2 = getZodiacAnimal(year + 12);
					return result1.cn === result2.cn && result1.en === result2.en;
				}),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 2: getChineseEra 总是返回两个字符**
	 * **Validates: Requirements 3.2**
	 */
	describe("getChineseEra - property based", () => {
		it("should always return exactly 2 characters", () => {
			fc.assert(
				fc.property(fc.integer({ min: -5000, max: 5000 }), (year) => {
					const result = getChineseEra(year);
					return result.length === 2;
				}),
				{ numRuns: 100 },
			);
		});

		it("should cycle every 60 years", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 3000 }), (year) => {
					return getChineseEra(year) === getChineseEra(year + 60);
				}),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 3: getChineseHour 总是返回有效时辰**
	 * **Validates: Requirements 3.3**
	 */
	describe("getChineseHour - property based", () => {
		it("should always return valid Chinese hour", () => {
			fc.assert(
				fc.property(fc.integer({ min: -100, max: 100 }), (hour) => {
					const result = getChineseHour(hour);
					return typeof result === "string" && result.endsWith("时");
				}),
				{ numRuns: 100 },
			);
		});

		it("should cycle every 24 hours", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
					return getChineseHour(hour) === getChineseHour(hour + 24);
				}),
				{ numRuns: 100 },
			);
		});
	});
});
