/**
 * @file fn/date/date.chinese.fn.ts
 * @description 中国传统日期相关的纯函数
 *
 * 功能说明：
 * - 生肖计算
 * - 天干地支计算
 * - 时辰计算
 *
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 3.1, 3.2, 3.3
 */

// ==============================
// Constants
// ==============================

/** Zodiac animals (Chinese and English) */
const ZODIAC_ANIMALS = [
	"鼠",
	"牛",
	"虎",
	"兔",
	"龙",
	"蛇",
	"马",
	"羊",
	"猴",
	"鸡",
	"狗",
	"猪",
];

const ZODIAC_ANIMALS_EN = [
	"Rat",
	"Ox",
	"Tiger",
	"Rabbit",
	"Dragon",
	"Snake",
	"Horse",
	"Goat",
	"Monkey",
	"Rooster",
	"Dog",
	"Pig",
];

/** Heavenly Stems (天干) */
const HEAVENLY_STEMS = [
	"甲",
	"乙",
	"丙",
	"丁",
	"戊",
	"己",
	"庚",
	"辛",
	"壬",
	"癸",
];

/** Earthly Branches (地支) */
const EARTHLY_BRANCHES = [
	"子",
	"丑",
	"寅",
	"卯",
	"辰",
	"巳",
	"午",
	"未",
	"申",
	"酉",
	"戌",
	"亥",
];

/** Chinese hours (十二时辰) */
const CHINESE_HOURS = [
	"子时",
	"丑时",
	"寅时",
	"卯时",
	"辰时",
	"巳时",
	"午时",
	"未时",
	"申时",
	"酉时",
	"戌时",
	"亥时",
];

// ==============================
// Types
// ==============================

/**
 * 生肖信息
 */
export interface ZodiacAnimal {
	/** 中文名称 */
	cn: string;
	/** 英文名称 */
	en: string;
}

// ==============================
// Pure Functions
// ==============================

/**
 * 获取指定年份的生肖
 *
 * @param year - 年份
 * @returns 生肖的中英文名称
 */
export function getZodiacAnimal(year: number): ZodiacAnimal {
	// 处理负数年份，确保索引为正
	const index = (((year - 1900) % 12) + 12) % 12;
	return {
		cn: ZODIAC_ANIMALS[index],
		en: ZODIAC_ANIMALS_EN[index],
	};
}

/**
 * 获取指定年份的天干地支
 *
 * @param year - 年份
 * @returns 天干地支字符串
 */
export function getChineseEra(year: number): string {
	// 处理负数年份，确保索引为正
	const stemIndex = (((year - 4) % 10) + 10) % 10;
	const branchIndex = (((year - 4) % 12) + 12) % 12;
	return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

/**
 * 获取指定小时的时辰
 *
 * @param hour - 小时 (0-23)
 * @returns 时辰名称
 */
export function getChineseHour(hour: number): string {
	// 规范化小时到 0-23 范围
	const normalizedHour = ((hour % 24) + 24) % 24;
	// 子时 starts at 23:00
	const index =
		normalizedHour === 23 ? 0 : Math.floor((normalizedHour + 1) / 2) % 12;
	return CHINESE_HOURS[index];
}
