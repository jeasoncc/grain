/**
 * @file utils/date.util.ts
 * @description 日期相关工具函数
 *
 * 包含：
 * - 中国传统日期（生肖、天干地支、时辰）
 * - 日期文件夹结构生成
 */

import dayjs from "dayjs";

// ==============================
// Constants
// ==============================

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

const MONTH_NAMES = [
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

const WEEKDAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

// ==============================
// Types
// ==============================

export interface ZodiacAnimal {
	cn: string;
	en: string;
}

export interface DateFolderStructure {
	yearFolder: string;
	monthFolder: string;
	dayFolder: string;
}

export interface DateFolderStructureWithFilename extends DateFolderStructure {
	filename: string;
}

// ==============================
// Chinese Date Functions
// ==============================

export function getZodiacAnimal(year: number): ZodiacAnimal {
	const index = (((year - 1900) % 12) + 12) % 12;
	return {
		cn: ZODIAC_ANIMALS[index],
		en: ZODIAC_ANIMALS_EN[index],
	};
}

export function getChineseEra(year: number): string {
	const stemIndex = (((year - 4) % 10) + 10) % 10;
	const branchIndex = (((year - 4) % 12) + 12) % 12;
	return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

export function getChineseHour(hour: number): string {
	const normalizedHour = ((hour % 24) + 24) % 24;
	const index =
		normalizedHour === 23 ? 0 : Math.floor((normalizedHour + 1) / 2) % 12;
	return CHINESE_HOURS[index];
}

// ==============================
// Date Folder Functions
// ==============================

export function getMonthName(month: number): string {
	const normalizedMonth = ((month % 12) + 12) % 12;
	return MONTH_NAMES[normalizedMonth];
}

export function getWeekdayName(weekday: number): string {
	const normalizedWeekday = ((weekday % 7) + 7) % 7;
	return WEEKDAY_NAMES[normalizedWeekday];
}

export function getDateFolderStructure(
	date: Date = new Date(),
): DateFolderStructure {
	const year = date.getFullYear();
	const month = date.getMonth();
	const day = date.getDate();
	const weekday = date.getDay();

	const zodiac = getZodiacAnimal(year);

	return {
		yearFolder: `year-${year}-${zodiac.en}`,
		monthFolder: `month-${String(month + 1).padStart(2, "0")}-${MONTH_NAMES[month]}`,
		dayFolder: `day-${String(day).padStart(2, "0")}-${WEEKDAY_NAMES[weekday]}`,
	};
}

export function getDateFolderStructureWithFilename(
	date: Date = new Date(),
	prefix = "file",
): DateFolderStructureWithFilename {
	const baseStructure = getDateFolderStructure(date);
	const timestamp = Math.floor(date.getTime() / 1000);
	const formattedTime = dayjs(date).format("HH-mm-ss");

	return {
		...baseStructure,
		filename: `${prefix}-${timestamp}-${formattedTime}`,
	};
}

export function buildFolderPath(structure: DateFolderStructure): string {
	return `${structure.yearFolder}/${structure.monthFolder}/${structure.dayFolder}`;
}

export function buildFilePath(
	structure: DateFolderStructureWithFilename,
): string {
	return `${buildFolderPath(structure)}/${structure.filename}`;
}
