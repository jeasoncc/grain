/**
 * Diary V2 Service - Integrated with File Tree
 * Creates diary entries as nodes in the workspace file tree structure.
 * Compatible with org-roam folder hierarchy and naming conventions.
 *
 * Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import dayjs from "dayjs";
import { NodeRepository, ContentRepository, type NodeInterface } from "@/db/models";
import { database } from "@/db/database";

// ==============================
// Constants
// ==============================

/** Diary root folder name */
export const DIARY_ROOT_FOLDER = "📔 日记";

// Zodiac animals (Chinese and English)
const ZODIAC_ANIMALS = [
  "鼠", "牛", "虎", "兔", "龙", "蛇",
  "马", "羊", "猴", "鸡", "狗", "猪"
];

const ZODIAC_ANIMALS_EN = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

// Heavenly Stems (天干)
const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// Earthly Branches (地支)
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// Chinese hours (十二时辰)
const CHINESE_HOURS = [
  "子时", "丑时", "寅时", "卯时", "辰时", "巳时",
  "午时", "未时", "申时", "酉时", "戌时", "亥时"
];

// Month names in English
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Weekday names in English
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

export interface DiaryMetadata {
  title: string;
  author: string;
  email: string;
  date: string;
  year: string;         // "甲辰 Dragon"
  createTime: string;   // "2024-12-14 14:30:00 未时"
  device: string;
  tags: string[];
}

// ==============================
// Calculation Functions
// ==============================

/**
 * Get zodiac animal for a given year
 */
export function getZodiacAnimal(year: number): { cn: string; en: string } {
  const index = (year - 1900) % 12;
  return {
    cn: ZODIAC_ANIMALS[index],
    en: ZODIAC_ANIMALS_EN[index],
  };
}

/**
 * Get Chinese era (天干地支) for a given year
 */
export function getChineseEra(year: number): string {
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

/**
 * Get Chinese hour (时辰) for a given hour (0-23)
 */
export function getChineseHour(hour: number): string {
  // 子时 starts at 23:00
  const index = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  return CHINESE_HOURS[index];
}

// ==============================
// Folder Structure Functions
// ==============================

/**
 * Generate diary folder structure for a given date
 * Uses cross-platform compatible naming (hyphens instead of colons)
 *
 * Requirements: 5.1
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

// ==============================
// Content Generation
// ==============================

/**
 * Generate diary content in Lexical JSON format
 * Simplified: just an empty document ready for writing
 */
export function generateDiaryContent(): string {
  const content = {
    root: {
      children: [
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

// ==============================
// File Tree Integration
// ==============================

/**
 * Get or create a folder node by title under a parent
 */
async function getOrCreateFolder(
  workspaceId: string,
  parentId: string | null,
  title: string
): Promise<NodeInterface> {
  const nodes = await NodeRepository.getByWorkspace(workspaceId);
  const existing = nodes.find(
    (n) => n.parent === parentId && n.title === title && n.type === "folder"
  );

  if (existing) {
    return existing;
  }

  return NodeRepository.add(workspaceId, title, {
    parent: parentId,
    type: "folder",
    collapsed: false,
  });
}

/**
 * Create a diary entry in the file tree
 * Creates the full folder hierarchy: 📔 日记 > year > month > day > diary file
 *
 * Requirements: 1.1, 1.2, 1.3
 *
 * @param workspaceId - The workspace to create the diary in
 * @param date - Optional date for the diary (defaults to now)
 * @returns The created diary node
 */
export async function createDiaryInFileTree(
  workspaceId: string,
  date: Date = new Date()
): Promise<NodeInterface> {
  const structure = getDiaryFolderStructure(date);

  // Create folder hierarchy
  const diaryRoot = await getOrCreateFolder(workspaceId, null, DIARY_ROOT_FOLDER);
  const yearFolder = await getOrCreateFolder(workspaceId, diaryRoot.id, structure.yearFolder);
  const monthFolder = await getOrCreateFolder(workspaceId, yearFolder.id, structure.monthFolder);
  const dayFolder = await getOrCreateFolder(workspaceId, monthFolder.id, structure.dayFolder);

  // Generate diary content
  const content = generateDiaryContent();

  // Create diary file node
  const diaryNode = await NodeRepository.add(workspaceId, structure.filename, {
    parent: dayFolder.id,
    type: "diary",
    collapsed: false,
  });

  // Create content record for the diary
  await ContentRepository.add(diaryNode.id, content, "lexical");

  return diaryNode;
}
