import { afterEach, describe, expect, it, vi } from "vitest"
import { promptOrgTodoCapture } from "./org-workspace.container.fn"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("promptOrgTodoCapture", () => {
	it("prompts for a title and defaults an empty target to inbox.org", () => {
		vi.spyOn(window, "prompt").mockReturnValueOnce("  Capture me  ").mockReturnValueOnce("")

		expect(promptOrgTodoCapture()).toEqual({
			targetRelativePath: "inbox.org",
			title: "  Capture me  ",
		})
	})

	it("allows an optional relative target path", () => {
		vi.spyOn(window, "prompt")
			.mockReturnValueOnce("Task")
			.mockReturnValueOnce(" projects/tasks.org ")

		expect(promptOrgTodoCapture()).toEqual({
			targetRelativePath: "projects/tasks.org",
			title: "Task",
		})
	})

	it("cancels for blank titles or a cancelled target prompt", () => {
		const prompt = vi.spyOn(window, "prompt").mockReturnValueOnce(" \n ")
		expect(promptOrgTodoCapture()).toBeNull()
		expect(prompt).toHaveBeenCalledOnce()

		prompt.mockReset().mockReturnValueOnce("Task").mockReturnValueOnce(null)
		expect(promptOrgTodoCapture()).toBeNull()
	})
})
