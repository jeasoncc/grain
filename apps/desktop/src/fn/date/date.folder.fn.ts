/**
 * @file fn/date/date.folder.fn.ts
 * @description 日期目录结构生成相关的纯函数
 *
 * 功能说明：
 * - 日期文件夹结构生成
 * - 月份名称获取
 * - 星期名称获取
 *
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 1.1, 3.1
 */

import dayjs from "dayjs";
import { getZodiacAnimal } from "./date.chinese.fn";

// ==============================
// Constants
// ==============================

/** Month names in English */
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

/** Weekday names in English */
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

/**
 * 日期文件夹结构
 */
export interface DateFolderStructure {
	/** 年份文件夹名称，如 "year-2024-Dragon" */
	yearFolder: string;
	/** 月份文件夹名称，如 "month-12-December" */
	monthFolder: string;
	/** 日期文件夹名称，如 "day-14-Saturday" */
	dayFolder: string;
}

/**
 * 带文件名的日期文件夹结构
 */
export interface DateFolderStructureWithFilename extends DateFolderStructure {
	/** 文件名，如 "diary-1734192000-14-30-00" */
	filename: string;
}

// ==============================
// Pure Functions
// ==============================

/**
 * 获取月份英文名称
 *
 * @param month - 月份索引 (0-11)
 * @returns 月份英文名称
 */
export function getMonthName(month: number): string {
	const normalizedMonth = ((month % 12) + 12) % 12;
	return MONTH_NAMES[normalizedMonth];
}

/**
 * 获取星期英文名称
 *
 * @param weekday - 星期索引 (0-6, 0 = Sunday)
 * @returns 星期英文名称
 */
export function getWeekdayName(weekday: number): string {
	const normalizedWeekday = ((weekday % 7) + 7) % 7;
	return WEEKDAY_NAMES[normalizedWeekday];
}

/**
 * 生成日期文件夹结构（不含文件名）
 *
 * @param date - 日期，默认为当前时间
 * @returns 日期文件夹结构
 */
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

/**
 * 生成带文件名的日期文件夹结构
 * 使用跨平台兼容的命名（连字符代替冒号）
 *
 * @param date - 日期，默认为当前时间
 * @param prefix - 文件名前缀，默认为 "file"
 * @returns 带文件名的日期文件夹结构
 */
export function getDateFolderStructureWithFilename(
	date: Date = new Date(),
	prefix = "file",
): DateFolderStructureWithFilename {
	const baseStructure = getDateFolderStructure(date);
	const timestamp = Math.floor(date.getTime() / 1000);
	const formattedTime = dayjs(date).format("HH-mm-ss"); // Hyphens for cross-platform

	return {
		...baseStructure,
		filename: `${prefix}-${timestamp}-${formattedTime}`,
	};
}

/**
 * 生成完整的文件夹路径
 *
 * @param structure - 日期文件夹结构
 * @returns 完整路径，如 "year-2024-Dragon/month-12-December/day-20-Friday"
 */
export function buildFolderPath(structure: DateFolderStructure): string {
	return `${structure.yearFolder}/${structure.monthFolder}/${structure.dayFolder}`;
}

/**
 * 生成完整的文件路径（含文件名）
 *
 * @param structure - 带文件名的日期文件夹结构
 * @returns 完整路径，如 "year-2024-Dragon/month-12-December/day-20-Friday/diary-1734192000-14-30-00"
 */
export function buildFilePath(
	structure: DateFolderStructureWithFilename,
): string {
	return `${buildFolderPath(structure)}/${structure.filename}`;
}
