/**
 * 日记服务 - 实现类似 org-roam 的日记功能
 * 支持中国农历、生肖、天干地支、十二时辰等
 */

import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db/curd";

// 生肖
const ZODIAC_ANIMALS = [
  "鼠", "牛", "虎", "兔", "龙", "蛇",
  "马", "羊", "猴", "鸡", "狗", "猪"
];

const ZODIAC_ANIMALS_EN = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
];

// 天干
const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 地支
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 十二时辰
const CHINESE_HOURS = [
  { name: "子时", period: "23:00-01:00" },
  { name: "丑时", period: "01:00-03:00" },
  { name: "寅时", period: "03:00-05:00" },
  { name: "卯时", period: "05:00-07:00" },
  { name: "辰时", period: "07:00-09:00" },
  { name: "巳时", period: "09:00-11:00" },
  { name: "午时", period: "11:00-13:00" },
  { name: "未时", period: "13:00-15:00" },
  { name: "申时", period: "15:00-17:00" },
  { name: "酉时", period: "17:00-19:00" },
  { name: "戌时", period: "19:00-21:00" },
  { name: "亥时", period: "21:00-23:00" },
];

// 月份英文名
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// 星期英文名
const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

/**
 * 获取生肖
 */
export function getZodiacAnimal(year: number): { cn: string; en: string } {
  const index = (year - 1900) % 12;
  return {
    cn: ZODIAC_ANIMALS[index],
    en: ZODIAC_ANIMALS_EN[index],
  };
}

/**
 * 获取天干地支纪年
 */
export function getChineseEra(year: number): string {
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

/**
 * 获取当前时辰
 */
export function getChineseHour(hour: number): { name: string; period: string } {
  // 子时从23点开始
  const index = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  return CHINESE_HOURS[index];
}

/**
 * 获取完整的日期信息
 */
export function getDateInfo(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();
  const hour = date.getHours();

  const zodiac = getZodiacAnimal(year);
  const chineseEra = getChineseEra(year);
  const chineseHour = getChineseHour(hour);

  return {
    year,
    month: month + 1,
    monthName: MONTH_NAMES[month],
    day,
    weekday: WEEKDAY_NAMES[weekday],
    hour,
    minute: date.getMinutes(),
    second: date.getSeconds(),
    timestamp: Math.floor(date.getTime() / 1000),
    zodiac,
    chineseEra,
    chineseHour,
    formatted: {
      date: dayjs(date).format("YYYY-MM-DD"),
      time: dayjs(date).format("HH:mm:ss"),
      datetime: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      yearFolder: `${year}-${zodiac.en}`,
      monthFolder: `${String(month + 1).padStart(2, "0")}-${MONTH_NAMES[month]}`,
      dayFolder: `${String(day).padStart(2, "0")}-${WEEKDAY_NAMES[weekday]}`,
    },
  };
}

/**
 * 生成日记初始内容 (Lexical JSON 格式)
 */
export function generateDiaryContent(dateInfo: ReturnType<typeof getDateInfo>): string {
  const { zodiac, chineseEra, chineseHour, formatted } = dateInfo;
  
  // 创建 Lexical 编辑器的初始内容
  const content = {
    root: {
      children: [
        // 标题
        {
          children: [
            {
              detail: 0,
              format: 1, // bold
              mode: "normal",
              style: "",
              text: `📅 ${formatted.date} ${dateInfo.weekday}`,
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "heading",
          version: 1,
          tag: "h1",
        },
        // 元信息
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: `🐲 ${chineseEra}年 ${zodiac.cn}年 | ⏰ ${chineseHour.name} (${chineseHour.period}) | 🕐 ${formatted.time}`,
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        },
        // 分隔线
        {
          type: "horizontalrule",
          version: 1,
        },
        // TODO 部分
        {
          children: [
            {
              detail: 0,
              format: 1,
              mode: "normal",
              style: "",
              text: "📋 TODO",
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "heading",
          version: 1,
          tag: "h2",
        },
        // 待办列表
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "待办事项 1",
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "listitem",
          version: 1,
          value: 1,
          checked: false,
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "待办事项 2",
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "listitem",
          version: 1,
          value: 2,
          checked: false,
        },
        // 内容部分
        {
          children: [
            {
              detail: 0,
              format: 1,
              mode: "normal",
              style: "",
              text: "📝 内容",
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "heading",
          version: 1,
          tag: "h2",
        },
        // 空段落供用户输入
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

/**
 * 日记项目名称
 */
export const DIARY_PROJECT_NAME = "📔 日记本";

/**
 * 获取或创建日记项目
 */
export async function getOrCreateDiaryProject(): Promise<string> {
  const projects = await db.getAllProjects();
  const diaryProject = projects.find(p => p.title === DIARY_PROJECT_NAME);
  
  if (diaryProject) {
    return diaryProject.id;
  }

  // 创建日记项目
  const newProject = await db.addProject({
    title: DIARY_PROJECT_NAME,
    author: "Me",
    description: "个人日记，记录每一天的点滴",
    language: "zh",
  });

  return newProject.id;
}

/**
 * 获取或创建年份章节
 */
async function getOrCreateYearChapter(projectId: string, dateInfo: ReturnType<typeof getDateInfo>): Promise<string> {
  const chapters = await db.getChaptersByProject(projectId);
  const yearTitle = `📅 ${dateInfo.formatted.yearFolder}`;
  const yearChapter = chapters.find(c => c.title === yearTitle);

  if (yearChapter) {
    return yearChapter.id;
  }

  const newChapter = await db.addChapter({
    project: projectId,
    title: yearTitle,
    order: dateInfo.year,
    open: true,
  });

  return newChapter.id;
}

/**
 * 创建新日记
 */
export async function createDiary(date: Date = new Date()): Promise<{
  projectId: string;
  chapterId: string;
  sceneId: string;
  dateInfo: ReturnType<typeof getDateInfo>;
}> {
  const dateInfo = getDateInfo(date);
  
  // 获取或创建日记项目
  const projectId = await getOrCreateDiaryProject();
  
  // 获取或创建年份章节
  const chapterId = await getOrCreateYearChapter(projectId, dateInfo);
  
  // 创建日记场景
  const sceneTitle = `${dateInfo.formatted.monthFolder}/${dateInfo.formatted.dayFolder} ${dateInfo.formatted.time}`;
  const content = generateDiaryContent(dateInfo);
  
  const scene = await db.addScene({
    project: projectId,
    chapter: chapterId,
    title: sceneTitle,
    content,
    order: dateInfo.timestamp,
    type: "text",
  });

  return {
    projectId,
    chapterId,
    sceneId: scene.id,
    dateInfo,
  };
}

/**
 * 获取今天的日记列表
 */
export async function getTodayDiaries(): Promise<Array<{
  id: string;
  title: string;
  createDate: string;
}>> {
  const projectId = await getOrCreateDiaryProject();
  const scenes = await db.getScenesByProject(projectId);
  
  const today = dayjs().format("YYYY-MM-DD");
  
  return scenes
    .filter(s => s.createDate?.startsWith(today))
    .map(s => ({
      id: s.id,
      title: s.title,
      createDate: s.createDate || "",
    }));
}

/**
 * 获取所有日记（按日期分组）
 */
export async function getAllDiaries(): Promise<Map<string, Array<{
  id: string;
  title: string;
  createDate: string;
}>>> {
  const projectId = await getOrCreateDiaryProject();
  const scenes = await db.getScenesByProject(projectId);
  
  const grouped = new Map<string, Array<{ id: string; title: string; createDate: string }>>();
  
  for (const scene of scenes) {
    const date = scene.createDate?.split("T")[0] || "unknown";
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push({
      id: scene.id,
      title: scene.title,
      createDate: scene.createDate || "",
    });
  }
  
  return grouped;
}
