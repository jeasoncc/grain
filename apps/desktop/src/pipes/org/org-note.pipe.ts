import type { OrgFreshDocumentPlan } from "@/types/org/org-fresh-document.types"
import { orgLocalCalendar } from "./org-local-calendar.pipe"
import { scanOrgNodeSource } from "./org-node-source.pipe"
import { isOrgDefaultWordCharacter } from "./org-default-syntax.pipe"

export interface OrgRoamNotePlan extends OrgFreshDocumentPlan {
	readonly id: string
	readonly title: string
}

export type OrgNoteOutcome =
	| { readonly kind: "created"; readonly relativePath: string; readonly id: string; readonly title: string }
	| { readonly kind: "created-unopened"; readonly relativePath: string; readonly id: string; readonly title: string; readonly message: string }
	| { readonly kind: "no-workspace" | "busy" | "rejected" | "uncertain" | "stale"; readonly message: string }

const normalizeNoteTitle = (title: string): string => title.replace(/[\r\n]+/g, " ")
const noteSource = (dateText: string, dateTime: string, id: string, title: string): string =>
	`:PROPERTIES:\n:ID:       ${id}\n:END:\n#+TITLE: ${title}\n#+DATE: ${dateText}\n#+TIME: ${dateTime}\n#+FILETAGS: :note:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 内容\n\n`

/** `my/org-note-header`: normalize only the title, never an existing or edited body. */
export const orgNoteSource = (date: Date, id: string, title: string): string => {
	const { dateText, dateTime } = orgLocalCalendar(date)
	return noteSource(dateText, dateTime, id, normalizeNoteTitle(title))
}

// Installed org-roam-node.el:193-211 removes this exact set, not every Unicode mark.
const slugTrimMarks = /[\u0300-\u0304\u0306-\u030c\u031b\u0323-\u0325\u0327\u032d\u032e\u0330\u0331]/gu
// Emacs 31 alphanumericp includes marks and letter numbers, but excludes other numbers.
const nonAlphanumeric = /[^\p{L}\p{M}\p{Nl}\p{Nd}]/gu

/** Emacs downcase uses adjacent word syntax for final sigma, not JS cased-letter context. */
const downcaseSlug = (slug: string): string => {
	if (!slug.includes("Σ")) return slug.toLowerCase()
	let result = ""
	let offset = 0
	let previousWord = false
	for (const character of slug) {
		offset += character.length
		if (character === "Σ") {
			const next = slug.codePointAt(offset)
			const nextWord = next !== undefined && isOrgDefaultWordCharacter(String.fromCodePoint(next))
			result += previousWord && !nextWord ? "ς" : "σ"
		} else {
			result += character.toLowerCase()
		}
		previousWord = isOrgDefaultWordCharacter(character)
	}
	return result
}

const orgRoamSlug = (title: string): string => downcaseSlug(
	title.normalize("NFD")
		.replace(slugTrimMarks, "")
		.normalize("NFC")
		.replace(nonAlphanumeric, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, ""),
)

/** Capture the chronological note's complete template and identity from one local instant. */
export const planOrgRoamNote = (date: Date, id: string, title: string): OrgRoamNotePlan => {
	const { directory, dateText, dateTime, epochSeconds } = orgLocalCalendar(date)
	const normalizedTitle = normalizeNoteTitle(title)
	return {
		directory,
		filenameStem: `note-${epochSeconds}-${orgRoamSlug(title)}`,
		content: noteSource(dateText, dateTime, id, normalizedTitle),
		id,
		title: normalizedTitle,
	}
}

export type OrgRoamNoteCaptureValidation =
	| { readonly kind: "ready"; readonly title: string }
	| { readonly kind: "rejected"; readonly message: string }

/** A capture may edit its full raw source, but cannot silently change the node it will link. */
export const validateOrgRoamNoteCapture = (
	plan: Pick<OrgRoamNotePlan, "content" | "id">,
): OrgRoamNoteCaptureValidation => {
	const rows = scanOrgNodeSource(plan.content)
	const ids = rows.filter((row) => row.property?.name === "ID")
	const fileIds = ids.filter((row) => row.heading === null)
	if (!plan.id.trim() || fileIds.length !== 1 ||
		fileIds[0].property?.value !== plan.id ||
		ids.filter((row) => row.property?.value === plan.id).length !== 1) {
		return {
			kind: "rejected",
			message: "The capture must retain its unique file-level ID. Restore the original ID before finishing; nothing was written.",
		}
	}
	let title = ""
	for (const row of rows) {
		if (!row.visible || row.heading !== null) continue
		const match = row.text.match(/^\s*#\+TITLE:\s*(.*?)\s*$/i)
		if (match) title = match[1]
	}
	if (!title) {
		return {
			kind: "rejected",
			message: "The capture must contain a nonempty file title. Restore or edit its TITLE keyword before finishing; nothing was written.",
		}
	}
	return { kind: "ready", title }
}
