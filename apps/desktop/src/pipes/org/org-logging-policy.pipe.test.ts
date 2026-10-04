import { describe, expect, it } from "vitest"
import { resolveOrgLoggingPolicy } from "./org-logging-policy.pipe"
import { snapshotOrgLoggingScopes } from "./org-logging-scope.pipe"
import { planOrgTodoTransition } from "./org-todo-logging.pipe"

const stamp = "[2025-04-01 Tue 09:07]"
const props = (value: string) => `:PROPERTIES:\n${value}\n:END:`
const resolve = (source: string) =>
	resolveOrgLoggingPolicy(
		source,
		Object.freeze({
			from:
				source.lastIndexOf("** TODO child") >= 0
					? source.lastIndexOf("** TODO child")
					: source.lastIndexOf("* TODO target"),
		}),
	)
const policy = (source: string) => {
	const result = resolve(source)
	expect(result.kind).toBe("policy")
	if (result.kind !== "policy") throw new Error(result.reason)
	return result.policy
}
const apply = (source: string, note?: string) => {
	const cursor =
		source.lastIndexOf("** TODO child") >= 0
			? source.lastIndexOf("** TODO child")
			: source.lastIndexOf("* TODO target")
	const plan = planOrgTodoTransition(source, cursor, stamp, note)
	if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
	let result = source
	for (const edit of [...plan.edits].reverse())
		result = result.slice(0, edit.from) + edit.insert + result.slice(edit.to)
	return { plan, result }
}

describe("explicit source logging property inheritance", () => {
	it("nil disables file @ and all flags; child overlay re-enables only done", () => {
		const file = "#+TODO: TODO(!/@) NEXT(@/!) | DONE(@)\n#+STARTUP: lognotedone logdrawer\n"
		const source = `${file}* parent\n${props(":LOGGING: nil")}\n** TODO child\n${props(":LOGGING: logdone")}`
		expect(policy(source)).toEqual({
			done: "time",
			drawer: null,
			states: ["TODO", "NEXT", "DONE"].map((state) => ({ incoming: "", outgoing: "", state })),
		})
		const local = `${file}* TODO target\n${props(":LOGGING: nil")}`
		expect(apply(local).result).toBe(local.replace("* TODO", "* NEXT"))
		expect(planOrgTodoTransition(local, local.indexOf("* TODO"), stamp, "old note")).toEqual({
			kind: "rejected",
			reason: "unexpected-note",
		})
	})
	it("partial state and done overlays preserve every unrelated configured flag", () => {
		const source = `#+TODO: TODO(@/!) NEXT(!) | DONE(@)\n#+SEQ_TODO: WAIT(!/@) | FINISH(!)\n#+STARTUP: logdone\n* parent\n${props(":LOGGING: lognotedone")}\n** TODO child\n${props(":logging: nologdone TODO()")}`
		expect(policy(source)).toEqual({
			done: "none",
			drawer: null,
			states: [
				{ incoming: "", outgoing: "", state: "TODO" },
				{ incoming: "!", outgoing: "", state: "NEXT" },
				{ incoming: "!", outgoing: "@", state: "WAIT" },
				{ incoming: "@", outgoing: "", state: "DONE" },
				{ incoming: "!", outgoing: "", state: "FINISH" },
			],
		})
	})
	it("closest nil differs from unset or empty and propagates through repeated levels", () => {
		for (const local of ["", ":LOGGING:"]) {
			const source = `* root\n${props(":LOGGING: lognotedone")}\n** sibling\n${props(":LOGGING: repeat")}\n** parent\n${props(local || ":OTHER:")}\n*** middle\n** TODO child`
			expect(policy(source).done).toBe("note")
			expect(planOrgTodoTransition(source, source.indexOf("** TODO child"), stamp).kind).toBe(
				"needs-note",
			)
		}
		const source = `* root\n${props(":LOGGING: lognotedone")}\n** parent\n${props(":LOGGING: nil")}\n*** middle\n**** middle2\n** TODO child\n${props(":LOGGING: nil")}`
		expect(policy(source).done).toBe("none")
	})
	it("file defaults, LOGGING+ and local plus use the same ordered token accumulation", () => {
		const source = `#+STARTUP: lognotedone\n#+PROPERTY: logging nologdone\n#+PROPERTY: LoGgInG+ logdone TODO(!)\n* parent\n${props(":LOGGING+: DONE(!)\n:LOGGING+: lognotedone")}\n** TODO child\n${props(":LOGGING+: nologdone DONE()")}`
		const effective = policy(source)
		expect(effective.done).toBe("none")
		expect(effective.states).toEqual([
			{ incoming: "!", outgoing: "", state: "TODO" },
			{ incoming: "", outgoing: "", state: "DONE" },
		])
		expect(
			policy(`#+PROPERTY: LOGGING logdone\n${props(":LOGGING+: nologdone")}\n* TODO target`).done,
		).toBe("none")
	})
	it.each([
		":LOGGING: nil logdone",
		":LOGGING: nil\n:LOGGING+: logdone",
		":LOGGING: logdone\n:logging: nologdone",
		":LOGGING: unsupported",
		":LOGGING: todo(!)",
		":LOGGING: UNKNOWN(!)",
		":LOG_INTO_DRAWER: END",
		":LOG_INTO_DRAWER: PROPERTIES",
		":LOG_INTO_DRAWER: unsafe name",
		":LOG_INTO_DRAWER+: t",
		"not a property",
	])("fails closed for applicable invalid declaration %s before note submission", (value) => {
		const source = `#+TODO: TODO | DONE(@)\n* parent\n${props(value)}\n** TODO child`
		for (const note of [undefined, "literal"])
			expect(planOrgTodoTransition(source, source.indexOf("** TODO child"), stamp, note).kind).toBe(
				"rejected",
			)
	})
	it("ignores malformed unrelated siblings, COMMENT, blocks and inert drawers", () => {
		const source = `#+TODO: TODO | DONE\n* sibling\n${props("broken\n:LOGGING: nonsense")}\n* COMMENT parent\n${props(":LOGGING: nonsense")}\n** ignored\n#+PROPERTY: LOGGING nonsense\n* parent\n#+begin_src org\n#+PROPERTY: LOGGING nonsense\n${props(":LOGGING: nonsense")}\n** fake\n#+end_src\n:DATA:\n${props(":LOGGING: nonsense")}\n** TODO child`
		expect(policy(source).done).toBe("none")
	})
	it.each([
		"#+begin_src org",
		":PROPERTIES:",
	])("inert COMMENT syntax does not override live heading eligibility: %s", (inert) => {
		const source = `#+TODO: TODO | DONE(@)\n* COMMENT ignored\n${inert}\n* TODO target\n${props(":LOGGING: nil")}`
		expect(policy(source).done).toBe("none")
		expect(apply(source).result).toBe(source.replace("* TODO target", "* DONE target"))
	})
	it("rejects an unclosed applicable drawer instead of resolving a swallowed fake heading", () => {
		const source = "* parent\n:PROPERTIES:\n:LOGGING: logdone\n** TODO child"
		expect(planOrgTodoTransition(source, source.indexOf("** TODO"), stamp)).toEqual({
			kind: "rejected",
			reason: "malformed-drawer",
		})
		expect(resolve(source).kind).toBe("rejected")
	})
	it("explicit drawer at each tier beats same-tier LOGGING toggle regardless of order", () => {
		for (const value of [
			":LOG_INTO_DRAWER: child\n:LOGGING: logdrawer",
			":LOGGING: logdrawer\n:LOG_INTO_DRAWER: child",
		]) {
			const source = `#+LOG_INTO_DRAWER: FILE\n#+STARTUP: nologdrawer\n#+PROPERTY: LOG_INTO_DRAWER parent\n* parent\n${props(":LOG_INTO_DRAWER: ancestor")}\n** TODO child\n${props(value)}`
			expect(policy(source).drawer).toBe("child")
		}
		expect(
			policy(
				`* parent\n${props(":LOG_INTO_DRAWER: ancestor")}\n** TODO child\n${props(":LOGGING: logdrawer")}`,
			).drawer,
		).toBe("LOGBOOK")
		expect(
			policy(
				`* parent\n${props(":LOGGING: logdrawer")}\n** TODO child\n${props(":LOG_INTO_DRAWER: nil")}`,
			).drawer,
		).toBeNull()
	})
	it("inherited custom drawer is inserted in child, never appended to parent", () => {
		const prefix = `* parent\n${props(":LOGGING: lognotedone\n:LOG_INTO_DRAWER: AUDIT")}\n:AUDIT:\nparent bytes\n:END:\n`
		const source = `${prefix}** TODO child\n${props(":OTHER: Ω\u0000")}\nbody`
		const { result } = apply(source, "multiline\n:END:\u0000")
		expect(result.startsWith(prefix)).toBe(true)
		expect(result).toContain(
			`** DONE child\nCLOSED: ${stamp}\n${props(":OTHER: Ω\u0000")}\n:AUDIT:\n- State`,
		)
		expect(result).toContain('  : "multiline\\n"\n  : ":END:\\u0000"\n:END:\nbody')
	})
	it.each([
		"\n",
		"\r\n",
		"\r",
		"mixed",
	])("roundtrips exact source coordinates and undo with %j and EOF", (mode) => {
		const lines = [
			"#+PROPERTY: LOGGING lognotedone",
			"#+PROPERTY: LOG_INTO_DRAWER t",
			"* parent",
			":PROPERTIES:",
			":OTHER: Ω\u0000",
			":END:",
			"** TODO child",
			":PROPERTIES:",
			":OTHER: 😀",
			":END:",
			"body\u0000",
		]
		const source = lines
			.map(
				(line, index) =>
					line +
					(index === lines.length - 1
						? ""
						: mode === "mixed"
							? ["\r\n", "\r", "\n"][index % 3]
							: mode),
			)
			.join("")
		const { result, plan } = apply(source, "a\r\nb\r\u0000Ω\n")
		let delta = 0
		const inverse = plan.edits.map((edit) => {
			const from = edit.from + delta
			delta += edit.insert.length - (edit.to - edit.from)
			return { from, insert: source.slice(edit.from, edit.to), to: from + edit.insert.length }
		})
		let restored = result
		for (const edit of inverse.reverse())
			restored = restored.slice(0, edit.from) + edit.insert + restored.slice(edit.to)
		expect(restored).toBe(source)
	})
	it("returns immutable-shaped narrow range provenance, not full source or authority", () => {
		const source = `#+PROPERTY: LOGGING logdone\n* parent\n${props(":LOGGING: nologdone")}\n** TODO child`
		const result = resolve(source)
		if (result.kind !== "policy") throw new Error(result.reason)
		expect(result.provenance.map((item) => source.slice(item.from, item.to))).toEqual([
			"#+PROPERTY: LOGGING logdone\n",
			":LOGGING: nologdone\n",
		])
		expect(result.provenance.map((item) => item.tier)).toEqual([
			"file-properties",
			"heading-properties",
		])
		const snapshot = snapshotOrgLoggingScopes(
			source,
			source.indexOf("** TODO child"),
			new Set(["TODO", "DONE"]),
		)
		expect(JSON.stringify(snapshot)).not.toContain("* parent")
		expect(resolve(source)).toEqual(result)
	})
})
