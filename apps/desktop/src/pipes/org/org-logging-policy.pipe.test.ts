import { describe, expect, it } from "vitest"
import { resolveOrgLoggingPolicy } from "./org-logging-policy.pipe"
import { snapshotOrgLoggingScopes } from "./org-logging-scope.pipe"
import { planOrgTodoTransition, planOrgOperationLogging, type OrgLoggingOperation } from "./org-todo-logging.pipe"

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
	it("nil disables inherited state logging; child replaces done policy independently of drawer", () => {
		const file = "#+TODO: TODO(!/@) NEXT(@/!) | DONE(@)\n#+STARTUP: lognotedone logdrawer\n"
		const source = `${file}* parent\n${props(":LOGGING: nil")}\n** TODO child\n${props(":LOGGING: logdone")}`
		expect(policy(source)).toMatchObject({
			done: "time",
			drawer: "LOGBOOK",
			states: ["TODO", "NEXT", "DONE"].map((state) => ({ incoming: "", outgoing: "", state })),
		})
		const local = `${file}* TODO target\n${props(":LOGGING: nil")}`
		expect(apply(local).result).toBe(local.replace("* TODO", "* NEXT"))
		expect(planOrgTodoTransition(local, local.indexOf("* TODO"), stamp, "old note")).toEqual({
			kind: "rejected",
			reason: "unexpected-note",
		})
	})
	it("every nonempty LOGGING property replaces state/done/repeat preferences", () => {
		const source = `#+TODO: TODO(@/!) NEXT(!) | DONE(@)\n#+SEQ_TODO: WAIT(!/@) | FINISH(!)\n#+STARTUP: logdone\n* parent\n${props(":LOGGING: lognotedone")}\n** TODO child\n${props(":logging: nologdone TODO()")}`
		expect(policy(source)).toMatchObject({
			done: "none",
			repeat: "none",
			drawer: null,
			states: [
				{ incoming: "", outgoing: "", state: "TODO" },
				{ incoming: "", outgoing: "", state: "NEXT" },
				{ incoming: "", outgoing: "", state: "WAIT" },
				{ incoming: "", outgoing: "", state: "DONE" },
				{ incoming: "", outgoing: "", state: "FINISH" },
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
	it.each(["nil logdone", "nil unknown logdone", "nil\n:LOGGING+: logdone"])("ignores GNU nil/unknown local tokens without rejecting %s", (value) => {
		expect(policy(`* TODO target\n${props(`:LOGGING: ${value}`)}`).done).toBe("time")
	})
	it.each(["unknown", "todo(!)", "UNKNOWN(!)"])("clears only TODO logging for ignored word %s", (value) => {
		expect(policy(`#+STARTUP: logdone logreschedule\n* TODO target\n${props(`:LOGGING: ${value}`)}`)).toMatchObject({ done: "none", repeat: "none", reschedule: "time" })
	})
	it.each([
		":LOGGING: logdone\n:logging: nologdone",
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
		).toBe("ancestor")
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
			`** DONE child\nCLOSED: ${stamp}\n${props(":OTHER: Ω\u0000")}\n:AUDIT:\n- CLOSING NOTE`,
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

describe("standard repeat and operation logging controls", () => {
	it("uses Org defaults without adding user-specific logging switches", () => {
		expect(policy("* TODO target")).toMatchObject({
			done: "none", repeat: "time", reschedule: "none", redeadline: "none", refile: "none",
			drawer: null, reversed: true, repeatToState: null,
		})
	})
	it.each(["repeat", "reschedule", "redeadline", "refile"] as const)("resolves ordered global STARTUP %s controls", (key) => {
		expect(policy(`#+STARTUP: log${key} lognote${key}\n* TODO target`)[key]).toBe("note")
		expect(policy(`#+STARTUP: lognote${key} nolog${key}\n* TODO target`)[key]).toBe("none")
	})
	it.each(["reschedule", "redeadline", "refile"] as const)("keeps %s outside the local TODO policy", (key) => {
		expect(policy(`#+STARTUP: log${key}\n* parent\n${props(`:LOGGING: lognote${key}`)}\n** TODO child\n${props(":LOGGING: nil")}`)[key]).toBe("time")
	})
	it("nonempty LOGGING replaces TODO flags but preserves operation preferences and inherited drawer", () => {
		const source = `#+TODO: TODO(@) | DONE(@)\n#+STARTUP: logrepeat logreschedule lognoteredeadline logrefile\n* parent\n${props(":LOGGING: logrepeat\n:LOG_INTO_DRAWER: AUDIT")}\n** TODO child\n${props(":LOGGING: lognoterefile")}`
		expect(policy(source)).toMatchObject({
			done: "none", repeat: "none", reschedule: "time", redeadline: "note", refile: "time", drawer: "AUDIT",
			states: [{ state: "TODO", incoming: "", outgoing: "" }, { state: "DONE", incoming: "", outgoing: "" }],
		})
	})
	it.each([
		{ kind: "reschedule", previous: "<2025-03-01 Sat>", next: "<2025-04-02 Wed>", title: 'Rescheduled from "[2025-03-01 Sat]"' },
		{ kind: "reschedule", previous: "<2025-03-01 Sat>", next: null, title: 'Not scheduled, was "[2025-03-01 Sat]"' },
		{ kind: "redeadline", previous: "<2025-03-01 Sat>", next: "<2025-04-02 Wed>", title: 'New deadline from "[2025-03-01 Sat]"' },
		{ kind: "redeadline", previous: "<2025-03-01 Sat>", next: null, title: 'Removed deadline, was "[2025-03-01 Sat]"' },
	] as const)("plans real $kind log ranges for change and removal", ({ title, ...operation }) => {
		const field = operation.kind === "reschedule" ? "SCHEDULED" : "DEADLINE"
		const source = `#+STARTUP: log${operation.kind} logdrawer\n* TODO target\n${field}: ${operation.previous}\nbody\n** Child\nunchanged`
		const cursor = source.indexOf("* TODO")
		const plan = planOrgOperationLogging(source, cursor, stamp, operation)
		if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
		expect(plan.edits).toHaveLength(1)
		const edit = plan.edits[0]
		const result = source.slice(0, edit.from) + edit.insert + source.slice(edit.to)
		expect(result).toContain(`:LOGBOOK:\n- ${title} on ${stamp}\n:END:\nbody\n** Child\nunchanged`)
		expect(result).toContain(`${field}: ${operation.previous}`)
		expect(source.slice(0, edit.from) + result.slice(edit.from + edit.insert.length)).toBe(source)
	})
	it("first planning insertion/nochange and disabled logging do not require an inferred clock", () => {
		const source = "* TODO target\nbody"
		expect(planOrgOperationLogging(source, 0, undefined, { kind: "reschedule", previous: null, next: "<2025-04-02 Wed>" })).toEqual({ kind: "noop" })
		expect(planOrgOperationLogging(source, 0, undefined, { kind: "refile" })).toEqual({ kind: "noop" })
		const configured = "#+STARTUP: logreschedule\n* TODO target\nSCHEDULED: <2025-03-01 Sat>"
		expect(planOrgOperationLogging(configured, configured.indexOf("* TODO"), undefined, { kind: "reschedule", previous: "<2025-03-01 Sat>", next: "<2025-03-01 Sat>" })).toEqual({ kind: "noop" })
		expect(planOrgOperationLogging(configured, configured.indexOf("* TODO"), undefined, { kind: "reschedule", previous: "<2025-03-01 Sat>", next: "<2025-04-02 Wed>" })).toMatchObject({ kind: "rejected", reason: "invalid-timestamp" })
	})
	it.each(["reschedule", "redeadline", "refile"] as const)("returns immutable continuation data and preserves literal notes for %s", (kind) => {
		const operation: Exclude<OrgLoggingOperation, { kind: "todo" }> = kind === "refile" ? { kind } : { kind, previous: "<2025-03-01 Sat>", next: "<2025-04-02 Wed>" }
		const source = `#+STARTUP: lognote${kind}\n* TODO target\n${kind === "reschedule" ? "SCHEDULED" : "DEADLINE"}: <2025-03-01 Sat>\nbody`
		const cursor = source.indexOf("* TODO")
		expect(planOrgOperationLogging(source, cursor, stamp, operation)).toEqual({ kind: "needs-note", request: { operation, cursor, stamp } })
		const note = "* literal Ω\u0000\r\n:END:\n  "
		const plan = planOrgOperationLogging(source, cursor, stamp, operation, note)
		if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
		const chunks = plan.edits[0].insert.split(/\r\n|\r|\n/).filter((line) => line.startsWith("  : "))
		expect(chunks.map((line) => JSON.parse(line.slice(4))).join("")).toBe(note)
		expect(planOrgOperationLogging(source, cursor, stamp, operation, note)).toEqual(plan)
	})
	it("logs newest-first by default and supports Org's explicit chronological order", () => {
		for (const chronological of [false, true]) {
			const source = `#+STARTUP: logrefile logdrawer${chronological ? " nologstatesreversed" : ""}\n* TODO target\n:LOGBOOK:\n- Refiled on [2025-03-01 Sat 08:00]\n:END:\nbody`
			const plan = planOrgOperationLogging(source, source.indexOf("* TODO"), stamp, { kind: "refile" })
			if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
			const edit = plan.edits[0]
			const result = source.slice(0, edit.from) + edit.insert + source.slice(edit.to)
			expect(result).toContain(chronological ? `- Refiled on [2025-03-01 Sat 08:00]\n- Refiled on ${stamp}` : `- Refiled on ${stamp}\n- Refiled on [2025-03-01 Sat 08:00]`)
		}
	})
	it("rejects stale operation anchors and applicable malformed drawers before note preparation", () => {
		const source = "#+STARTUP: lognotereschedule\n* TODO target\nSCHEDULED: <2025-03-01 Sat>"
		expect(planOrgOperationLogging(source, source.indexOf("* TODO"), stamp, { kind: "reschedule", previous: "<2025-03-02 Sun>", next: null })).toMatchObject({ kind: "rejected", reason: "stale-planning-log" })
		const malformed = "#+STARTUP: lognoterefile\n* TODO target\n:LOGBOOK:\nunclosed"
		expect(planOrgOperationLogging(malformed, malformed.indexOf("* TODO"), stamp, { kind: "refile" })).toMatchObject({ kind: "rejected" })
	})
})
