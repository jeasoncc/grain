import { describe, expect, it } from "vitest"
import {
	deriveOrgCommands,
	dispatchOrgCommand,
	getOrgCommandDisabledReason,
	getOrgParameterCommand,
	type OrgCommandContext,
} from "./org-workspace-command"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"

const context: OrgCommandContext = {
	hasWorkspace: true,
	hasDocument: true,
	isDirty: true,
	isBusy: false,
	sidebarVisible: false,
	inspectorVisible: false,
	editor: { ownership: {}, revision: 0, available: true, readOnly: false, relativePath: "note.org", content: "* TODO Work\nbody\n", cursor: 2 },
}

describe("current-target command authority", () => {
	it("rechecks current dirty, busy and document state before executing an effect", () => {
		let current = context
		let saves = 0
		const dispatcher = { getContext: () => current, execute: () => { saves++; return true } }
		const rendered = deriveOrgCommands(current).find((entry) => entry.id === "save")!
		expect(rendered.disabled).toBe(false)
		current = { ...context, isBusy: true }
		expect(dispatchOrgCommand(rendered.id, dispatcher)).toBe(false)
		current = { ...context, isDirty: false }
		expect(dispatchOrgCommand(rendered.id, dispatcher)).toBe(false)
		current = { ...context, hasDocument: false }
		expect(dispatchOrgCommand(rendered.id, dispatcher)).toBe(false)
		expect(saves).toBe(0)
		current = context
		expect(dispatchOrgCommand(rendered.id, dispatcher)).toBe(true)
		expect(saves).toBe(1)
	})

	it("does not execute an editor command after its target is retired or made read-only", () => {
		let current = context
		let source = context.editor!.content
		const dispatcher = { getContext: () => current, execute: () => { source = "changed"; return true } }
		expect(deriveOrgCommands(current).find((entry) => entry.id === "tags")?.disabled).toBe(false)
		current = { ...context, editor: { ...context.editor!, available: false } }
		expect(dispatchOrgCommand("tags", dispatcher)).toBe(false)
		current = { ...context, editor: { ...context.editor!, readOnly: true } }
		expect(dispatchOrgCommand("tags", dispatcher)).toBe(false)
		current = { ...context, blockedReason: "A parameter command owns this window" }
		expect(dispatchOrgCommand("tags", dispatcher)).toBe(false)
		expect(source).toBe(context.editor!.content)
	})

	it("uses real Org prerequisite readers for heading, checkbox, link and subtree commands", () => {
		const at = (content: string, cursor = 0): OrgCommandContext => ({
			...context, isDirty: false, editor: { ...context.editor!, content, cursor },
		})
		expect(getOrgCommandDisabledReason("tags", at("preamble"))).not.toBeNull()
		expect(getOrgCommandDisabledReason("tags", at("* Heading\n#+begin_src\n* Fake\n#+end_src", 25))).not.toBeNull()
		expect(getOrgCommandDisabledReason("checkbox", at("- [ ] item", 4))).toBeNull()
		expect(getOrgCommandDisabledReason("checkbox", at("* Heading"))).not.toBeNull()
		expect(getOrgCommandDisabledReason("link", at("[[file:other.org]]", 4))).toBeNull()
		expect(getOrgCommandDisabledReason("link", at("* Heading"))).not.toBeNull()
		expect(getOrgCommandDisabledReason("refile", at("* Heading\nbody", 11))).not.toBeNull()
		expect(getOrgCommandDisabledReason("refile", at("* Heading\nbody", 2))).toBeNull()
		expect(getOrgCommandDisabledReason("archive", { ...at("* Heading"), isDirty: true })).not.toBeNull()
		expect(getOrgCommandDisabledReason("sparse-tree", at("preamble"))).toBeNull()
	})

	it("rejects malformed planning and property drawers before starting parameter input", () => {
		for (const id of ["scheduled", "deadline", "property"] as const) {
			const current = { ...context, editor: { ...context.editor!, content: "* Work\n:PROPERTIES:\n:ID: work\n", cursor: 2 } }
			expect(getOrgCommandDisabledReason(id, current)).not.toBeNull()
		}
		const malformedDate = { ...context, editor: { ...context.editor!, content: "* Work\nSCHEDULED: <2026-99-42>", cursor: 2 } }
		expect(getOrgCommandDisabledReason("scheduled", malformedDate)).not.toBeNull()
	})


	it("validates planning source before reading the default-day clock", () => {
		let reads = 0
		const command = getOrgParameterCommand("scheduled", "", () => {
			reads++
			return new Date(2026, 9, 5, 12)
		})!
		expect(command.prepare({ relativePath: "note.org", content: "preamble", cursor: 0 })).toMatchObject({ kind: "rejected" })
		expect(reads).toBe(0)
		expect(command.prepare(context.editor!)).toMatchObject({ kind: "ready" })
		expect(reads).toBe(1)
		const existing = { ...context.editor!, content: "* Work\nSCHEDULED: <2026-10-09>", cursor: 2 }
		const prepared = command.prepare(existing)
		if (prepared.kind !== "ready") throw new Error("Expected validated planning origin")
		expect(command.execute(prepared.context, existing, "<2026-10-09>")).toMatchObject({ kind: "no-change" })
		expect(reads).toBe(1)
	})


	it("fails closed for unrecognized commands and executor refusal", () => {
		let calls = 0
		const dispatcher = { getContext: () => context, execute: () => { calls++; return false } }
		for (const id of [undefined, null, "__proto__", "toString", "SAVE", "execute-command"])
			expect(dispatchOrgCommand(id, dispatcher)).toBe(false)
		expect(calls).toBe(0)
		expect(dispatchOrgCommand("save", dispatcher)).toBe(false)
		expect(calls).toBe(1)
	})

	it("allows view toggles while busy", () => {
		expect(getOrgCommandDisabledReason("toggle-sidebar", { ...context, isBusy: true })).toBeNull()
	})
})

describe("Source-only parameter command metadata", () => {
	it("keeps the new operations editor-scoped with no aliases or new default bindings", () => {
		const source = { ...context, hasWorkspace: false }
		for (const id of ["remove-scheduled", "remove-deadline", "todo-state", "complete-repeating"] as const) {
			const command = deriveOrgCommands(source).find(command => command.id === id)!
			expect(command.scope).toBe("editor")
			expect(command.disabled).toBe(false)
			expect(command.shortcut).toBeUndefined()
			expect(command.prefix).toBeUndefined()
			expect(command.requires).not.toContain("workspace")
			expect(getOrgParameterCommand(id, "")).not.toBeNull()
			expect(getOrgCommandDisabledReason(id, { ...source, editor: { ...source.editor!, readOnly: true } })).not.toBeNull()
			expect(getOrgCommandDisabledReason(`org.heading.${id}`, source)).not.toBeNull()
		}
	})

	it("uses the actual configured TODO states and frozen logging setup in the shared factory", () => {
		const content = "#+TODO: OPEN WAIT | FINISHED CANCELLED\r\n* OPEN Work\r\nraw\0😀\r\n"
		const origin = { relativePath: "note.org", content, cursor: content.indexOf("* OPEN") + 2 }
		const configuration = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
			logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, done: "note" as const } }
		const command = getOrgParameterCommand("todo-state", "", undefined, configuration)!
		expect(command.prepare(origin)).toMatchObject({ kind: "ready", initialInput: "", candidates: ["OPEN", "WAIT", "FINISHED", "CANCELLED"] })
		const stamp = "[2026-10-14 Wed 23:55]"
		const setup = { today: "2026-10-14", logStamp: stamp }
		const pending = command.execute(origin, origin, "FINISHED", setup)
		expect(pending).toMatchObject({ kind: "needs-note", request: { stamp, input: "FINISHED", context: setup } })
		const finished = command.execute(origin, origin, "FINISHED", { ...setup, note: "literal note\0😀" })
		expect(finished.kind).toBe("batch")
	})

	it.each([
		[1, 0, true, false],
		[3, 1, false, true],
	] as const)("separates default and replacement endpoints for a %s-dash range", (dashCount, gapOffset, rightDefault, rightTarget) => {
		const left = "<2026-10-14 Wed 10:00 +1w>", right = "[2026-10-15 Thu 11:00 +2w]"
		const content = `* Heading\r\n${left}${"-".repeat(dashCount)}${right}\r\nraw\0😀\n`
		const origin = { relativePath: "note.org", content, cursor: content.indexOf(left) + left.length + gapOffset }
		const command = getOrgParameterCommand("timestamp-active", "")!
		const prepared = command.prepare(origin)
		expect(prepared).toMatchObject({ kind: "ready", initialInput: rightDefault ? right : left })
		if (prepared.kind !== "ready") throw new Error("Expected the selected timestamp endpoint")
		const result = command.execute(prepared.context, origin, prepared.initialInput)
		expect(result.kind).toBe("edit")
		if (result.kind !== "edit") throw new Error("Expected one raw endpoint replacement")
		expect([result.edit.from, result.edit.to]).toEqual([content.indexOf(rightTarget ? right : left), content.indexOf(rightTarget ? right : left) + (rightTarget ? right.length : left.length)])
		expect(result.edit.insert).toBe(rightDefault ? "<2026-10-15 11:00 +2w>" : "<2026-10-14 10:00 +1w>")
	})
})

