/**
 * @file diary.utils.ts
 * @description 日记功能的纯函数工具集
 *
 * 功能说明：
 * - 生肖计算
 * - 天干地支计算
 * - 时辰计算
 * - 日记文件夹结构生成
 * - 日记内容生成
 *
 * Requirements: 1.1, 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";

// ==============================
// Constants
// ==============================

/** Zodiac animals (Chinese and English) */
const ZODIAC_ANIMALS = [
	"鼠", "牛", "虎", "兔", "龙", "蛇",
	"马", "羊", "猴", "鸡", "狗", "猪"
];

const ZODIAC_ANIMALS_EN = [
	"Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
	"Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

/** Heavenly Stems (天干) */
const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

/** Earthly Branches (地支) */
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** Chinese hours (十二时辰) */
const CHINESE_HOURS = [
	"子时", "丑时", "寅时", "卯时", "辰时", "巳时",
	"午时", "未时", "申时", "酉时", "戌时", "亥时"
];

/** Month names in English */
const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December"
];

/** Weekday names in English */
const WEEKDAY_NAMES = [
	"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

// ==============================
// Types
// ==============================

export interface DiaryFolderStructure {
	yearFolder: string;   // "year-2024-Dragon"
	monthFolder: string;  // "month-12-December"
	dayFolder: string;    // "day-14-Saturday"
	filename: string;     // "diary-1734192000-14-30-00" (hyphens for cross-platform)
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
export function getZodiacAnimal(year: number): { cn: string; en: string } {
	const index = (year - 1900) % 12;
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
	const stemIndex = (year - 4) % 10;
	const branchIndex = (year - 4) % 12;
	return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

/**
 * 获取指定小时的时辰
 *
 * @param hour - 小时 (0-23)
 * @returns 时辰名称
 */
export function getChineseHour(hour: number): string {
	// 子时 starts at 23:00
	const index = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
	return CHINESE_HOURS[index];
}

/**
 * 生成日记文件夹结构
 * 使用跨平台兼容的命名（连字符代替冒号）
 *
 * @param date - 日期，默认为当前时间
 * @returns 日记文件夹结构
 */
export function getDiaryFolderStructure(date: Date = new Date()): DiaryFolderStructure {
	const year = date.getFullYear();
	const month = date.getMonth();
	const day = date.getDate();
	const weekday = date.getDay();
	const timestamp = Math.floor(date.getTime() / 1000);

	const zodiac = getZodiacAnimal(year);
	const formattedTime = dayjs(date).format("HH-mm-ss"); // Hyphens for cross-platform

	return {
		yearFolder: `year-${year}-${zodiac.en}`,
		monthFolder: `month-${String(month + 1).padStart(2, "0")}-${MONTH_NAMES[month]}`,
		dayFolder: `day-${String(day).padStart(2, "0")}-${WEEKDAY_NAMES[weekday]}`,
		filename: `diary-${timestamp}-${formattedTime}`,
	};
}

/**
 * 生成日记内容（Lexical JSON 格式）
 * 包含模板标签：diary, notes
 * 显示完整的英文日期时间格式
 *
 * @param date - 日期，默认为当前时间
 * @returns Lexical JSON 字符串
 */
export function generateDiaryContent(date: Date = new Date()): string {
	// Format: "Monday, December 16, 2024 at 2:30 PM"
	const dateStr = date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const timeStr = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});

	const fullDateTime = `${dateStr} at ${timeStr}`;

	const content = {
		root: {
			children: [
				// Tags line: #[diary] #[notes]
				{
					children: [
						{
							type: "tag",
							version: 1,
							tagName: "diary",
							text: "#[diary]",
							format: 0,
							style: "",
							detail: 2,
							mode: "segmented",
						},
						{
							type: "text",
							version: 1,
							text: " ",
							format: 0,
							style: "",
							detail: 0,
							mode: "normal",
						},
						{
							type: "tag",
							version: 1,
							tagName: "notes",
							text: "#[notes]",
							format: 0,
							style: "",
							detail: 2,
							mode: "segmented",
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// Empty line
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// Date and time heading
				{
					children: [
						{
							type: "text",
							version: 1,
							text: fullDateTime,
							format: 0,
							style: "",
							detail: 0,
							mode: "normal",
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				// Empty line, ready to start writing
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};

	return JSON.stringify(content);
}
