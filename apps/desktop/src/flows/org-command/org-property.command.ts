import { orgPropertyDrawerAt, setOrgPropertyAt } from "@/pipes/org/org-text.pipe"
import {
	guardOrgCommandOrigin,
	guardOrgHeadingCommand,
	type OrgBufferCommand,
} from "./org-buffer-command"

/** One-line property setting only; empty VALUE sets an empty value, not deletion. */
export const orgPropertyBufferCommand: OrgBufferCommand = {
	id: "org.heading.property",
	prompt: "Property (KEY=VALUE):",
	completion: "value",
	updatedMessage: "Property updated",
	unchangedMessage: "Property unchanged",
	prepare: (context) => {
		const guard = guardOrgHeadingCommand(context)
		if (guard) return guard
		const drawer = orgPropertyDrawerAt(context.content, context.cursor)
		if (drawer?.kind === "invalid")
			return { kind: "rejected", reason: "invalid-drawer", message: drawer.message }
		const candidates =
			drawer?.kind === "drawer"
				? drawer.properties
						.filter((field) => /^[A-Za-z0-9_@#%-]+$/.test(field.key))
						.map((field) => `${field.key}=${field.value}`)
				: []
		return {
			kind: "ready",
			context: { ...context },
			initialInput: candidates.find((candidate) => /^ID=/i.test(candidate)) ?? "ID=",
			candidates,
		}
	},
	execute: (origin, current, input) => {
		const guard = guardOrgCommandOrigin(origin, current) ?? guardOrgHeadingCommand(origin)
		if (guard) return guard
		const drawer = orgPropertyDrawerAt(origin.content, origin.cursor)
		if (drawer?.kind === "invalid")
			return { kind: "rejected", reason: "invalid-drawer", message: drawer.message }
		const separator = input.indexOf("=")
		const key = input.slice(0, separator).trim()
		if (separator <= 0 || !/^[A-Za-z0-9_@#%-]+$/.test(key) || /[\r\n]/.test(input))
			return {
				kind: "rejected",
				reason: "invalid-property",
				message:
					"Enter KEY=VALUE on one line. The key may contain letters, digits, _, @, #, %, or -.",
			}
		if (/^(?:END|PROPERTIES)$/i.test(key))
			return {
				kind: "rejected",
				reason: "invalid-property",
				message: "END and PROPERTIES are reserved drawer markers, not property keys.",
			}
		const value = input.slice(separator + 1)
		const existing =
			drawer?.kind === "drawer"
				? drawer.properties.find((field) => field.key.toUpperCase() === key.toUpperCase())
				: null
		if (existing?.value === value) return { kind: "no-change", reason: "unchanged-property" }
		const edit = setOrgPropertyAt(origin.content, origin.cursor, key, value)
		return edit
			? { kind: "edit", edit }
			: {
					kind: "rejected",
					reason: "invalid-drawer",
					message: "The property drawer could not be safely edited. Repair it and retry.",
				}
	},
}
