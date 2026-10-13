import { describe, expect, it } from "vitest"
import { createOrgTodoStateCommand } from "./org-todo-state.command"

const stamp = "[2025-04-01 Tue 09:07]"
const context = (content: string) => ({ relativePath: "owned.org", content, cursor: content.indexOf("* TODO") })
describe("shared TODO state command", () => {
	it("returns one source batch for a direct configured keyword", () => {
		const origin = context("#+TODO: TODO NEXT(@) | DONE\n* TODO task\n")
		const command = createOrgTodoStateCommand()
		expect(command.id).toBe("org.heading.todo-state")
		const result = command.execute(origin, origin, "DONE", { today: "2025-04-01", logStamp: stamp })
		expect(result).toMatchObject({ kind: "batch", batch: { changes: [{ insert: "DONE" }] } })
		expect(command.execute(origin, { ...origin, content: "changed" }, "DONE", { today: "2025-04-01", logStamp: stamp })).toMatchObject({ reason: "content-changed" })
	})
	it("retains setup time and exact input through required-note continuation", () => {
		const origin = context("#+TODO: TODO | DONE(@)\n* TODO task\n")
		const command = createOrgTodoStateCommand()
		const request = command.execute(origin, origin, "DONE", { today: "2025-04-01", logStamp: stamp })
		if (request.kind !== "needs-note") throw new Error(request.kind)
		expect(request.request.stamp).toBe(stamp)
		expect(Object.isFrozen(request.request)).toBe(true)
		const finished = command.execute(origin, origin, request.request.input!, { ...request.request.context!, logStamp: request.request.stamp, note: "literal\r\n* injected\0" })
		if (finished.kind !== "batch") throw new Error(finished.kind)
		expect(finished.batch.changes.map((edit) => edit.insert).join("")).toContain(stamp)
	})
	it("completes recurring tasks without advancing their source date", () => {
		const origin = context("* TODO task\n<2025-03-01 Sat +1w>\n")
		const command = createOrgTodoStateCommand({}, true)
		expect(command.id).toBe("org.heading.complete-repeating")
		const result = command.execute(origin, origin, "DONE", { today: "2025-04-01", logStamp: stamp })
		if (result.kind !== "batch") throw new Error(result.kind)
		let output = origin.content
		for (const edit of [...result.batch.changes].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toBe("* DONE task\n<2025-03-01 Sat +0w>\n")
	})
})
