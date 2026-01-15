/**
 * @file fn/writing/writing.fn.test.ts
 * @description Writing 纯函数测试
 */

import { describe, expect, it } from "vitest"
import type { WritingGoal, WritingSession } from "@/types/writing"
import {
	calculateGoalProgress,
	calculateTodayWordCountUpdate,
	calculateWordDifference,
	createSession,
	getRemainingWords,
	getSessionDuration,
	getSessionWordsWritten,
	getTodayDate,
	getWordsPerMinute,
	isGoalReached,
	isToday,
	mergeWritingGoal,
	updateSessionCount,
} from "./writing.fn"

describe("getTodayDate", () => {
	it("should return date in YYYY-MM-DD format", () => {
		const date = new Date("2024-03-15T10:30:00Z")
		const result = getTodayDate(date)
		expect(result).toBe("2024-03-15")
	})

	it("should handle different dates correctly", () => {
		const date = new Date("2023-12-31T23:59:59Z")
		const result = getTodayDate(date)
		expect(result).toBe("2023-12-31")
	})
})

describe("isToday", () => {
	it("should return true for matching date", () => {
		const today = new Date("2024-03-15T10:30:00Z")
		expect(isToday("2024-03-15", today)).toBe(true)
	})

	it("should return false for non-matching date", () => {
		const today = new Date("2024-03-15T10:30:00Z")
		expect(isToday("2024-03-14", today)).toBe(false)
	})
})

describe("getSessionWordsWritten", () => {
	it("should calculate words written correctly", () => {
		const session: WritingSession = {
			currentWordCount: 150,
			startTime: Date.now(),
			startWordCount: 100,
		}
		expect(getSessionWordsWritten(session)).toBe(50)
	})

	it("should return 0 when words deleted", () => {
		const session: WritingSession = {
			currentWordCount: 80,
			startTime: Date.now(),
			startWordCount: 100,
		}
		expect(getSessionWordsWritten(session)).toBe(0)
	})

	it("should return 0 when no change", () => {
		const session: WritingSession = {
			currentWordCount: 100,
			startTime: Date.now(),
			startWordCount: 100,
		}
		expect(getSessionWordsWritten(session)).toBe(0)
	})
})

describe("calculateWordDifference", () => {
	it("should calculate positive difference", () => {
		expect(calculateWordDifference(150, 100)).toBe(50)
	})

	it("should calculate negative difference", () => {
		expect(calculateWordDifference(80, 100)).toBe(-20)
	})

	it("should return 0 for same values", () => {
		expect(calculateWordDifference(100, 100)).toBe(0)
	})
})

describe("calculateGoalProgress", () => {
	it("should calculate progress correctly", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(calculateGoalProgress(500, goal)).toBe(50)
	})

	it("should cap at 100%", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(calculateGoalProgress(1500, goal)).toBe(100)
	})

	it("should return 0 when goal disabled", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: false }
		expect(calculateGoalProgress(500, goal)).toBe(0)
	})

	it("should return 0 when target is 0", () => {
		const goal: WritingGoal = { dailyTarget: 0, enabled: true }
		expect(calculateGoalProgress(500, goal)).toBe(0)
	})
})

describe("isGoalReached", () => {
	it("should return true when goal reached", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(isGoalReached(1000, goal)).toBe(true)
	})

	it("should return true when exceeded", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(isGoalReached(1500, goal)).toBe(true)
	})

	it("should return false when not reached", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(isGoalReached(500, goal)).toBe(false)
	})

	it("should return false when disabled", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: false }
		expect(isGoalReached(1500, goal)).toBe(false)
	})
})

describe("getRemainingWords", () => {
	it("should calculate remaining words", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(getRemainingWords(300, goal)).toBe(700)
	})

	it("should return 0 when goal reached", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(getRemainingWords(1000, goal)).toBe(0)
	})

	it("should return 0 when exceeded", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		expect(getRemainingWords(1500, goal)).toBe(0)
	})

	it("should return 0 when disabled", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: false }
		expect(getRemainingWords(300, goal)).toBe(0)
	})
})

describe("createSession", () => {
	it("should create session with provided values", () => {
		const session = createSession(100, 1000)
		expect(session.startWordCount).toBe(100)
		expect(session.currentWordCount).toBe(100)
		expect(session.startTime).toBe(1000)
	})

	it("should use current time when not provided", () => {
		const before = Date.now()
		const session = createSession(100)
		const after = Date.now()
		expect(session.startTime).toBeGreaterThanOrEqual(before)
		expect(session.startTime).toBeLessThanOrEqual(after)
	})
})

describe("updateSessionCount", () => {
	it("should update word count immutably", () => {
		const session: WritingSession = {
			currentWordCount: 100,
			startTime: 1000,
			startWordCount: 100,
		}
		const updated = updateSessionCount(session, 150)
		expect(updated.currentWordCount).toBe(150)
		expect(updated.startWordCount).toBe(100)
		expect(updated.startTime).toBe(1000)
		// 原对象不变
		expect(session.currentWordCount).toBe(100)
	})
})

describe("getSessionDuration", () => {
	it("should calculate duration in minutes", () => {
		const session: WritingSession = {
			currentWordCount: 150,
			startTime: 0,
			startWordCount: 100,
		}
		// 10 分钟 = 600000 毫秒
		expect(getSessionDuration(session, 600000)).toBe(10)
	})

	it("should return 0 for very short sessions", () => {
		const session: WritingSession = {
			currentWordCount: 150,
			startTime: 0,
			startWordCount: 100,
		}
		expect(getSessionDuration(session, 30000)).toBe(0)
	})
})

describe("getWordsPerMinute", () => {
	it("should calculate WPM correctly", () => {
		const session: WritingSession = {
			currentWordCount: 100,
			startTime: 0,
			startWordCount: 0,
		}
		// 10 分钟写了 100 字 = 10 WPM
		expect(getWordsPerMinute(session, 600000)).toBe(10)
	})

	it("should return 0 for zero duration", () => {
		const session: WritingSession = {
			currentWordCount: 100,
			startTime: 0,
			startWordCount: 0,
		}
		expect(getWordsPerMinute(session, 0)).toBe(0)
	})
})

describe("mergeWritingGoal", () => {
	it("should merge partial updates", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		const merged = mergeWritingGoal(goal, { dailyTarget: 2000 })
		expect(merged.dailyTarget).toBe(2000)
		expect(merged.enabled).toBe(true)
	})

	it("should not mutate original", () => {
		const goal: WritingGoal = { dailyTarget: 1000, enabled: true }
		mergeWritingGoal(goal, { dailyTarget: 2000 })
		expect(goal.dailyTarget).toBe(1000)
	})
})

describe("calculateTodayWordCountUpdate", () => {
	it("should add words to today count", () => {
		const state = {
			session: {
				currentWordCount: 50,
				startTime: 0,
				startWordCount: 0,
			},
			todayDate: "2024-03-15",
			todayWordCount: 100,
		}
		const result = calculateTodayWordCountUpdate(state, 100, "2024-03-15")
		expect(result.todayWordCount).toBe(150)
		expect(result.todayDate).toBe("2024-03-15")
	})

	it("should reset on date change", () => {
		const state = {
			session: {
				currentWordCount: 50,
				startTime: 0,
				startWordCount: 0,
			},
			todayDate: "2024-03-14",
			todayWordCount: 100,
		}
		const result = calculateTodayWordCountUpdate(state, 100, "2024-03-15")
		expect(result.todayWordCount).toBe(50)
		expect(result.todayDate).toBe("2024-03-15")
	})

	it("should not count negative differences", () => {
		const state = {
			session: {
				currentWordCount: 100,
				startTime: 0,
				startWordCount: 0,
			},
			todayDate: "2024-03-15",
			todayWordCount: 100,
		}
		const result = calculateTodayWordCountUpdate(state, 50, "2024-03-15")
		expect(result.todayWordCount).toBe(100)
	})

	it("should return unchanged when no session", () => {
		const state = {
			session: null,
			todayDate: "2024-03-15",
			todayWordCount: 100,
		}
		const result = calculateTodayWordCountUpdate(state, 150, "2024-03-15")
		expect(result.todayWordCount).toBe(100)
		expect(result.todayDate).toBe("2024-03-15")
	})
})
