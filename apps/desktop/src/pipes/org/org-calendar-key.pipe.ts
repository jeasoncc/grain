import { shiftOrgCalendarDate } from "./org-date-reader.pipe"

export interface OrgCalendarKeyInput {
	readonly key: string
	readonly ctrlKey: boolean
	readonly metaKey: boolean
	readonly altKey: boolean
	readonly shiftKey: boolean
	readonly repeat: boolean
	readonly defaultPrevented: boolean
	readonly isComposing: boolean
	readonly keyCode: number
	readonly altGraphKey?: boolean
}
export type OrgCalendarKeyAction =
	| { readonly kind: "unhandled" | "consumed" | "accept" | "cancel" }
	| { readonly kind: "select"; readonly date: string }
	| { readonly kind: "month"; readonly month: string }

/** https://orgmode.org/manual/The-date_002ftime-prompt.html; no DOM, clock or source authority. */
export const resolveOrgCalendarKey = (input: OrgCalendarKeyInput, context: {
	readonly selected: string
	readonly month: string
	readonly today: string
	readonly gridDate?: string
}): OrgCalendarKeyAction => {
	const unhandled: OrgCalendarKeyAction = { kind: "unhandled" }
	const consumed: OrgCalendarKeyAction = { kind: "consumed" }
	if (input.defaultPrevented || input.isComposing || input.keyCode === 229 || input.altGraphKey || ["Dead", "Process", "AltGraph"].includes(input.key)) return unhandled
	const key = input.key.toLowerCase()
	if (key === "escape" || input.ctrlKey && !input.altKey && !input.metaKey && key === "g") return input.repeat ? consumed : { kind: "cancel" }
	if (key === "enter") return input.repeat ? consumed : { kind: "accept" }
	if (input.ctrlKey && !input.altKey && !input.metaKey && key === ".") return { kind: "select", date: context.today }
	let months = 0
	if (!input.ctrlKey && !input.metaKey && !input.altKey && (key === ">" || key === "<")) months = key === ">" ? 1 : -1
	if (key === "v" && !input.shiftKey && !input.metaKey && input.altKey !== input.ctrlKey) months = input.altKey ? 3 : -3
	if (months) {
		const next = shiftOrgCalendarDate(`${context.month}-01`, months, "m")
		return next ? { kind: "month", month: next.slice(0, 7) } : consumed
	}
	const days = { arrowright: 1, arrowleft: -1, arrowdown: 7, arrowup: -7 }[key as "arrowright" | "arrowleft" | "arrowdown" | "arrowup"]
	if (!days || input.ctrlKey || input.metaKey || !(input.shiftKey || context.gridDate)) return unhandled
	if (input.altKey && Math.abs(days) !== 1) return unhandled
	const date = shiftOrgCalendarDate(context.gridDate ?? context.selected, input.altKey ? Math.sign(days) : days, input.altKey ? "m" : "d")
	return date ? { kind: "select", date } : consumed
}
