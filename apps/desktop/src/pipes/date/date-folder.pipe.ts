/**
 * @file pipes/date/date-folder.pipe.ts
 * @description Date folder structure pipe - wrapper for date utilities
 *
 * This pipe wraps date utility functions to maintain architecture compliance.
 * flows/ should not directly import from utils/, but can import from pipes/.
 *
 * @requirements Architecture compliance (flows → pipes → utils)
 */

import {
	type DateFolderStructure,
	type DateFolderStructureWithFilename,
	buildFilePath as utilBuildFilePath,
	buildFolderPath as utilBuildFolderPath,
	getChineseEra as utilGetChineseEra,
	getChineseHour as utilGetChineseHour,
	getDateFolderStructure as utilGetDateFolderStructure,
	getDateFolderStructureWithFilename as utilGetDateFolderStructureWithFilename,
	getMonthName as utilGetMonthName,
	getWeekdayName as utilGetWeekdayName,
	getZodiacAnimal as utilGetZodiacAnimal,
	type ZodiacAnimal,
} from "@/utils/date.util"

/**
 * Get date folder structure
 *
 * Generates a hierarchical folder structure based on a date:
 * - Year folder: "year-YYYY-ZodiacAnimal"
 * - Month folder: "month-MM-MonthName"
 * - Day folder: "day-DD-WeekdayName"
 *
 * @param date - Date to generate structure for (defaults to current date)
 * @returns Folder structure object
 */
export const getDateFolderStructure = (date?: Date): DateFolderStructure =>
	utilGetDateFolderStructure(date)

/**
 * Get date folder structure with filename
 *
 * Same as getDateFolderStructure but also includes a generated filename
 * with timestamp and formatted time.
 *
 * @param date - Date to generate structure for (defaults to current date)
 * @param prefix - Filename prefix (defaults to "file")
 * @returns Folder structure with filename
 */
export const getDateFolderStructureWithFilename = (
	date?: Date,
	prefix?: string,
): DateFolderStructureWithFilename => utilGetDateFolderStructureWithFilename(date, prefix)

/**
 * Build folder path from structure
 *
 * Converts a DateFolderStructure into a path string.
 *
 * @param structure - Folder structure object
 * @returns Path string (e.g., "year-2024-Dragon/month-01-January/day-15-Monday")
 */
export const buildFolderPath = (structure: DateFolderStructure): string =>
	utilBuildFolderPath(structure)

/**
 * Build file path from structure with filename
 *
 * Converts a DateFolderStructureWithFilename into a full file path string.
 *
 * @param structure - Folder structure with filename
 * @returns Full file path string
 */
export const buildFilePath = (structure: DateFolderStructureWithFilename): string =>
	utilBuildFilePath(structure)

/**
 * Get zodiac animal for a year
 *
 * Returns the Chinese zodiac animal for a given year in both Chinese and English.
 *
 * @param year - Year to get zodiac for
 * @returns Zodiac animal object with cn and en properties
 */
export const getZodiacAnimal = (year: number): ZodiacAnimal => utilGetZodiacAnimal(year)

/**
 * Get Chinese era (天干地支) for a year
 *
 * Returns the traditional Chinese calendar era name using Heavenly Stems
 * and Earthly Branches.
 *
 * @param year - Year to get era for
 * @returns Chinese era string (e.g., "甲子")
 */
export const getChineseEra = (year: number): string => utilGetChineseEra(year)

/**
 * Get Chinese hour (时辰) for an hour
 *
 * Converts a 24-hour format hour to traditional Chinese hour system.
 *
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Chinese hour string (e.g., "子时")
 */
export const getChineseHour = (hour: number): string => utilGetChineseHour(hour)

/**
 * Get month name
 *
 * Returns the English name of a month.
 *
 * @param month - Month number (0-11)
 * @returns Month name (e.g., "January")
 */
export const getMonthName = (month: number): string => utilGetMonthName(month)

/**
 * Get weekday name
 *
 * Returns the English name of a weekday.
 *
 * @param weekday - Weekday number (0-6, where 0 is Sunday)
 * @returns Weekday name (e.g., "Monday")
 */
export const getWeekdayName = (weekday: number): string => utilGetWeekdayName(weekday)

// Re-export types
export type { DateFolderStructure, DateFolderStructureWithFilename, ZodiacAnimal }
