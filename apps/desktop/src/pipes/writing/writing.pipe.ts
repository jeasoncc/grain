/**
 * @file pipes/writing/writing.pipe.ts
 * @description Writing 纯函数
 *
 * 写作状态管理相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import type {
	WritingGoal,
	WritingSession,
	WritingState,
} from "@/types/writing";

// ==============================
// Date Utilities
// ==============================

/**
 * 获取今天的日期（YYYY-MM-DD 格式）
 * 使用提供的日期或当前日期
 *
 * @param date - 可选的日期（默认为当前日期）
 * @returns YYYY-MM-DD 格式的日期字符串
 */
export const getTodayDate = (date: Date = new Date()): string => {
	return date.toISOString().slice(0, 10);
};

/**
 * 检查日期字符串是否匹配今天的日期
 *
 * @param dateString - YYYY-MM-DD 格式的日期字符串
 * @param today - 可选的当前日期用于比较
 * @returns 日期字符串是否匹配今天
 */
export const isToday = (
	dateString: string,
	today: Date = new Date(),
): boolean => {
	return dateString === getTodayDate(today);
};

// ==============================
// Word Count Utilities
// ==============================

/**
 * 计算会话中写入的字数
 *
 * @param session - 写作会话
 * @returns 写入的字数（始终 >= 0）
 */
export const getSessionWordsWritten = (session: WritingSession): number => {
	return Math.max(0, session.currentWordCount - session.startWordCount);
};

/**
 * 计算两个字数之间的差值
 *
 * @param currentCount - 当前字数
 * @param previousCount - 之前的字数
 * @returns 差值（如果删除了字则可能为负数）
 */
export const calculateWordDifference = (
	currentCount: number,
	previousCount: number,
): number => {
	return currentCount - previousCount;
};

/**
 * 计算每日目标的完成进度百分比
 *
 * @param todayWordCount - 今天写入的字数
 * @param goal - 写作目标配置
 * @returns 进度百分比（0-100，上限为 100）
 */
export const calculateGoalProgress = (
	todayWordCount: number,
	goal: WritingGoal,
): number => {
	if (!goal.enabled || goal.dailyTarget <= 0) {
		return 0;
	}
	return Math.min(100, (todayWordCount / goal.dailyTarget) * 100);
};

/**
 * 检查每日目标是否已达成
 *
 * @param todayWordCount - 今天写入的字数
 * @param goal - 写作目标配置
 * @returns 目标是否已达成
 */
export const isGoalReached = (
	todayWordCount: number,
	goal: WritingGoal,
): boolean => {
	if (!goal.enabled) {
		return false;
	}
	return todayWordCount >= goal.dailyTarget;
};

/**
 * 计算达成每日目标还需要的字数
 *
 * @param todayWordCount - 今天写入的字数
 * @param goal - 写作目标配置
 * @returns 剩余字数（如果目标已达成或禁用则为 0）
 */
export const getRemainingWords = (
	todayWordCount: number,
	goal: WritingGoal,
): number => {
	if (!goal.enabled) {
		return 0;
	}
	return Math.max(0, goal.dailyTarget - todayWordCount);
};

// ==============================
// Session Utilities
// ==============================

/**
 * 创建新的写作会话
 *
 * @param wordCount - 初始字数
 * @param startTime - 可选的开始时间（默认为当前时间）
 * @returns 新的写作会话对象
 */
export const createSession = (
	wordCount: number,
	startTime: number = Date.now(),
): WritingSession => {
	return {
		startTime,
		startWordCount: wordCount,
		currentWordCount: wordCount,
	};
};

/**
 * 更新会话的当前字数
 * 返回新的会话对象，不修改原对象
 *
 * @param session - 当前会话
 * @param wordCount - 新的字数
 * @returns 更新后的新会话对象
 */
export const updateSessionCount = (
	session: WritingSession,
	wordCount: number,
): WritingSession => {
	return {
		...session,
		currentWordCount: wordCount,
	};
};

/**
 * 计算会话持续时间（分钟）
 *
 * @param session - 写作会话
 * @param currentTime - 可选的当前时间（默认为 Date.now()）
 * @returns 持续时间（分钟）
 */
export const getSessionDuration = (
	session: WritingSession,
	currentTime: number = Date.now(),
): number => {
	return Math.floor((currentTime - session.startTime) / 60000);
};

/**
 * 计算会话的每分钟字数
 *
 * @param session - 写作会话
 * @param currentTime - 可选的当前时间（默认为 Date.now()）
 * @returns 每分钟字数（如果持续时间为 0 则返回 0）
 */
export const getWordsPerMinute = (
	session: WritingSession,
	currentTime: number = Date.now(),
): number => {
	const duration = getSessionDuration(session, currentTime);
	if (duration <= 0) {
		return 0;
	}
	const wordsWritten = getSessionWordsWritten(session);
	return Math.round(wordsWritten / duration);
};

// ==============================
// State Update Utilities
// ==============================

/**
 * 合并部分写作目标与现有目标
 * 返回新的目标对象，不修改原对象
 *
 * @param currentGoal - 当前写作目标
 * @param updates - 要应用的部分更新
 * @returns 应用更新后的新写作目标
 */
export const mergeWritingGoal = (
	currentGoal: WritingGoal,
	updates: Partial<WritingGoal>,
): WritingGoal => {
	return {
		...currentGoal,
		...updates,
	};
};

/**
 * 计算会话更新后的今日字数
 * 处理日期变更，只计算正向字数差异
 *
 * @param state - 当前写作状态
 * @param newWordCount - 会话中的新字数
 * @param today - 当前日期字符串
 * @returns 包含更新后的 todayWordCount 和 todayDate 的对象
 */
export const calculateTodayWordCountUpdate = (
	state: Pick<WritingState, "todayWordCount" | "todayDate" | "session">,
	newWordCount: number,
	today: string,
): { readonly todayWordCount: number; readonly todayDate: string } => {
	if (!state.session) {
		return { todayWordCount: state.todayWordCount, todayDate: state.todayDate };
	}

	const wordsWritten = newWordCount - state.session.currentWordCount;

	// 只计算正向字数差异
	if (wordsWritten <= 0) {
		return { todayWordCount: state.todayWordCount, todayDate: state.todayDate };
	}

	// 如果日期变更，从新字数开始计算
	if (state.todayDate !== today) {
		return { todayWordCount: wordsWritten, todayDate: today };
	}

	// 同一天，累加到现有计数
	return {
		todayWordCount: state.todayWordCount + wordsWritten,
		todayDate: today,
	};
};
