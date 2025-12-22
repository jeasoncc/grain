/**
 * @file fn/date/index.ts
 * @description Date 纯函数模块统一导出
 *
 * 导出所有日期相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 1.1, 3.1, 3.2, 3.3
 */

// 中国传统日期函数
export {
	getChineseEra,
	getChineseHour,
	getZodiacAnimal,
	type ZodiacAnimal,
} from "./date.chinese.fn";

// 日期目录结构函数
export {
	buildFilePath,
	buildFolderPath,
	type DateFolderStructure,
	type DateFolderStructureWithFilename,
	getDateFolderStructure,
	getDateFolderStructureWithFilename,
	getMonthName,
	getWeekdayName,
} from "./date.folder.fn";
