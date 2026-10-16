import * as E from "fp-ts/Either"
import { z } from "zod"
import { parseApplicationPopupConfiguration, EMPTY_APPLICATION_POPUP_CONFIGURATION } from "@/flows/application/application-popup-configuration"
import { parseOrgAgendaConfiguration, DEFAULT_ORG_AGENDA_CONFIGURATION } from "@/pipes/org/org-agenda-configuration.pipe"
import { parseOrgBehaviorConfiguration, DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import { parseOrgCaptureConfiguration } from "@/pipes/org/org-capture-configuration.pipe"
import { DEFAULT_ORG_CAPTURE_CONFIGURATION } from "@/pipes/org/org-capture-template.pipe"
import { parseOrgKeymapConfiguration } from "@/pipes/org/org-keymap-configuration.pipe"
import { DEFAULT_FONT_STATE, FONT_CONSTRAINTS } from "@/types/font"
import { iconThemes } from "@/types/icon-theme/icon-theme.config"
import { getThemeByName } from "@/utils/themes.util"

const fontFamily = z.string().trim().min(1).refine(value => !/[;{}\u0000-\u001f\u007f]/u.test(value),
	"Use a CSS font-family list, without declarations or control characters.")
const sourceFont = z.strictObject({
	family: fontFamily.default(DEFAULT_FONT_STATE.fontFamily),
	size: z.number().min(FONT_CONSTRAINTS.fontSize.min).max(FONT_CONSTRAINTS.fontSize.max).default(DEFAULT_FONT_STATE.fontSize),
	lineHeight: z.number().min(FONT_CONSTRAINTS.lineHeight.min).max(FONT_CONSTRAINTS.lineHeight.max).default(DEFAULT_FONT_STATE.lineHeight),
	letterSpacing: z.number().min(FONT_CONSTRAINTS.letterSpacing.min).max(FONT_CONSTRAINTS.letterSpacing.max).default(DEFAULT_FONT_STATE.letterSpacing),
	paragraphSpacing: z.number().min(FONT_CONSTRAINTS.paragraphSpacing.min).max(FONT_CONSTRAINTS.paragraphSpacing.max).default(DEFAULT_FONT_STATE.paragraphSpacing),
	firstLineIndent: z.number().min(FONT_CONSTRAINTS.firstLineIndent.min).max(FONT_CONSTRAINTS.firstLineIndent.max).default(DEFAULT_FONT_STATE.firstLineIndent),
})
const interfaceFont = z.strictObject({
	family: fontFamily.default(DEFAULT_FONT_STATE.uiFontFamily),
	size: z.number().min(FONT_CONSTRAINTS.uiFontSize.min).max(FONT_CONSTRAINTS.uiFontSize.max).default(DEFAULT_FONT_STATE.uiFontSize),
	scale: z.enum(["compact", "default", "comfortable", "large"]).default("default"),
})
const appearance = z.strictObject({
	mode: z.enum(["theme", "system"]).default("theme"),
	theme: z.string().min(1).default("GitHub Dark"),
	lightTheme: z.string().min(1).default("GitHub"),
	darkTheme: z.string().min(1).default("GitHub Dark"),
	transitions: z.boolean().default(true),
	icons: z.string().refine(key => iconThemes.some(theme => theme.key === key), "Unknown icon theme key.").default("default"),
}).superRefine((value, context) => {
	for (const field of ["theme", "lightTheme", "darkTheme"] as const) {
		const theme = getThemeByName(value[field])
		if (!theme) context.addIssue({ code: "custom", path: [field], message: `Unknown terminal theme name: ${value[field]}. Names are case-sensitive.` })
		else if (field === "lightTheme" && theme.type !== "light" || field === "darkTheme" && theme.type !== "dark")
			context.addIssue({ code: "custom", path: [field], message: `Choose a ${field === "lightTheme" ? "light" : "dark"} palette for ${field}.` })
	}
})

/** Preserve the source grammar: compiled keymaps contain runtime metadata, never file data. */
const keymaps = z.record(z.string(), z.unknown()).superRefine((value, context) => {
	const parsed = parseOrgKeymapConfiguration(JSON.stringify(value))
	if (E.isLeft(parsed)) context.addIssue({ code: "custom", message: parsed.left.message })
})
const capture = z.unknown().transform((value, context) => {
	const parsed = parseOrgCaptureConfiguration(JSON.stringify(value))
	if (E.isRight(parsed)) return parsed.right
	context.addIssue({ code: "custom", message: parsed.left.message })
	return z.NEVER
})
const org = z.unknown().transform((value, context) => {
	const parsed = parseOrgBehaviorConfiguration(JSON.stringify(value))
	if (E.isRight(parsed)) return parsed.right
	context.addIssue({ code: "custom", message: parsed.left.message })
	return z.NEVER
})
const agenda = z.unknown().transform((value, context) => {
	const parsed = parseOrgAgendaConfiguration(JSON.stringify(value))
	if (E.isRight(parsed)) return parsed.right
	context.addIssue({ code: "custom", message: parsed.left.message })
	return z.NEVER
})
const tools = z.unknown().transform((value, context) => {
	const parsed = parseApplicationPopupConfiguration(JSON.stringify(value))
	if (E.isRight(parsed)) return parsed.right
	context.addIssue({ code: "custom", message: parsed.left.message })
	return z.NEVER
})

export const configurationDocumentSchema = z.strictObject({
	version: z.literal(1),
	$comment: z.string().optional(),
	appearance: appearance.prefault({}),
	font: z.strictObject({ source: sourceFont.prefault({}), interface: interfaceFont.prefault({}) }).prefault({}),
	saving: z.strictObject({ autoSave: z.boolean().default(false), autoSaveInterval: z.number().int().min(1).max(60).default(3) }).prefault({}),
	wordCount: z.strictObject({ mode: z.enum(["chinese", "english", "mixed"]).default("chinese"), badge: z.boolean().default(true) }).prefault({}),
	capture: capture.prefault(DEFAULT_ORG_CAPTURE_CONFIGURATION),
	keymaps: keymaps.prefault({ version: 1, bindings: [], leaders: [], transients: [], modalEngine: null }),
	org: org.prefault(DEFAULT_ORG_BEHAVIOR_CONFIGURATION),
	agenda: agenda.prefault(DEFAULT_ORG_AGENDA_CONFIGURATION),
	tools: tools.prefault(EMPTY_APPLICATION_POPUP_CONFIGURATION),
	diagrams: z.strictObject({
		serverUrl: z.string().trim().refine(value => {
			if (!value) return true
			try { return ["http:", "https:"].includes(new URL(value).protocol) } catch { return false }
		}, "Use an absolute HTTP(S) service URL, or an empty string to disable remote rendering.").default(""),
	}).prefault({}),
})
export type AppConfiguration = z.output<typeof configurationDocumentSchema>

/** Validate the entire file before publishing any preference or permission. */
export function parseConfigurationDocument(raw: string): AppConfiguration {
	let value: unknown
	try { value = JSON.parse(raw) } catch (error) {
		throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
	}
	const result = configurationDocumentSchema.safeParse(value)
	if (!result.success) throw new Error(result.error.issues.map(issue => `${issue.path.length ? issue.path.join(".") : "$"}: ${issue.message}`).join("\n"))
	return result.data
}

export const DEFAULT_CONFIGURATION_DOCUMENT = JSON.stringify({
	$comment: "Grain configuration. Edit this file with your editor, then run Reload configuration. Theme names are exact iTerm2-Color-Schemes names. Missing sections use built-in defaults; unknown fields are errors.",
	...configurationDocumentSchema.parse({ version: 1 }),
}, null, 2) + "\n"
