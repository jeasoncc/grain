import { headingPositionAt, parseOrgTodoKeywords } from "@/pipes/org/org-text.pipe"
import { planOrgTodoTransition, type OrgTodoRepeatOptions } from "@/pipes/org/org-todo-logging.pipe"
import { guardOrgCommandOrigin, guardOrgHeadingCommand, type OrgBufferCommand } from "./org-buffer-command"

/** Direct-state and final completion are consumers of the sole atomic TODO planner. */
export const createOrgTodoStateCommand = (
	options: OrgTodoRepeatOptions = {},
	finalCompletion = false,
): OrgBufferCommand => ({
	id: finalCompletion ? "org.heading.complete-repeating" : "org.heading.todo-state",
	prompt: finalCompletion ? "Complete recurring task:" : "TODO state (empty removes state):",
	completion: "token",
	updatedMessage: "TODO state updated",
	unchangedMessage: "TODO state unchanged",
	prepare: (context) => {
		const guard = guardOrgHeadingCommand(context)
		if (guard) return guard
		const keywords = parseOrgTodoKeywords(context.content)
		return { kind: "ready", context: { ...context }, initialInput: finalCompletion ? keywords.done[0] ?? "" : "",
			candidates: finalCompletion ? keywords.done : [...keywords.todo, ...keywords.done] }
	},
	execute: (origin, current, input, context) => {
		const guard = guardOrgCommandOrigin(origin, current) ?? guardOrgHeadingCommand(origin)
		if (guard) return guard
		const headingFrom = headingPositionAt(origin.content, origin.cursor)!.from
		const plan = planOrgTodoTransition(origin.content, headingFrom, context?.logStamp, context?.note,
			{ ...options, state: input.trim(), finalCompletion })
		if (plan.kind === "needs-note") return { ...plan, request: Object.freeze({ ...plan.request, input,
			...(context ? { context: Object.freeze({ ...context }) } : {}) }) }
		if (plan.kind === "rejected") return { ...plan, message: `Cannot change TODO state: ${plan.reason}.` }
		if (plan.kind === "noop") return { kind: "no-change", reason: "unchanged-state" }
		return { kind: "batch", batch: { changes: plan.edits, cursor: plan.edits[0]?.cursor ?? headingFrom } }
	},
})
